# Task 4: US Tax Calculation Models

## Objective
Create comprehensive US tax calculation system for gross-to-net pay modeling, including W-2 withholding, FICA, state taxes, and self-employment taxes.

## Prerequisites
- Task 1 (Backend Setup) completed
- Task 2 (Account Models) completed

## Deliverables
1. IncomeSource model for W-2 and self-employment
2. W2Withholding model (2020+ W-4 based)
3. PreTaxDeduction model (401k, HSA, FSA, insurance)
4. PostTaxDeduction model
5. Tax calculation service with 2026 constants
6. PaycheckCalculator for gross-to-net

---

## Create App Structure

```
backend/apps/taxes/
├── __init__.py
├── apps.py
├── models.py
├── services.py
├── constants.py
├── admin.py
└── urls.py
```

---

## apps/taxes/constants.py

```python
from decimal import Decimal

TAX_YEAR = 2026

# Standard Deductions
STANDARD_DEDUCTIONS = {
    'single': Decimal('15700'),
    'married_jointly': Decimal('31400'),
    'married_separately': Decimal('15700'),
    'head_of_household': Decimal('23550'),
    'qualifying_widow': Decimal('31400'),
}

# Federal Tax Brackets 2026 (projected)
FEDERAL_BRACKETS = {
    'single': [
        (Decimal('11925'), Decimal('0.10')),
        (Decimal('48475'), Decimal('0.12')),
        (Decimal('103350'), Decimal('0.22')),
        (Decimal('197300'), Decimal('0.24')),
        (Decimal('250500'), Decimal('0.32')),
        (Decimal('626350'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
    'married_jointly': [
        (Decimal('23850'), Decimal('0.10')),
        (Decimal('96950'), Decimal('0.12')),
        (Decimal('206700'), Decimal('0.22')),
        (Decimal('394600'), Decimal('0.24')),
        (Decimal('501050'), Decimal('0.32')),
        (Decimal('751600'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
    'married_separately': [
        (Decimal('11925'), Decimal('0.10')),
        (Decimal('48475'), Decimal('0.12')),
        (Decimal('103350'), Decimal('0.22')),
        (Decimal('197300'), Decimal('0.24')),
        (Decimal('250525'), Decimal('0.32')),
        (Decimal('375800'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
    'head_of_household': [
        (Decimal('17000'), Decimal('0.10')),
        (Decimal('64850'), Decimal('0.12')),
        (Decimal('103350'), Decimal('0.22')),
        (Decimal('197300'), Decimal('0.24')),
        (Decimal('250500'), Decimal('0.32')),
        (Decimal('626350'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
}

# FICA
SOCIAL_SECURITY_RATE = Decimal('0.062')
SOCIAL_SECURITY_WAGE_BASE = Decimal('176100')
MEDICARE_RATE = Decimal('0.0145')
ADDITIONAL_MEDICARE_RATE = Decimal('0.009')
ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = Decimal('200000')
ADDITIONAL_MEDICARE_THRESHOLD_MARRIED = Decimal('250000')

# Self-Employment
SE_TAX_RATE = Decimal('0.153')
SE_TAX_DEDUCTION = Decimal('0.5')

# Contribution Limits
CONTRIBUTION_LIMITS = {
    '401k_employee': Decimal('24500'),
    '401k_catchup': Decimal('8000'),
    '401k_total': Decimal('73500'),
    'ira': Decimal('7500'),
    'ira_catchup': Decimal('1000'),
    'hsa_individual': Decimal('4400'),
    'hsa_family': Decimal('8750'),
    'hsa_catchup': Decimal('1000'),
    'fsa_health': Decimal('3300'),
    'fsa_dependent': Decimal('5000'),
}

# State tax rates (simplified flat approximations)
STATE_TAX_RATES = {
    'AL': Decimal('0.05'), 'AZ': Decimal('0.025'), 'AR': Decimal('0.055'),
    'CA': Decimal('0.0725'), 'CO': Decimal('0.044'), 'CT': Decimal('0.055'),
    'DE': Decimal('0.066'), 'GA': Decimal('0.055'), 'HI': Decimal('0.0725'),
    'ID': Decimal('0.058'), 'IL': Decimal('0.0495'), 'IN': Decimal('0.0315'),
    'IA': Decimal('0.06'), 'KS': Decimal('0.057'), 'KY': Decimal('0.045'),
    'LA': Decimal('0.0425'), 'ME': Decimal('0.0715'), 'MD': Decimal('0.0575'),
    'MA': Decimal('0.05'), 'MI': Decimal('0.0425'), 'MN': Decimal('0.0785'),
    'MS': Decimal('0.05'), 'MO': Decimal('0.054'), 'MT': Decimal('0.0675'),
    'NE': Decimal('0.0684'), 'NJ': Decimal('0.0637'), 'NM': Decimal('0.059'),
    'NY': Decimal('0.0685'), 'NC': Decimal('0.0525'), 'ND': Decimal('0.029'),
    'OH': Decimal('0.04'), 'OK': Decimal('0.0475'), 'OR': Decimal('0.099'),
    'PA': Decimal('0.0307'), 'RI': Decimal('0.0599'), 'SC': Decimal('0.07'),
    'TN': Decimal('0'), 'UT': Decimal('0.0485'), 'VT': Decimal('0.0875'),
    'VA': Decimal('0.0575'), 'WV': Decimal('0.065'), 'WI': Decimal('0.0765'),
    'DC': Decimal('0.085'),
}

NO_INCOME_TAX_STATES = {'AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'}

PAY_PERIODS = {
    'weekly': 52,
    'biweekly': 26,
    'semimonthly': 24,
    'monthly': 12,
}
```

---

## apps/taxes/models.py

```python
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
```

---

## apps/taxes/services.py

```python
from dataclasses import dataclass
from decimal import Decimal
from .models import IncomeSource, PayFrequency
from .constants import (
    STANDARD_DEDUCTIONS, FEDERAL_BRACKETS, PAY_PERIODS,
    SOCIAL_SECURITY_RATE, SOCIAL_SECURITY_WAGE_BASE,
    MEDICARE_RATE, ADDITIONAL_MEDICARE_RATE,
    ADDITIONAL_MEDICARE_THRESHOLD_SINGLE, ADDITIONAL_MEDICARE_THRESHOLD_MARRIED,
    STATE_TAX_RATES, NO_INCOME_TAX_STATES,
)


@dataclass
class PaycheckBreakdown:
    gross_pay: Decimal
    pretax_retirement: Decimal
    pretax_health: Decimal
    pretax_other: Decimal
    total_pretax: Decimal
    federal_taxable: Decimal
    federal_withholding: Decimal
    social_security_tax: Decimal
    medicare_tax: Decimal
    state_withholding: Decimal
    total_taxes: Decimal
    posttax_deductions: Decimal
    net_pay: Decimal
    employer_match: Decimal
    effective_tax_rate: Decimal


class PaycheckCalculator:
    """Calculate net pay from gross for W-2 employees."""
    
    def __init__(self, income_source: IncomeSource):
        self.income_source = income_source
        self.withholding = getattr(income_source, 'w2_withholding', None)
    
    def calculate_paycheck(self) -> PaycheckBreakdown:
        gross = self.income_source.gross_per_period
        
        # Pre-tax deductions
        pretax_retirement = Decimal('0')
        pretax_health = Decimal('0')
        pretax_other = Decimal('0')
        
        retirement_types = {'traditional_401k', 'traditional_403b', 'tsp_traditional'}
        health_types = {'health_insurance', 'dental_insurance', 'vision_insurance', 'hsa', 'fsa_health'}
        
        for ded in self.income_source.pretax_deductions.filter(is_active=True):
            amount = ded.calculate_per_period(gross)
            if ded.deduction_type in retirement_types:
                pretax_retirement += amount
            elif ded.deduction_type in health_types:
                pretax_health += amount
            else:
                pretax_other += amount
        
        total_pretax = pretax_retirement + pretax_health + pretax_other
        
        # Taxable wages
        federal_taxable = gross - total_pretax
        ss_taxable = gross - pretax_health - pretax_other
        medicare_taxable = gross - pretax_health - pretax_other
        
        # Taxes
        federal = self._calc_federal_withholding(federal_taxable)
        ss_tax = self._calc_social_security(ss_taxable)
        medicare = self._calc_medicare(medicare_taxable)
        state = self._calc_state_withholding(federal_taxable)
        
        total_taxes = federal + ss_tax + medicare + state
        
        # Post-tax
        posttax = sum(
            d.calculate_per_period(gross)
            for d in self.income_source.posttax_deductions.filter(is_active=True)
        )
        
        net_pay = gross - total_pretax - total_taxes - posttax
        employer_match = self._calc_employer_match()
        
        return PaycheckBreakdown(
            gross_pay=gross.quantize(Decimal('0.01')),
            pretax_retirement=pretax_retirement.quantize(Decimal('0.01')),
            pretax_health=pretax_health.quantize(Decimal('0.01')),
            pretax_other=pretax_other.quantize(Decimal('0.01')),
            total_pretax=total_pretax.quantize(Decimal('0.01')),
            federal_taxable=federal_taxable.quantize(Decimal('0.01')),
            federal_withholding=federal.quantize(Decimal('0.01')),
            social_security_tax=ss_tax.quantize(Decimal('0.01')),
            medicare_tax=medicare.quantize(Decimal('0.01')),
            state_withholding=state.quantize(Decimal('0.01')),
            total_taxes=total_taxes.quantize(Decimal('0.01')),
            posttax_deductions=posttax.quantize(Decimal('0.01')),
            net_pay=net_pay.quantize(Decimal('0.01')),
            employer_match=employer_match.quantize(Decimal('0.01')),
            effective_tax_rate=(total_taxes / gross if gross else Decimal('0')).quantize(Decimal('0.0001')),
        )
    
    def _calc_federal_withholding(self, taxable: Decimal) -> Decimal:
        periods = PAY_PERIODS.get(self.income_source.pay_frequency, 26)
        annual = taxable * periods
        
        status = 'single'
        extra = Decimal('0')
        dependent_credit = Decimal('0')
        
        if self.withholding:
            status = self.withholding.filing_status
            annual += self.withholding.other_income
            annual -= self.withholding.deductions
            extra = self.withholding.extra_withholding
            dependent_credit = self.withholding.dependent_credit_amount
        
        std_ded = STANDARD_DEDUCTIONS.get(status, STANDARD_DEDUCTIONS['single'])
        annual -= std_ded
        
        if annual <= 0:
            return extra
        
        brackets = FEDERAL_BRACKETS.get(status, FEDERAL_BRACKETS['single'])
        annual_tax = self._calc_from_brackets(annual, brackets)
        annual_tax = max(annual_tax - dependent_credit, Decimal('0'))
        
        return (annual_tax / periods) + extra
    
    def _calc_from_brackets(self, income: Decimal, brackets: list) -> Decimal:
        tax = Decimal('0')
        prev = Decimal('0')
        for threshold, rate in brackets:
            if threshold is None:
                tax += (income - prev) * rate
                break
            elif income <= threshold:
                tax += (income - prev) * rate
                break
            else:
                tax += (threshold - prev) * rate
                prev = threshold
        return tax
    
    def _calc_social_security(self, taxable: Decimal) -> Decimal:
        periods = PAY_PERIODS.get(self.income_source.pay_frequency, 26)
        period_cap = SOCIAL_SECURITY_WAGE_BASE / periods
        return min(taxable, period_cap) * SOCIAL_SECURITY_RATE
    
    def _calc_medicare(self, taxable: Decimal) -> Decimal:
        base = taxable * MEDICARE_RATE
        
        periods = PAY_PERIODS.get(self.income_source.pay_frequency, 26)
        annual = taxable * periods
        threshold = ADDITIONAL_MEDICARE_THRESHOLD_SINGLE
        
        if self.withholding and self.withholding.filing_status == 'married':
            threshold = ADDITIONAL_MEDICARE_THRESHOLD_MARRIED
        
        if annual > threshold:
            excess = (annual - threshold) / periods
            base += excess * ADDITIONAL_MEDICARE_RATE
        
        return base
    
    def _calc_state_withholding(self, taxable: Decimal) -> Decimal:
        state = self.income_source.household.state_of_residence
        if not state or state in NO_INCOME_TAX_STATES:
            return Decimal('0')
        rate = STATE_TAX_RATES.get(state, Decimal('0.05'))
        return taxable * rate
    
    def _calc_employer_match(self) -> Decimal:
        total = Decimal('0')
        gross = self.income_source.gross_per_period
        gross_annual = self.income_source.gross_annual
        periods = PAY_PERIODS.get(self.income_source.pay_frequency, 26)
        
        for ded in self.income_source.pretax_deductions.filter(is_active=True):
            if ded.employer_match_percentage:
                emp_contrib = ded.calculate_per_period(gross) * periods
                match = emp_contrib * ded.employer_match_percentage
                
                if ded.employer_match_limit_percentage:
                    max_matchable = gross_annual * ded.employer_match_limit_percentage
                    match = min(match, max_matchable * ded.employer_match_percentage)
                
                if ded.employer_match_limit_annual:
                    match = min(match, ded.employer_match_limit_annual)
                
                total += match / periods
        
        return total
```

---

## apps/taxes/admin.py

```python
from django.contrib import admin
from .models import IncomeSource, W2Withholding, PreTaxDeduction, PostTaxDeduction

class W2WithholdingInline(admin.StackedInline):
    model = W2Withholding
    extra = 0

class PreTaxDeductionInline(admin.TabularInline):
    model = PreTaxDeduction
    extra = 1

class PostTaxDeductionInline(admin.TabularInline):
    model = PostTaxDeduction
    extra = 0

@admin.register(IncomeSource)
class IncomeSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'household_member', 'income_type', 'gross_annual', 'pay_frequency', 'is_active')
    list_filter = ('income_type', 'is_active')
    inlines = [W2WithholdingInline, PreTaxDeductionInline, PostTaxDeductionInline]
```

---

## Update config/settings/base.py

Add to INSTALLED_APPS:
```python
'apps.taxes',
```

---

## Verification Steps

1. Run migrations:
   ```bash
   docker-compose exec backend python manage.py makemigrations taxes
   docker-compose exec backend python manage.py migrate
   ```

2. Test calculations:
   ```python
   from decimal import Decimal
   from apps.taxes.services import PaycheckCalculator
   from apps.taxes.models import IncomeSource, W2Withholding, PreTaxDeduction
   
   # Create test income source
   # ... then:
   calc = PaycheckCalculator(income_source)
   paycheck = calc.calculate_paycheck()
   print(f"Gross: ${paycheck.gross_pay}")
   print(f"Federal: ${paycheck.federal_withholding}")
   print(f"FICA: ${paycheck.social_security_tax + paycheck.medicare_tax}")
   print(f"State: ${paycheck.state_withholding}")
   print(f"Net: ${paycheck.net_pay}")
   ```

## Acceptance Criteria
- [ ] IncomeSource captures W-2 and self-employment
- [ ] W2Withholding matches W-4 form
- [ ] PreTaxDeduction handles 401k, HSA, FSA, insurance
- [ ] Federal withholding uses correct brackets
- [ ] FICA taxes calculated with wage base
- [ ] State taxes calculated for all states
- [ ] Employer match calculated correctly
- [ ] PaycheckCalculator produces accurate net pay
