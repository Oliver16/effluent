import uuid
from decimal import Decimal
from django.db import models
from apps.core.models import HouseholdOwnedModel, HouseholdMember


class PayFrequency(models.TextChoices):
    WEEKLY = 'weekly', 'Weekly (52)'
    BIWEEKLY = 'biweekly', 'Bi-weekly (26)'
    SEMIMONTHLY = 'semimonthly', 'Semi-monthly (24)'
    MONTHLY = 'monthly', 'Monthly (12)'


class IncomeSource(HouseholdOwnedModel):
    """An income source with tax calculation details."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)

    household_member = models.ForeignKey(
        HouseholdMember, on_delete=models.CASCADE, related_name='income_sources'
    )

    income_type = models.CharField(
        max_length=30,
        choices=[
            ('w2', 'W-2 Employment'),
            ('w2_hourly', 'W-2 Hourly'),
            ('self_employed', 'Self-Employment (1099)'),
            ('rental', 'Rental Income'),
            ('investment', 'Investment Income'),
            ('retirement', 'Retirement/Pension'),
            ('social_security', 'Social Security'),
            ('other', 'Other Income'),
        ]
    )

    gross_annual_salary = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    hourly_rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    expected_annual_hours = models.PositiveIntegerField(default=2080, null=True, blank=True)
    pay_frequency = models.CharField(
        max_length=20, choices=PayFrequency.choices, default=PayFrequency.BIWEEKLY
    )

    is_active = models.BooleanField(default=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'income_sources'

    def __str__(self):
        return f"{self.household_member.name} - {self.name}"

    @property
    def gross_annual(self) -> Decimal:
        if self.gross_annual_salary:
            return self.gross_annual_salary
        if self.hourly_rate and self.expected_annual_hours:
            return self.hourly_rate * self.expected_annual_hours
        return Decimal('0')

    @property
    def gross_per_period(self) -> Decimal:
        from .constants import PAY_PERIODS
        annual = self.gross_annual
        periods = PAY_PERIODS.get(self.pay_frequency, 26)
        return annual / periods


class W2Withholding(models.Model):
    """W-4 based withholding configuration."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    income_source = models.OneToOneField(
        IncomeSource, on_delete=models.CASCADE, related_name='w2_withholding'
    )

    filing_status = models.CharField(
        max_length=30,
        choices=[
            ('single', 'Single or Married Filing Separately'),
            ('married', 'Married Filing Jointly'),
            ('head_of_household', 'Head of Household'),
        ],
        default='single'
    )

    # W-4 Step 2
    multiple_jobs_or_spouse_works = models.BooleanField(default=False)

    # W-4 Step 3 - Dependents
    child_tax_credit_dependents = models.PositiveSmallIntegerField(default=0)
    other_dependents = models.PositiveSmallIntegerField(default=0)

    # W-4 Step 4
    other_income = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    extra_withholding = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))

    # State
    state_allowances = models.PositiveSmallIntegerField(default=0)
    state_additional_withholding = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0')
    )

    class Meta:
        db_table = 'w2_withholdings'

    @property
    def dependent_credit_amount(self) -> Decimal:
        return Decimal(self.child_tax_credit_dependents * 2000 + self.other_dependents * 500)


class PreTaxDeduction(models.Model):
    """Pre-tax deductions from gross pay."""

    class DeductionType(models.TextChoices):
        TRADITIONAL_401K = 'traditional_401k', '401(k) Traditional'
        ROTH_401K = 'roth_401k', '401(k) Roth'
        TRADITIONAL_403B = 'traditional_403b', '403(b)'
        TSP_TRADITIONAL = 'tsp_traditional', 'TSP Traditional'
        TSP_ROTH = 'tsp_roth', 'TSP Roth'
        HSA = 'hsa', 'HSA'
        FSA_HEALTH = 'fsa_health', 'Healthcare FSA'
        FSA_DEPENDENT = 'fsa_dependent', 'Dependent Care FSA'
        HEALTH_INSURANCE = 'health_insurance', 'Health Insurance'
        DENTAL_INSURANCE = 'dental_insurance', 'Dental Insurance'
        VISION_INSURANCE = 'vision_insurance', 'Vision Insurance'
        LIFE_INSURANCE = 'life_insurance', 'Life Insurance'
        COMMUTER_TRANSIT = 'commuter_transit', 'Commuter Transit'
        COMMUTER_PARKING = 'commuter_parking', 'Commuter Parking'
        OTHER_PRETAX = 'other_pretax', 'Other Pre-Tax'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    income_source = models.ForeignKey(
        IncomeSource, on_delete=models.CASCADE, related_name='pretax_deductions'
    )

    deduction_type = models.CharField(max_length=30, choices=DeductionType.choices)
    name = models.CharField(max_length=100, blank=True)

    amount_type = models.CharField(
        max_length=20,
        choices=[('fixed', 'Fixed Amount'), ('percentage', 'Percentage')],
        default='fixed'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Employer match
    employer_match_percentage = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal('0')
    )
    employer_match_limit_percentage = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal('0')
    )
    employer_match_limit_annual = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    target_account = models.ForeignKey(
        'accounts.Account', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='funding_deductions'
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'pretax_deductions'

    def calculate_per_period(self, gross_per_period: Decimal) -> Decimal:
        if self.amount_type == 'fixed':
            return self.amount
        return gross_per_period * self.amount


class PostTaxDeduction(models.Model):
    """Post-tax deductions from net pay."""

    class DeductionType(models.TextChoices):
        ROTH_IRA = 'roth_ira', 'Roth IRA'
        LIFE_INSURANCE_POST = 'life_insurance_post', 'Life Insurance'
        UNION_DUES = 'union_dues', 'Union Dues'
        GARNISHMENT = 'garnishment', 'Wage Garnishment'
        CHILD_SUPPORT = 'child_support', 'Child Support'
        LOAN_REPAYMENT = 'loan_repayment', '401(k) Loan'
        CHARITABLE = 'charitable', 'Charitable'
        OTHER_POSTTAX = 'other_posttax', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    income_source = models.ForeignKey(
        IncomeSource, on_delete=models.CASCADE, related_name='posttax_deductions'
    )

    deduction_type = models.CharField(max_length=30, choices=DeductionType.choices)
    name = models.CharField(max_length=100, blank=True)
    amount_type = models.CharField(
        max_length=20,
        choices=[('fixed', 'Fixed'), ('percentage', 'Percentage')],
        default='fixed'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'posttax_deductions'

    def calculate_per_period(self, gross_per_period: Decimal) -> Decimal:
        if self.amount_type == 'fixed':
            return self.amount
        return gross_per_period * self.amount


class SelfEmploymentTax(HouseholdOwnedModel):
    """Self-employment tax configuration."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    income_source = models.OneToOneField(
        IncomeSource, on_delete=models.CASCADE, related_name='se_tax_config'
    )

    q1_estimated_payment = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    q2_estimated_payment = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    q3_estimated_payment = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    q4_estimated_payment = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))

    estimated_annual_expenses = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    retirement_contribution_percentage = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal('0')
    )

    class Meta:
        db_table = 'self_employment_tax'
