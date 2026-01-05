from django.db import transaction
from django.utils import timezone
from datetime import date
from decimal import Decimal

from apps.core.models import Household, HouseholdMember
from apps.accounts.models import Account, BalanceSnapshot, LiabilityDetails
from apps.flows.models import RecurringFlow, FlowType, ExpenseCategory, Frequency
from apps.taxes.models import IncomeSource, W2Withholding, PreTaxDeduction
from .models import OnboardingProgress, OnboardingStepData, OnboardingStep


class OnboardingService:
    def __init__(self, household: Household):
        self.household = household
        self.progress, _ = OnboardingProgress.objects.get_or_create(household=household)

    def get_current_step(self) -> dict:
        # Auto-skip steps that don't apply when loading
        current = self._auto_skip_inapplicable_steps(self.progress.current_step)
        if current != self.progress.current_step:
            self.progress.current_step = current
            self.progress.save()

        step_data, _ = OnboardingStepData.objects.get_or_create(
            progress=self.progress, step=self.progress.current_step
        )
        return {
            'step': self.progress.current_step,
            'stepLabel': OnboardingStep(self.progress.current_step).label,
            'progressPercentage': self.progress.progress_percentage,
            'canSkip': self.progress.can_skip(),
            'canGoBack': self.progress.get_previous_step() is not None,
            'draftData': step_data.data,
            'isValid': step_data.is_valid,
            'validationErrors': step_data.validation_errors,
        }

    def save_draft(self, data: dict) -> dict:
        """Auto-save draft data without completing step."""
        step_data, _ = OnboardingStepData.objects.get_or_create(
            progress=self.progress, step=self.progress.current_step
        )
        step_data.data = data
        is_valid, errors = self._validate(self.progress.current_step, data)
        step_data.is_valid = is_valid
        step_data.validation_errors = errors
        step_data.save()
        return {'saved': True, 'isValid': is_valid, 'errors': errors}

    def complete_step(self, data: dict) -> dict:
        """Validate, save data, create records, advance to next step."""
        is_valid, errors = self._validate(self.progress.current_step, data)
        if not is_valid:
            return {'success': False, 'errors': errors}

        try:
            with transaction.atomic():
                self._process_step(self.progress.current_step, data)
                next_step = self.progress.advance()
                # Auto-skip steps that don't apply
                next_step = self._auto_skip_inapplicable_steps(next_step)
        except Exception as e:
            return {'success': False, 'errors': {'_general': str(e)}}

        return {'success': True, 'nextStep': next_step}

    def _auto_skip_inapplicable_steps(self, current_step: str) -> str:
        """Auto-skip steps that don't apply based on household data."""
        while current_step:
            should_skip = False

            # Skip income_details if no income sources exist
            if current_step == OnboardingStep.INCOME_DETAILS:
                has_income_sources = IncomeSource.objects.filter(
                    household=self.household
                ).exists()
                if not has_income_sources:
                    should_skip = True

            # Skip withholding step if no W-2 income sources exist
            elif current_step == OnboardingStep.WITHHOLDING:
                has_w2_income = IncomeSource.objects.filter(
                    household=self.household,
                    income_type__in=['w2', 'w2_hourly']
                ).exists()
                if not has_w2_income:
                    should_skip = True

            # Skip pretax_deductions if no income sources exist
            elif current_step == OnboardingStep.PRETAX_DEDUCTIONS:
                has_income_sources = IncomeSource.objects.filter(
                    household=self.household
                ).exists()
                if not has_income_sources:
                    should_skip = True

            if should_skip:
                # Avoid duplicate entries in skipped_steps
                if current_step not in self.progress.skipped_steps:
                    self.progress.skipped_steps.append(current_step)
                current_step = self.progress.advance(mark_complete=False)
            else:
                break

        return current_step

    def skip_step(self) -> dict:
        if not self.progress.can_skip():
            return {'success': False, 'error': 'Cannot skip this step'}
        # Avoid duplicate entries in skipped_steps
        if self.progress.current_step not in self.progress.skipped_steps:
            self.progress.skipped_steps.append(self.progress.current_step)
        next_step = self.progress.advance(mark_complete=False)
        return {'success': True, 'nextStep': next_step}

    def go_back(self) -> dict:
        prev = self.progress.get_previous_step()
        if not prev:
            return {'success': False, 'error': 'At first step'}
        self.progress.current_step = prev
        self.progress.save()
        return {'success': True, 'currentStep': prev}

    def _validate(self, step: str, data: dict) -> tuple[bool, dict]:
        errors = {}
        if step == OnboardingStep.HOUSEHOLD_INFO:
            if not data.get('name'):
                errors['name'] = 'Required'
        elif step == OnboardingStep.MEMBERS:
            if not data.get('members'):
                errors['members'] = 'At least one member required'
            else:
                for i, m in enumerate(data.get('members', [])):
                    if not m.get('name'):
                        errors[f'members.{i}.name'] = 'Required'
        elif step == OnboardingStep.TAX_FILING:
            if not data.get('filing_status'):
                errors['filing_status'] = 'Required'
            if not data.get('state'):
                errors['state'] = 'Required'
        elif step == OnboardingStep.INCOME_SOURCES:
            for i, src in enumerate(data.get('sources', [])):
                if not src.get('member_id'):
                    errors[f'sources.{i}.member_id'] = 'Household member is required'
                if not src.get('name'):
                    errors[f'sources.{i}.name'] = 'Required'
        elif step == OnboardingStep.INCOME_DETAILS:
            for i, src in enumerate(data.get('sources', [])):
                if src.get('income_type') == 'w2' and not src.get('salary'):
                    errors[f'sources.{i}.salary'] = 'Salary required for W-2 income'
                if src.get('income_type') == 'w2_hourly' and not src.get('hourly_rate'):
                    errors[f'sources.{i}.hourly_rate'] = 'Hourly rate required for hourly W-2 income'
        elif step == OnboardingStep.WITHHOLDING:
            # Optional step - no required fields
            pass
        elif step == OnboardingStep.PRETAX_DEDUCTIONS:
            for i, ded in enumerate(data.get('deductions', [])):
                if not ded.get('type'):
                    errors[f'deductions.{i}.type'] = 'Required'
                if ded.get('amount') is None:
                    errors[f'deductions.{i}.amount'] = 'Required'
        elif step == OnboardingStep.BANK_ACCOUNTS:
            for i, acct in enumerate(data.get('accounts', [])):
                if not acct.get('name'):
                    errors[f'accounts.{i}.name'] = 'Required'
                if acct.get('balance') is None:
                    errors[f'accounts.{i}.balance'] = 'Required'
        elif step == OnboardingStep.INVESTMENTS:
            for i, acct in enumerate(data.get('accounts', [])):
                if not acct.get('name'):
                    errors[f'accounts.{i}.name'] = 'Required'
                if acct.get('balance') is None:
                    errors[f'accounts.{i}.balance'] = 'Required'
        elif step == OnboardingStep.RETIREMENT:
            for i, acct in enumerate(data.get('accounts', [])):
                if not acct.get('name'):
                    errors[f'accounts.{i}.name'] = 'Required'
                if acct.get('balance') is None:
                    errors[f'accounts.{i}.balance'] = 'Required'
        elif step == OnboardingStep.REAL_ESTATE:
            for i, prop in enumerate(data.get('properties', [])):
                if not prop.get('name'):
                    errors[f'properties.{i}.name'] = 'Required'
                if prop.get('value') is None:
                    errors[f'properties.{i}.value'] = 'Required'
        elif step == OnboardingStep.VEHICLES:
            for i, veh in enumerate(data.get('vehicles', [])):
                if not veh.get('name'):
                    errors[f'vehicles.{i}.name'] = 'Required'
                if veh.get('value') is None:
                    errors[f'vehicles.{i}.value'] = 'Required'
        elif step == OnboardingStep.MORTGAGES:
            for i, mort in enumerate(data.get('mortgages', [])):
                if not mort.get('name'):
                    errors[f'mortgages.{i}.name'] = 'Required'
                if mort.get('balance') is None:
                    errors[f'mortgages.{i}.balance'] = 'Required'
                if mort.get('rate') is None:
                    errors[f'mortgages.{i}.rate'] = 'Required'
        elif step == OnboardingStep.CREDIT_CARDS:
            for i, card in enumerate(data.get('cards', [])):
                if not card.get('name'):
                    errors[f'cards.{i}.name'] = 'Required'
                if card.get('balance') is None:
                    errors[f'cards.{i}.balance'] = 'Required'
        elif step == OnboardingStep.STUDENT_LOANS:
            for i, loan in enumerate(data.get('loans', [])):
                if not loan.get('name'):
                    errors[f'loans.{i}.name'] = 'Required'
                if loan.get('balance') is None:
                    errors[f'loans.{i}.balance'] = 'Required'
        elif step == OnboardingStep.OTHER_DEBTS:
            for i, debt in enumerate(data.get('debts', [])):
                if not debt.get('name'):
                    errors[f'debts.{i}.name'] = 'Required'
                if debt.get('balance') is None:
                    errors[f'debts.{i}.balance'] = 'Required'
        elif step == OnboardingStep.HOUSING_EXPENSES:
            # Optional - rent is only required if not owning
            pass
        elif step == OnboardingStep.UTILITIES:
            for i, util in enumerate(data.get('utilities', [])):
                if not util.get('name'):
                    errors[f'utilities.{i}.name'] = 'Required'
                if util.get('amount') is None:
                    errors[f'utilities.{i}.amount'] = 'Required'
        elif step == OnboardingStep.INSURANCE:
            for i, ins in enumerate(data.get('insurance', [])):
                if not ins.get('name'):
                    errors[f'insurance.{i}.name'] = 'Required'
                if ins.get('amount') is None:
                    errors[f'insurance.{i}.amount'] = 'Required'
        elif step == OnboardingStep.TRANSPORTATION:
            for i, trans in enumerate(data.get('expenses', [])):
                if not trans.get('name'):
                    errors[f'expenses.{i}.name'] = 'Required'
                if trans.get('amount') is None:
                    errors[f'expenses.{i}.amount'] = 'Required'
        elif step == OnboardingStep.FOOD:
            # Optional - no required fields
            pass
        elif step == OnboardingStep.OTHER_EXPENSES:
            for i, exp in enumerate(data.get('expenses', [])):
                if not exp.get('name'):
                    errors[f'expenses.{i}.name'] = 'Required'
                if exp.get('amount') is None:
                    errors[f'expenses.{i}.amount'] = 'Required'
        # WELCOME, REVIEW, COMPLETE don't require validation
        return (len(errors) == 0, errors)

    def _process_step(self, step: str, data: dict):
        if step == OnboardingStep.HOUSEHOLD_INFO:
            self.household.name = data['name']
            self.household.save()

        elif step == OnboardingStep.MEMBERS:
            HouseholdMember.objects.filter(household=self.household).delete()
            for m in data.get('members', []):
                HouseholdMember.objects.create(
                    household=self.household,
                    name=m['name'],
                    relationship=m.get('relationship', 'self'),
                    is_primary=m.get('is_primary', False),
                    employment_status=m.get('employment_status', 'employed_w2'),
                )

        elif step == OnboardingStep.TAX_FILING:
            self.household.tax_filing_status = data['filing_status']
            self.household.state_of_residence = data['state']
            self.household.save()

        elif step == OnboardingStep.INCOME_SOURCES:
            for src in data.get('sources', []):
                member = HouseholdMember.objects.filter(
                    household=self.household, id=src.get('member_id')
                ).first()
                IncomeSource.objects.create(
                    household=self.household,
                    household_member=member,
                    name=src['name'],
                    income_type=src.get('income_type', 'w2'),
                    gross_annual_salary=src.get('salary'),
                    pay_frequency=src.get('frequency', 'biweekly'),
                )

        elif step == OnboardingStep.INCOME_DETAILS:
            # Update existing income sources with details
            for src in data.get('sources', []):
                if src.get('id'):
                    income_source = IncomeSource.objects.filter(
                        household=self.household, id=src['id']
                    ).first()
                    if income_source:
                        if src.get('salary'):
                            income_source.gross_annual_salary = Decimal(str(src['salary']))
                        if src.get('frequency'):
                            income_source.pay_frequency = src['frequency']
                        if src.get('hourly_rate'):
                            income_source.hourly_rate = Decimal(str(src['hourly_rate']))
                        if src.get('expected_annual_hours'):
                            income_source.expected_annual_hours = int(src['expected_annual_hours'])
                        income_source.save()

        elif step == OnboardingStep.WITHHOLDING:
            for wh in data.get('withholdings', []):
                if wh.get('income_source_id'):
                    income_source = IncomeSource.objects.filter(
                        household=self.household, id=wh['income_source_id']
                    ).first()
                    if income_source:
                        W2Withholding.objects.update_or_create(
                            income_source=income_source,
                            defaults={
                                'filing_status': wh.get('filing_status', 'single'),
                                'multiple_jobs_or_spouse_works': wh.get('multiple_jobs', False),
                                'child_tax_credit_dependents': wh.get('child_dependents', 0),
                                'other_dependents': wh.get('other_dependents', 0),
                                'extra_withholding': Decimal(str(wh.get('extra_withholding', 0))),
                            }
                        )

        elif step == OnboardingStep.PRETAX_DEDUCTIONS:
            for ded in data.get('deductions', []):
                if ded.get('income_source_id'):
                    income_source = IncomeSource.objects.filter(
                        household=self.household, id=ded['income_source_id']
                    ).first()
                    if income_source:
                        PreTaxDeduction.objects.create(
                            income_source=income_source,
                            deduction_type=ded['type'],
                            name=ded.get('name', ''),
                            amount_type=ded.get('amount_type', 'fixed'),
                            amount=Decimal(str(ded['amount'])),
                            employer_match_percentage=Decimal(str(ded.get('employer_match', 0))) / 100,
                        )

        elif step == OnboardingStep.BANK_ACCOUNTS:
            for acct in data.get('accounts', []):
                account = Account.objects.create(
                    household=self.household,
                    name=acct['name'],
                    account_type=acct.get('type', 'checking'),
                    institution=acct.get('institution', ''),
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(acct['balance'])),
                )

        elif step == OnboardingStep.INVESTMENTS:
            for acct in data.get('accounts', []):
                account = Account.objects.create(
                    household=self.household,
                    name=acct['name'],
                    account_type=acct.get('type', 'brokerage'),
                    institution=acct.get('institution', ''),
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(acct['balance'])),
                    market_value=Decimal(str(acct['balance'])),
                    cost_basis=Decimal(str(acct.get('cost_basis', acct['balance']))),
                )

        elif step == OnboardingStep.RETIREMENT:
            for acct in data.get('accounts', []):
                account = Account.objects.create(
                    household=self.household,
                    name=acct['name'],
                    account_type=acct.get('type', 'traditional_401k'),
                    institution=acct.get('institution', ''),
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(acct['balance'])),
                )

        elif step == OnboardingStep.REAL_ESTATE:
            for prop in data.get('properties', []):
                account = Account.objects.create(
                    household=self.household,
                    name=prop['name'],
                    account_type=prop.get('type', 'primary_residence'),
                    institution='',
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(prop['value'])),
                    market_value=Decimal(str(prop['value'])),
                )

        elif step == OnboardingStep.VEHICLES:
            for veh in data.get('vehicles', []):
                account = Account.objects.create(
                    household=self.household,
                    name=veh['name'],
                    account_type='vehicle',
                    institution='',
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(veh['value'])),
                    market_value=Decimal(str(veh['value'])),
                )

        elif step == OnboardingStep.MORTGAGES:
            for mort in data.get('mortgages', []):
                account = Account.objects.create(
                    household=self.household,
                    name=mort['name'],
                    account_type='primary_mortgage',
                    institution=mort.get('lender', ''),
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(mort['balance'])),
                )
                LiabilityDetails.objects.create(
                    account=account,
                    interest_rate=Decimal(str(mort['rate'])) / 100,
                    minimum_payment=mort.get('payment'),
                    term_months=mort.get('term', 360),
                )

        elif step == OnboardingStep.CREDIT_CARDS:
            for card in data.get('cards', []):
                account = Account.objects.create(
                    household=self.household,
                    name=card['name'],
                    account_type='credit_card',
                    institution=card.get('issuer', ''),
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(card['balance'])),
                )
                LiabilityDetails.objects.create(
                    account=account,
                    interest_rate=Decimal(str(card.get('rate', 0))) / 100,
                    minimum_payment=card.get('min_payment'),
                    credit_limit=card.get('limit'),
                )

        elif step == OnboardingStep.STUDENT_LOANS:
            for loan in data.get('loans', []):
                account = Account.objects.create(
                    household=self.household,
                    name=loan['name'],
                    account_type=loan.get('type', 'student_loan_federal'),
                    institution=loan.get('servicer', ''),
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(loan['balance'])),
                )
                LiabilityDetails.objects.create(
                    account=account,
                    interest_rate=Decimal(str(loan.get('rate', 0))) / 100,
                    minimum_payment=loan.get('payment'),
                    servicer=loan.get('servicer', ''),
                )

        elif step == OnboardingStep.OTHER_DEBTS:
            for debt in data.get('debts', []):
                account = Account.objects.create(
                    household=self.household,
                    name=debt['name'],
                    account_type=debt.get('type', 'other_liability'),
                    institution=debt.get('lender', ''),
                )
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=Decimal(str(debt['balance'])),
                )
                LiabilityDetails.objects.create(
                    account=account,
                    interest_rate=Decimal(str(debt.get('rate', 0))) / 100,
                    minimum_payment=debt.get('payment'),
                )

        elif step == OnboardingStep.HOUSING_EXPENSES:
            if data.get('rent'):
                RecurringFlow.objects.create(
                    household=self.household,
                    name='Rent',
                    flow_type=FlowType.EXPENSE,
                    expense_category=ExpenseCategory.RENT,
                    amount=Decimal(str(data['rent'])),
                    frequency=Frequency.MONTHLY,
                    start_date=date.today(),
                )
            if data.get('property_tax'):
                RecurringFlow.objects.create(
                    household=self.household,
                    name='Property Tax',
                    flow_type=FlowType.EXPENSE,
                    expense_category=ExpenseCategory.PROPERTY_TAX,
                    amount=Decimal(str(data['property_tax'])),
                    frequency=data.get('property_tax_frequency', Frequency.MONTHLY),
                    start_date=date.today(),
                )
            if data.get('hoa'):
                RecurringFlow.objects.create(
                    household=self.household,
                    name='HOA Fees',
                    flow_type=FlowType.EXPENSE,
                    expense_category=ExpenseCategory.HOA_FEES,
                    amount=Decimal(str(data['hoa'])),
                    frequency=Frequency.MONTHLY,
                    start_date=date.today(),
                )

        elif step == OnboardingStep.UTILITIES:
            for util in data.get('utilities', []):
                RecurringFlow.objects.create(
                    household=self.household,
                    name=util['name'],
                    flow_type=FlowType.EXPENSE,
                    expense_category=util.get('category', ExpenseCategory.ELECTRICITY),
                    amount=Decimal(str(util['amount'])),
                    frequency=util.get('frequency', Frequency.MONTHLY),
                    start_date=date.today(),
                )

        elif step == OnboardingStep.INSURANCE:
            for ins in data.get('insurance', []):
                RecurringFlow.objects.create(
                    household=self.household,
                    name=ins['name'],
                    flow_type=FlowType.EXPENSE,
                    expense_category=ins.get('category', ExpenseCategory.HEALTH_INSURANCE),
                    amount=Decimal(str(ins['amount'])),
                    frequency=ins.get('frequency', Frequency.MONTHLY),
                    start_date=date.today(),
                )

        elif step == OnboardingStep.TRANSPORTATION:
            for exp in data.get('expenses', []):
                RecurringFlow.objects.create(
                    household=self.household,
                    name=exp['name'],
                    flow_type=FlowType.EXPENSE,
                    expense_category=exp.get('category', ExpenseCategory.GAS_FUEL),
                    amount=Decimal(str(exp['amount'])),
                    frequency=exp.get('frequency', Frequency.MONTHLY),
                    start_date=date.today(),
                )

        elif step == OnboardingStep.FOOD:
            if data.get('groceries'):
                RecurringFlow.objects.create(
                    household=self.household,
                    name='Groceries',
                    flow_type=FlowType.EXPENSE,
                    expense_category=ExpenseCategory.GROCERIES,
                    amount=Decimal(str(data['groceries'])),
                    frequency=Frequency.MONTHLY,
                    start_date=date.today(),
                )
            if data.get('dining_out'):
                RecurringFlow.objects.create(
                    household=self.household,
                    name='Dining Out',
                    flow_type=FlowType.EXPENSE,
                    expense_category=ExpenseCategory.DINING_OUT,
                    amount=Decimal(str(data['dining_out'])),
                    frequency=Frequency.MONTHLY,
                    start_date=date.today(),
                )

        elif step == OnboardingStep.OTHER_EXPENSES:
            for exp in data.get('expenses', []):
                RecurringFlow.objects.create(
                    household=self.household,
                    name=exp['name'],
                    flow_type=FlowType.EXPENSE,
                    expense_category=exp.get('category', ExpenseCategory.MISCELLANEOUS),
                    amount=Decimal(str(exp['amount'])),
                    frequency=exp.get('frequency', Frequency.MONTHLY),
                    start_date=date.today(),
                )

        elif step == OnboardingStep.REVIEW:
            # Review step doesn't create any records
            pass

        elif step == OnboardingStep.COMPLETE:
            self.household.onboarding_completed = True
            self.progress.completed_at = timezone.now()
            self.progress.save()
            self.household.save()
