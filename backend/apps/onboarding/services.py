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
        step_data, _ = OnboardingStepData.objects.get_or_create(
            progress=self.progress, step=self.progress.current_step
        )
        return {
            'step': self.progress.current_step,
            'progress_percentage': self.progress.progress_percentage,
            'can_skip': self.progress.can_skip(),
            'can_go_back': self.progress.get_previous_step() is not None,
            'draft_data': step_data.data,
            'is_valid': step_data.is_valid,
            'errors': step_data.validation_errors,
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
        return {'saved': True, 'is_valid': is_valid, 'errors': errors}

    def complete_step(self, data: dict) -> dict:
        """Validate, save data, create records, advance to next step."""
        is_valid, errors = self._validate(self.progress.current_step, data)
        if not is_valid:
            return {'success': False, 'errors': errors}

        try:
            with transaction.atomic():
                self._process_step(self.progress.current_step, data)
                next_step = self.progress.advance()
        except Exception as e:
            return {'success': False, 'errors': {'_general': str(e)}}

        return {'success': True, 'next_step': next_step}

    def skip_step(self) -> dict:
        if not self.progress.can_skip():
            return {'success': False, 'error': 'Cannot skip this step'}
        self.progress.skipped_steps.append(self.progress.current_step)
        next_step = self.progress.advance(mark_complete=False)
        return {'success': True, 'next_step': next_step}

    def go_back(self) -> dict:
        prev = self.progress.get_previous_step()
        if not prev:
            return {'success': False, 'error': 'At first step'}
        self.progress.current_step = prev
        self.progress.save()
        return {'success': True, 'step': prev}

    def _validate(self, step: str, data: dict) -> tuple[bool, dict]:
        errors = {}
        if step == OnboardingStep.HOUSEHOLD_INFO:
            if not data.get('name'):
                errors['name'] = 'Required'
        elif step == OnboardingStep.MEMBERS:
            if not data.get('members'):
                errors['members'] = 'At least one member required'
        elif step == OnboardingStep.TAX_FILING:
            if not data.get('filing_status'):
                errors['filing_status'] = 'Required'
            if not data.get('state'):
                errors['state'] = 'Required'
        elif step == OnboardingStep.INCOME_SOURCES:
            for i, src in enumerate(data.get('sources', [])):
                if not src.get('name'):
                    errors[f'sources.{i}.name'] = 'Required'
        elif step == OnboardingStep.BANK_ACCOUNTS:
            for i, acct in enumerate(data.get('accounts', [])):
                if not acct.get('name'):
                    errors[f'accounts.{i}.name'] = 'Required'
                if acct.get('balance') is None:
                    errors[f'accounts.{i}.balance'] = 'Required'
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

        elif step == OnboardingStep.COMPLETE:
            self.household.onboarding_completed = True
            self.progress.completed_at = timezone.now()
            self.progress.save()
            self.household.save()
