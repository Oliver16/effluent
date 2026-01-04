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
