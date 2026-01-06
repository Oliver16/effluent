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
            'canGoBack': self._get_previous_navigable_step() is not None,
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
                # Save draft data so it's available when navigating back
                step_data, _ = OnboardingStepData.objects.get_or_create(
                    progress=self.progress, step=self.progress.current_step
                )
                step_data.data = data
                step_data.is_valid = True
                step_data.validation_errors = {}
                step_data.save()

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

            # Skip business_expenses if no self-employment/rental/business income
            if current_step == OnboardingStep.BUSINESS_EXPENSES:
                has_business_income = IncomeSource.objects.filter(
                    household=self.household,
                    income_type__in=['self_employed', 'rental']
                ).exists()
                if not has_business_income:
                    should_skip = True

            # Skip withholding step if no W-2 income sources exist
            elif current_step == OnboardingStep.WITHHOLDING:
                has_w2_income = IncomeSource.objects.filter(
                    household=self.household,
                    income_type__in=['w2', 'w2_hourly']
                ).exists()
                if not has_w2_income:
                    should_skip = True

            # Skip pretax_deductions if no W-2 income sources exist
            # (pre-tax deductions only apply to W-2 employment)
            elif current_step == OnboardingStep.PRETAX_DEDUCTIONS:
                has_w2_income = IncomeSource.objects.filter(
                    household=self.household,
                    income_type__in=['w2', 'w2_hourly']
                ).exists()
                if not has_w2_income:
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
        prev = self._get_previous_navigable_step()
        if not prev:
            return {'success': False, 'error': 'At first step'}
        self.progress.current_step = prev
        self.progress.save()
        return {'success': True, 'currentStep': prev}

    def _get_previous_navigable_step(self) -> str | None:
        """
        Get the previous step, skipping any steps that were auto-skipped.
        This ensures back navigation respects the same skip logic as forward navigation.
        """
        from .models import ONBOARDING_FLOW

        try:
            current_idx = ONBOARDING_FLOW.index(self.progress.current_step)
        except ValueError:
            return None

        # Walk backwards through the flow, skipping auto-skipped steps
        for idx in range(current_idx - 1, -1, -1):
            step = ONBOARDING_FLOW[idx]
            # Skip steps that were auto-skipped (not manually skipped by user clicking "Skip")
            if step in self.progress.skipped_steps:
                # Check if this was an auto-skip (step that doesn't apply)
                if self._should_auto_skip(step):
                    continue
            return step

        return None

    def _should_auto_skip(self, step: str) -> bool:
        """Check if a step should be auto-skipped based on current household data."""
        if step == OnboardingStep.BUSINESS_EXPENSES:
            return not IncomeSource.objects.filter(
                household=self.household,
                income_type__in=['self_employed', 'rental']
            ).exists()
        elif step == OnboardingStep.WITHHOLDING:
            return not IncomeSource.objects.filter(
                household=self.household,
                income_type__in=['w2', 'w2_hourly']
            ).exists()
        elif step == OnboardingStep.PRETAX_DEDUCTIONS:
            return not IncomeSource.objects.filter(
                household=self.household,
                income_type__in=['w2', 'w2_hourly']
            ).exists()
        return False

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
            # At least one income source is required
            sources = data.get('sources', [])
            if not sources:
                errors['sources'] = 'At least one income source is required'
            for i, src in enumerate(sources):
                if not src.get('member_id'):
                    errors[f'sources.{i}.member_id'] = 'Household member is required'
                if not src.get('name'):
                    errors[f'sources.{i}.name'] = 'Required'
                income_type = src.get('income_type', 'w2')
                # Validate salary/income based on income type
                # Use 'is None' check to allow 0 as a valid value
                if income_type == 'w2' and src.get('salary') is None:
                    errors[f'sources.{i}.salary'] = 'Salary required for W-2 income'
                if income_type == 'w2_hourly' and src.get('hourly_rate') is None:
                    errors[f'sources.{i}.hourly_rate'] = 'Hourly rate required for hourly income'
                if income_type in ['self_employed', 'rental', 'investment', 'retirement', 'other'] and src.get('salary') is None:
                    errors[f'sources.{i}.salary'] = 'Annual income amount is required'
        elif step == OnboardingStep.BUSINESS_EXPENSES:
            # Business expenses are required if user has business/rental income
            # At minimum, validate any expenses entered have required fields
            for i, exp in enumerate(data.get('expenses', [])):
                if not exp.get('name'):
                    errors[f'expenses.{i}.name'] = 'Required'
                if exp.get('amount') is None:
                    errors[f'expenses.{i}.amount'] = 'Required'
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
        elif step == OnboardingStep.PERSONAL_PROPERTY:
            for i, item in enumerate(data.get('personal_property', [])):
                if not item.get('name'):
                    errors[f'personal_property.{i}.name'] = 'Required'
                if item.get('value') is None:
                    errors[f'personal_property.{i}.value'] = 'Required'
        elif step == OnboardingStep.BUSINESS_OWNERSHIP:
            for i, biz in enumerate(data.get('business_ownership', [])):
                if not biz.get('name'):
                    errors[f'business_ownership.{i}.name'] = 'Required'
                if biz.get('valuation') is None:
                    errors[f'business_ownership.{i}.valuation'] = 'Required'
                if biz.get('ownership_percentage') is None:
                    errors[f'business_ownership.{i}.ownership_percentage'] = 'Required'
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
            # Delete existing income sources to prevent duplication when going back
            IncomeSource.objects.filter(household=self.household).delete()
            for src in data.get('sources', []):
                member = HouseholdMember.objects.filter(
                    household=self.household, id=src.get('member_id')
                ).first()
                income_type = src.get('income_type', 'w2')
                # Create income source with all details in one step
                # Use 'is not None' to allow 0 as a valid value
                income_source = IncomeSource.objects.create(
                    household=self.household,
                    household_member=member,
                    name=src['name'],
                    income_type=income_type,
                    gross_annual_salary=Decimal(str(src['salary'])) if src.get('salary') is not None else None,
                    hourly_rate=Decimal(str(src['hourly_rate'])) if src.get('hourly_rate') is not None else None,
                    expected_annual_hours=int(src.get('expected_annual_hours', 2080)) if income_type == 'w2_hourly' else None,
                    pay_frequency=src.get('frequency', 'biweekly'),
                )

        elif step == OnboardingStep.BUSINESS_EXPENSES:
            # Delete any existing business expenses to prevent duplication
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category__startswith='business_'
            ).delete()
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category__startswith='rental_'
            ).delete()
            for exp in data.get('expenses', []):
                RecurringFlow.objects.create(
                    household=self.household,
                    name=exp['name'],
                    flow_type=FlowType.EXPENSE,
                    expense_category=exp.get('category', ExpenseCategory.BUSINESS_OTHER),
                    amount=Decimal(str(exp['amount'])),
                    frequency=exp.get('frequency', Frequency.MONTHLY),
                    start_date=date.today(),
                )

        elif step == OnboardingStep.WITHHOLDING:
            # Derive W-4 filing status from household tax filing status
            household_filing = self.household.tax_filing_status
            # Map household filing status to W-4 filing status
            w4_filing_map = {
                'single': 'single',
                'married_jointly': 'married',
                'married_separately': 'single',  # For W-4, married filing separately uses single
                'head_of_household': 'head_of_household',
            }
            default_w4_filing = w4_filing_map.get(household_filing, 'single')

            for wh in data.get('withholdings', []):
                if wh.get('income_source_id'):
                    income_source = IncomeSource.objects.filter(
                        household=self.household, id=wh['income_source_id']
                    ).first()
                    if income_source:
                        W2Withholding.objects.update_or_create(
                            income_source=income_source,
                            defaults={
                                'filing_status': default_w4_filing,
                                'multiple_jobs_or_spouse_works': wh.get('multiple_jobs', False),
                                'child_tax_credit_dependents': wh.get('child_dependents', 0),
                                'other_dependents': wh.get('other_dependents', 0),
                                'extra_withholding': Decimal(str(wh.get('extra_withholding', 0))),
                            }
                        )

        elif step == OnboardingStep.PRETAX_DEDUCTIONS:
            # Delete existing pretax deductions to prevent duplication when going back
            PreTaxDeduction.objects.filter(
                income_source__household=self.household
            ).delete()
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
            # Delete existing bank accounts to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type__in=['checking', 'savings', 'money_market']
            ).delete()
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
            # Delete existing investment accounts to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type__in=['brokerage', 'crypto']
            ).delete()
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
            # Delete existing retirement accounts to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type__in=['traditional_401k', 'roth_401k', 'traditional_ira', 'roth_ira', 'hsa', 'pension']
            ).delete()
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
            # Delete existing real estate to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type__in=['primary_residence', 'rental_property', 'vacation_property', 'land']
            ).delete()
            for prop in data.get('properties', []):
                account = Account.objects.create(
                    household=self.household,
                    name=prop['name'],
                    account_type=prop.get('type', 'primary_residence'),
                    institution='',
                )
                market_value = Decimal(str(prop['value']))
                cost_basis = Decimal(str(prop['cost_basis'])) if prop.get('cost_basis') else market_value
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=market_value,
                    market_value=market_value,
                    cost_basis=cost_basis,
                )

        elif step == OnboardingStep.VEHICLES:
            # Delete existing vehicles to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type='vehicle'
            ).delete()
            for veh in data.get('vehicles', []):
                account = Account.objects.create(
                    household=self.household,
                    name=veh['name'],
                    account_type='vehicle',
                    institution='',
                )
                market_value = Decimal(str(veh['value']))
                cost_basis = Decimal(str(veh['cost_basis'])) if veh.get('cost_basis') else market_value
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=market_value,
                    market_value=market_value,
                    cost_basis=cost_basis,
                )

        elif step == OnboardingStep.PERSONAL_PROPERTY:
            # Map frontend types to backend account types
            type_mapping = {
                'jewelry': 'jewelry',
                'precious_metals': 'jewelry',  # Treated as jewelry/collectibles
                'collectibles': 'jewelry',
                'art': 'jewelry',
                'firearms': 'other_asset',
                'electronics': 'other_asset',
                'musical_instruments': 'other_asset',
                'sports_equipment': 'other_asset',
                'boat': 'boat',
                'rv': 'boat',  # RVs use boat type
                'motorcycle': 'vehicle',
                'other': 'other_asset',
            }
            for item in data.get('personal_property', []):
                account_type = type_mapping.get(item.get('type', 'other'), 'other_asset')
                account = Account.objects.create(
                    household=self.household,
                    name=item['name'],
                    account_type=account_type,
                    institution='',
                    notes=item.get('description', ''),
                )
                market_value = Decimal(str(item['value']))
                cost_basis = Decimal(str(item['cost_basis'])) if item.get('cost_basis') else market_value
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=market_value,
                    market_value=market_value,
                    cost_basis=cost_basis,
                )

        elif step == OnboardingStep.BUSINESS_OWNERSHIP:
            for biz in data.get('business_ownership', []):
                # Create account for business ownership stake
                account = Account.objects.create(
                    household=self.household,
                    name=biz['name'],
                    account_type='business_equity',
                    institution=biz.get('business_type', 'llc'),  # Store business type in institution field
                    notes=f"Ownership: {biz.get('ownership_percentage', 100)}%",
                )
                valuation = Decimal(str(biz['valuation']))
                cost_basis = Decimal(str(biz['cost_basis'])) if biz.get('cost_basis') else valuation
                BalanceSnapshot.objects.create(
                    account=account,
                    as_of_date=date.today(),
                    balance=valuation,
                    market_value=valuation,
                    cost_basis=cost_basis,
                )

        elif step == OnboardingStep.MORTGAGES:
            # Delete existing mortgages to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type='primary_mortgage'
            ).delete()
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
            # Delete existing credit cards to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type='credit_card'
            ).delete()
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
            # Delete existing student loans to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type__in=['student_loan_federal', 'student_loan_private']
            ).delete()
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
                    term_months=loan.get('term'),
                    servicer=loan.get('servicer', ''),
                )

        elif step == OnboardingStep.OTHER_DEBTS:
            # Delete existing other debts to prevent duplication when going back
            Account.objects.filter(
                household=self.household,
                account_type='other_liability'
            ).delete()
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
                    term_months=debt.get('term'),
                )

        elif step == OnboardingStep.HOUSING_EXPENSES:
            # Delete existing housing expenses to prevent duplication when going back
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category__in=[ExpenseCategory.RENT, ExpenseCategory.PROPERTY_TAX, ExpenseCategory.HOA_FEES]
            ).delete()
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
            # Delete existing utility expenses to prevent duplication when going back
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category__in=[
                    ExpenseCategory.ELECTRICITY, ExpenseCategory.NATURAL_GAS,
                    ExpenseCategory.WATER_SEWER, ExpenseCategory.TRASH,
                    ExpenseCategory.INTERNET, ExpenseCategory.PHONE,
                    ExpenseCategory.CABLE_STREAMING
                ]
            ).delete()
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
            # Delete existing insurance expenses to prevent duplication when going back
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category__in=[
                    ExpenseCategory.HEALTH_INSURANCE, ExpenseCategory.DENTAL_INSURANCE,
                    ExpenseCategory.VISION_INSURANCE, ExpenseCategory.LIFE_INSURANCE,
                    ExpenseCategory.DISABILITY_INSURANCE
                ]
            ).delete()
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
            # Delete existing transportation expenses to prevent duplication when going back
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category__in=[
                    ExpenseCategory.AUTO_INSURANCE, ExpenseCategory.GAS_FUEL,
                    ExpenseCategory.AUTO_MAINTENANCE, ExpenseCategory.PARKING,
                    ExpenseCategory.PUBLIC_TRANSIT
                ]
            ).delete()
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
            # Delete existing food expenses to prevent duplication when going back
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category__in=[ExpenseCategory.GROCERIES, ExpenseCategory.DINING_OUT]
            ).delete()
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
            # Delete existing other expenses to prevent duplication when going back
            RecurringFlow.objects.filter(
                household=self.household,
                expense_category=ExpenseCategory.MISCELLANEOUS
            ).delete()
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
