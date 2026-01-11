from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
from .models import IncomeSource, PayFrequency
from .constants import (
    STANDARD_DEDUCTIONS, FEDERAL_BRACKETS, PAY_PERIODS,
    SOCIAL_SECURITY_RATE, SOCIAL_SECURITY_WAGE_BASE,
    MEDICARE_RATE, ADDITIONAL_MEDICARE_RATE,
    ADDITIONAL_MEDICARE_THRESHOLD_SINGLE, ADDITIONAL_MEDICARE_THRESHOLD_MARRIED,
    STATE_TAX_RATES, NO_INCOME_TAX_STATES,
    SE_TAX_RATE, SE_TAX_DEDUCTION,
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
            (d.calculate_per_period(gross)
             for d in self.income_source.posttax_deductions.filter(is_active=True)),
            Decimal('0')
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
            # Map W2Withholding filing_status to FEDERAL_BRACKETS keys
            # W2Withholding uses 'married' but brackets use 'married_jointly'
            status_map = {
                'single': 'single',
                'married': 'married_jointly',
                'head_of_household': 'head_of_household',
            }
            status = status_map.get(self.withholding.filing_status, 'single')
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


@dataclass
class TaxBreakdown:
    """Breakdown of taxes for a given income amount."""
    gross_income: Decimal
    federal_tax: Decimal
    social_security_tax: Decimal
    medicare_tax: Decimal
    state_tax: Decimal
    self_employment_tax: Decimal
    total_tax: Decimal
    net_income: Decimal
    effective_rate: Decimal


class ScenarioTaxCalculator:
    """
    Calculate taxes for scenario income changes.

    This calculator is used by the ScenarioEngine to compute tax implications
    for income additions, modifications, and removals. It does NOT use fallback
    estimates - if tax calculation cannot be performed, it raises an error.
    """

    def __init__(
        self,
        household,
        filing_status: str = 'single',
        state: Optional[str] = None,
    ):
        """
        Initialize the tax calculator.

        Args:
            household: The Household instance for state lookup
            filing_status: 'single', 'married_jointly', 'married_separately', or 'head_of_household'
            state: State code for state tax (e.g., 'CA', 'NY'). If None, uses household's state.
        """
        self.household = household
        self.filing_status = filing_status
        self.state = state or getattr(household, 'state_of_residence', None)

        # Map filing status to bracket keys
        self._bracket_key_map = {
            'single': 'single',
            'married': 'married_jointly',
            'married_jointly': 'married_jointly',
            'married_separately': 'married_separately',
            'head_of_household': 'head_of_household',
        }

    def calculate_annual_tax(
        self,
        annual_income: Decimal,
        income_type: str = 'w2',
        existing_annual_income: Decimal = Decimal('0'),
        pre_tax_deductions: Decimal = Decimal('0'),
    ) -> TaxBreakdown:
        """
        Calculate taxes on a given annual income amount.

        Args:
            annual_income: The gross annual income to calculate taxes on
            income_type: 'w2' for employment income, '1099' for self-employment
            existing_annual_income: Existing household income (for marginal calculations)
            pre_tax_deductions: Pre-tax deductions (401k, HSA, etc.) that reduce taxable income

        Returns:
            TaxBreakdown with all tax components
        """
        if annual_income <= 0:
            return TaxBreakdown(
                gross_income=annual_income,
                federal_tax=Decimal('0'),
                social_security_tax=Decimal('0'),
                medicare_tax=Decimal('0'),
                state_tax=Decimal('0'),
                self_employment_tax=Decimal('0'),
                total_tax=Decimal('0'),
                net_income=annual_income,
                effective_rate=Decimal('0'),
            )

        # Calculate self-employment tax first (for 1099 income)
        se_tax = Decimal('0')
        se_deduction = Decimal('0')
        if income_type in ('1099', 'self_employed', 'self-employed'):
            # SE tax is 15.3% on 92.35% of net self-employment earnings
            se_earnings = annual_income * Decimal('0.9235')
            se_tax = se_earnings * SE_TAX_RATE
            # Half of SE tax is deductible from income tax
            se_deduction = se_tax * SE_TAX_DEDUCTION

        # Calculate taxable income for federal/state
        taxable_income = annual_income - pre_tax_deductions - se_deduction
        taxable_income = max(taxable_income, Decimal('0'))

        # Apply standard deduction
        bracket_key = self._bracket_key_map.get(self.filing_status, 'single')
        standard_deduction = STANDARD_DEDUCTIONS.get(bracket_key, STANDARD_DEDUCTIONS['single'])
        taxable_after_deduction = max(taxable_income - standard_deduction, Decimal('0'))

        # Calculate federal tax using brackets
        federal_tax = self._calc_federal_tax(taxable_after_deduction, bracket_key)

        # Calculate FICA taxes
        if income_type in ('1099', 'self_employed', 'self-employed'):
            # Self-employed pay both employer and employee portions via SE tax
            # So we don't add additional FICA here
            ss_tax = Decimal('0')
            medicare_tax = Decimal('0')
        else:
            # W-2 employees pay employee portion of FICA
            ss_tax = self._calc_social_security(annual_income, existing_annual_income)
            medicare_tax = self._calc_medicare(annual_income, existing_annual_income)

        # Calculate state tax
        state_tax = self._calc_state_tax(taxable_income)

        total_tax = federal_tax + ss_tax + medicare_tax + state_tax + se_tax
        net_income = annual_income - total_tax
        effective_rate = total_tax / annual_income if annual_income > 0 else Decimal('0')

        return TaxBreakdown(
            gross_income=annual_income.quantize(Decimal('0.01')),
            federal_tax=federal_tax.quantize(Decimal('0.01')),
            social_security_tax=ss_tax.quantize(Decimal('0.01')),
            medicare_tax=medicare_tax.quantize(Decimal('0.01')),
            state_tax=state_tax.quantize(Decimal('0.01')),
            self_employment_tax=se_tax.quantize(Decimal('0.01')),
            total_tax=total_tax.quantize(Decimal('0.01')),
            net_income=net_income.quantize(Decimal('0.01')),
            effective_rate=effective_rate.quantize(Decimal('0.0001')),
        )

    def calculate_marginal_tax(
        self,
        income_change: Decimal,
        income_type: str = 'w2',
        existing_annual_income: Decimal = Decimal('0'),
    ) -> TaxBreakdown:
        """
        Calculate the marginal tax on an income change.

        This calculates the additional tax owed due to an income increase,
        or the tax savings from an income decrease.

        Args:
            income_change: The change in annual income (positive for increase, negative for decrease)
            income_type: 'w2' or '1099'
            existing_annual_income: Current household annual income before the change

        Returns:
            TaxBreakdown for the income change amount
        """
        if income_change == 0:
            return TaxBreakdown(
                gross_income=Decimal('0'),
                federal_tax=Decimal('0'),
                social_security_tax=Decimal('0'),
                medicare_tax=Decimal('0'),
                state_tax=Decimal('0'),
                self_employment_tax=Decimal('0'),
                total_tax=Decimal('0'),
                net_income=Decimal('0'),
                effective_rate=Decimal('0'),
            )

        # Calculate tax at existing income level
        existing_tax = self.calculate_annual_tax(
            existing_annual_income,
            income_type=income_type,
        )

        # Calculate tax at new income level
        new_income = existing_annual_income + income_change
        new_tax = self.calculate_annual_tax(
            new_income,
            income_type=income_type,
        )

        # The marginal tax is the difference
        marginal_federal = new_tax.federal_tax - existing_tax.federal_tax
        marginal_ss = new_tax.social_security_tax - existing_tax.social_security_tax
        marginal_medicare = new_tax.medicare_tax - existing_tax.medicare_tax
        marginal_state = new_tax.state_tax - existing_tax.state_tax
        marginal_se = new_tax.self_employment_tax - existing_tax.self_employment_tax
        marginal_total = new_tax.total_tax - existing_tax.total_tax

        net_change = income_change - marginal_total
        effective_rate = marginal_total / income_change if income_change != 0 else Decimal('0')

        return TaxBreakdown(
            gross_income=income_change.quantize(Decimal('0.01')),
            federal_tax=marginal_federal.quantize(Decimal('0.01')),
            social_security_tax=marginal_ss.quantize(Decimal('0.01')),
            medicare_tax=marginal_medicare.quantize(Decimal('0.01')),
            state_tax=marginal_state.quantize(Decimal('0.01')),
            self_employment_tax=marginal_se.quantize(Decimal('0.01')),
            total_tax=marginal_total.quantize(Decimal('0.01')),
            net_income=net_change.quantize(Decimal('0.01')),
            effective_rate=effective_rate.quantize(Decimal('0.0001')),
        )

    def calculate_monthly_tax(
        self,
        monthly_income: Decimal,
        income_type: str = 'w2',
        existing_annual_income: Decimal = Decimal('0'),
        pre_tax_deductions_monthly: Decimal = Decimal('0'),
    ) -> TaxBreakdown:
        """
        Calculate taxes on monthly income, returning monthly tax amounts.

        Args:
            monthly_income: Monthly gross income
            income_type: 'w2' or '1099'
            existing_annual_income: Existing household annual income
            pre_tax_deductions_monthly: Monthly pre-tax deductions

        Returns:
            TaxBreakdown with monthly amounts
        """
        annual_income = monthly_income * Decimal('12')
        annual_deductions = pre_tax_deductions_monthly * Decimal('12')

        annual_breakdown = self.calculate_annual_tax(
            annual_income,
            income_type=income_type,
            existing_annual_income=existing_annual_income,
            pre_tax_deductions=annual_deductions,
        )

        # Convert to monthly
        return TaxBreakdown(
            gross_income=(annual_breakdown.gross_income / 12).quantize(Decimal('0.01')),
            federal_tax=(annual_breakdown.federal_tax / 12).quantize(Decimal('0.01')),
            social_security_tax=(annual_breakdown.social_security_tax / 12).quantize(Decimal('0.01')),
            medicare_tax=(annual_breakdown.medicare_tax / 12).quantize(Decimal('0.01')),
            state_tax=(annual_breakdown.state_tax / 12).quantize(Decimal('0.01')),
            self_employment_tax=(annual_breakdown.self_employment_tax / 12).quantize(Decimal('0.01')),
            total_tax=(annual_breakdown.total_tax / 12).quantize(Decimal('0.01')),
            net_income=(annual_breakdown.net_income / 12).quantize(Decimal('0.01')),
            effective_rate=annual_breakdown.effective_rate,
        )

    def _calc_federal_tax(self, taxable_income: Decimal, bracket_key: str) -> Decimal:
        """Calculate federal income tax from brackets."""
        if taxable_income <= 0:
            return Decimal('0')

        brackets = FEDERAL_BRACKETS.get(bracket_key, FEDERAL_BRACKETS['single'])
        return self._calc_from_brackets(taxable_income, brackets)

    def _calc_from_brackets(self, income: Decimal, brackets: list) -> Decimal:
        """Calculate tax using progressive brackets."""
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

    def _calc_social_security(
        self,
        income: Decimal,
        existing_income: Decimal = Decimal('0'),
    ) -> Decimal:
        """Calculate Social Security tax, respecting wage base limit."""
        total_income = existing_income + income

        # SS tax only applies up to wage base
        if existing_income >= SOCIAL_SECURITY_WAGE_BASE:
            # Already over wage base, no additional SS tax
            return Decimal('0')

        # Calculate taxable portion
        taxable = min(income, SOCIAL_SECURITY_WAGE_BASE - existing_income)
        taxable = max(taxable, Decimal('0'))

        return taxable * SOCIAL_SECURITY_RATE

    def _calc_medicare(
        self,
        income: Decimal,
        existing_income: Decimal = Decimal('0'),
    ) -> Decimal:
        """Calculate Medicare tax including additional Medicare tax."""
        # Base Medicare tax
        base_medicare = income * MEDICARE_RATE

        # Additional Medicare tax on income over threshold
        threshold = ADDITIONAL_MEDICARE_THRESHOLD_SINGLE
        if self.filing_status in ('married', 'married_jointly'):
            threshold = ADDITIONAL_MEDICARE_THRESHOLD_MARRIED

        total_income = existing_income + income
        additional = Decimal('0')

        if total_income > threshold:
            # Calculate additional tax on income over threshold
            if existing_income >= threshold:
                # All of this income is over threshold
                additional = income * ADDITIONAL_MEDICARE_RATE
            else:
                # Only portion over threshold
                over_threshold = total_income - threshold
                additional = over_threshold * ADDITIONAL_MEDICARE_RATE

        return base_medicare + additional

    def _calc_state_tax(self, taxable_income: Decimal) -> Decimal:
        """Calculate state income tax."""
        if not self.state or self.state in NO_INCOME_TAX_STATES:
            return Decimal('0')

        rate = STATE_TAX_RATES.get(self.state, Decimal('0.05'))
        return taxable_income * rate

    def get_household_existing_income(self) -> Decimal:
        """
        Get the total existing annual income for the household.

        This is used for marginal tax calculations.
        """
        total = Decimal('0')
        for source in IncomeSource.objects.filter(household=self.household, is_active=True):
            total += source.gross_annual
        return total

    def get_filing_status_from_household(self) -> str:
        """
        Determine filing status from household data.

        Returns the filing status based on household members and their configuration.
        """
        # Check W2 withholding for filing status
        from apps.taxes.models import W2Withholding
        withholding = W2Withholding.objects.filter(
            income_source__household=self.household,
            income_source__is_active=True,
        ).first()

        if withholding:
            return withholding.filing_status

        # Default based on household members count
        member_count = self.household.members.count()
        if member_count > 1:
            return 'married_jointly'
        return 'single'
