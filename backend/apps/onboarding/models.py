import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField
from apps.core.models import Household


class OnboardingStep(models.TextChoices):
    WELCOME = 'welcome', 'Welcome'
    HOUSEHOLD_INFO = 'household_info', 'Household Info'
    MEMBERS = 'members', 'Members'
    TAX_FILING = 'tax_filing', 'Tax Filing'
    INCOME_SOURCES = 'income_sources', 'Income Sources'
    BUSINESS_EXPENSES = 'business_expenses', 'Business & Rental Expenses'
    WITHHOLDING = 'withholding', 'Withholding'
    PRETAX_DEDUCTIONS = 'pretax_deductions', 'Pre-Tax Deductions'
    BANK_ACCOUNTS = 'bank_accounts', 'Bank Accounts'
    INVESTMENTS = 'investments', 'Investments'
    RETIREMENT = 'retirement', 'Retirement Accounts'
    REAL_ESTATE = 'real_estate', 'Real Estate'
    VEHICLES = 'vehicles', 'Vehicles'
    PERSONAL_PROPERTY = 'personal_property', 'Personal Property'
    BUSINESS_OWNERSHIP = 'business_ownership', 'Business Ownership'
    MORTGAGES = 'mortgages', 'Mortgages'
    CREDIT_CARDS = 'credit_cards', 'Credit Cards'
    STUDENT_LOANS = 'student_loans', 'Student Loans'
    OTHER_DEBTS = 'other_debts', 'Other Debts'
    HOUSING_EXPENSES = 'housing_expenses', 'Housing Expenses'
    UTILITIES = 'utilities', 'Utilities'
    INSURANCE = 'insurance', 'Insurance'
    TRANSPORTATION = 'transportation', 'Transportation'
    FOOD = 'food', 'Food'
    OTHER_EXPENSES = 'other_expenses', 'Other Expenses'
    REVIEW = 'review', 'Review'
    COMPLETE = 'complete', 'Complete'


ONBOARDING_FLOW = [
    OnboardingStep.WELCOME,
    OnboardingStep.HOUSEHOLD_INFO,
    OnboardingStep.MEMBERS,
    OnboardingStep.TAX_FILING,
    OnboardingStep.INCOME_SOURCES,
    OnboardingStep.BUSINESS_EXPENSES,
    OnboardingStep.WITHHOLDING,
    OnboardingStep.PRETAX_DEDUCTIONS,
    OnboardingStep.BANK_ACCOUNTS,
    OnboardingStep.INVESTMENTS,
    OnboardingStep.RETIREMENT,
    OnboardingStep.REAL_ESTATE,
    OnboardingStep.VEHICLES,
    OnboardingStep.PERSONAL_PROPERTY,
    OnboardingStep.BUSINESS_OWNERSHIP,
    OnboardingStep.MORTGAGES,
    OnboardingStep.CREDIT_CARDS,
    OnboardingStep.STUDENT_LOANS,
    OnboardingStep.OTHER_DEBTS,
    OnboardingStep.HOUSING_EXPENSES,
    OnboardingStep.UTILITIES,
    OnboardingStep.INSURANCE,
    OnboardingStep.TRANSPORTATION,
    OnboardingStep.FOOD,
    OnboardingStep.OTHER_EXPENSES,
    OnboardingStep.REVIEW,
    OnboardingStep.COMPLETE,
]

# Income sources is NOT skippable - at least one income source is required
# Business expenses auto-skips if no business/rental/self-employment income
SKIPPABLE_STEPS = {
    OnboardingStep.WITHHOLDING,
    OnboardingStep.PRETAX_DEDUCTIONS,
    OnboardingStep.REAL_ESTATE, OnboardingStep.VEHICLES,
    OnboardingStep.PERSONAL_PROPERTY, OnboardingStep.BUSINESS_OWNERSHIP,
    OnboardingStep.MORTGAGES, OnboardingStep.CREDIT_CARDS,
    OnboardingStep.STUDENT_LOANS, OnboardingStep.OTHER_DEBTS,
}


class OnboardingProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    household = models.OneToOneField(Household, on_delete=models.CASCADE, related_name='onboarding')
    current_step = models.CharField(max_length=50, choices=OnboardingStep.choices, default=OnboardingStep.WELCOME)
    completed_steps = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    skipped_steps = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'onboarding_progress'

    @property
    def progress_percentage(self) -> int:
        # Total steps excluding COMPLETE (which is the final destination, not a step to complete)
        total = len(ONBOARDING_FLOW) - 1
        done = len(self.completed_steps)
        # Cap at 100% to prevent exceeding 100
        return min(int((done / total) * 100), 100) if total > 0 else 0

    def get_next_step(self):
        try:
            idx = ONBOARDING_FLOW.index(self.current_step)
            return ONBOARDING_FLOW[idx + 1] if idx < len(ONBOARDING_FLOW) - 1 else None
        except ValueError:
            return None

    def get_previous_step(self):
        try:
            idx = ONBOARDING_FLOW.index(self.current_step)
            return ONBOARDING_FLOW[idx - 1] if idx > 0 else None
        except ValueError:
            return None

    def can_skip(self) -> bool:
        return self.current_step in SKIPPABLE_STEPS

    def advance(self, mark_complete=True):
        if mark_complete and self.current_step not in self.completed_steps:
            self.completed_steps.append(self.current_step)
        next_step = self.get_next_step()
        if next_step:
            self.current_step = next_step
            self.save()
        return next_step


class OnboardingStepData(models.Model):
    """Stores draft data for each step - enables auto-save."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    progress = models.ForeignKey(OnboardingProgress, on_delete=models.CASCADE, related_name='step_data')
    step = models.CharField(max_length=50, choices=OnboardingStep.choices)
    data = models.JSONField(default=dict)
    is_valid = models.BooleanField(default=False)
    validation_errors = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'onboarding_step_data'
        unique_together = ['progress', 'step']
