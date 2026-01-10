"""
Service for generating system-managed RecurringFlow records from canonical models.

This service generates cash-flow flows (net pay deposits, payroll deductions, expenses)
from canonical input models (IncomeSource, PreTaxDeduction, Account/LiabilityDetails).

Key design:
- All system-generated flows have is_system_generated=True
- Safe to regenerate (idempotent) - only touches system flows, not user-created flows
- Maintains linkage via system_source_model and system_source_id
"""

import logging
from datetime import date
from decimal import Decimal
from typing import Optional

from django.db import transaction

from apps.core.models import Household
from apps.accounts.models import Account, AccountType, LiabilityDetails, SYSTEM_ACCOUNT_TYPES
from apps.taxes.models import IncomeSource, PreTaxDeduction, W2Withholding
from .models import RecurringFlow, FlowType, Frequency, ExpenseCategory, IncomeCategory

logger = logging.getLogger(__name__)


class FlowGenerationError(Exception):
    """Raised when flow generation fails."""
    def __init__(self, message: str, household_id: str = None, partial_state: dict = None):
        super().__init__(message)
        self.household_id = household_id
        self.partial_state = partial_state or {}


# Current version of flow calculation logic - increment when logic changes
# v2: Added tax withholding as visible expense flow
CALCULATION_VERSION = 2

# Pay frequency to flow frequency mapping
PAY_FREQ_TO_FLOW_FREQ = {
    'weekly': Frequency.WEEKLY,
    'biweekly': Frequency.BIWEEKLY,
    'semimonthly': Frequency.SEMIMONTHLY,
    'monthly': Frequency.MONTHLY,
}

# Periods per year for each frequency
PERIODS_PER_YEAR = {
    Frequency.WEEKLY: 52,
    Frequency.BIWEEKLY: 26,
    Frequency.SEMIMONTHLY: 24,
    Frequency.MONTHLY: 12,
}

# Income type to income category mapping
INCOME_TYPE_TO_CATEGORY = {
    'w2': IncomeCategory.SALARY,
    'w2_hourly': IncomeCategory.HOURLY_WAGES,
    'self_employed': IncomeCategory.SELF_EMPLOYMENT,
    'rental': IncomeCategory.RENTAL_INCOME,
    'investment': IncomeCategory.DIVIDENDS,
    'retirement': IncomeCategory.PENSION,
    'social_security': IncomeCategory.SOCIAL_SECURITY,
    'other': IncomeCategory.OTHER_INCOME,
}


class SystemFlowGenerator:
    """Generates system-managed RecurringFlow records for a household."""

    def __init__(self, household: Household):
        self.household = household
        self._payroll_clearing_account: Optional[Account] = None
        self._primary_checking_account: Optional[Account] = None

    def generate_all_flows(self):
        """
        Generate all system flows for the household.

        This is idempotent - deletes only system-generated flows and recreates them.
        User-created flows are untouched.

        Raises:
            FlowGenerationError: If flow generation fails
        """
        logger.info(f"Starting flow generation for household {self.household.id}")

        try:
            with transaction.atomic():
                # Delete existing system-generated flows
                deleted_count, _ = RecurringFlow.objects.filter(
                    household=self.household,
                    is_system_generated=True
                ).delete()
                logger.debug(f"Deleted {deleted_count} existing system flows for household {self.household.id}")

                # Generate flows from income sources
                self._generate_income_flows()

                # Generate flows from liabilities (mortgage, loan payments)
                self._generate_liability_payment_flows()

                logger.info(f"Successfully generated flows for household {self.household.id}")

        except Exception as e:
            logger.error(
                f"Flow generation failed for household {self.household.id}: {e}",
                exc_info=True
            )
            # Transaction automatically rolls back on exception
            raise FlowGenerationError(
                f"Failed to generate flows: {str(e)}",
                household_id=str(self.household.id),
            ) from e

    def _get_or_create_payroll_clearing_account(self) -> Account:
        """Get or create the payroll clearing system account."""
        if self._payroll_clearing_account:
            return self._payroll_clearing_account

        self._payroll_clearing_account, _ = Account.objects.get_or_create(
            household=self.household,
            account_type=AccountType.PAYROLL_CLEARING,
            defaults={
                'name': 'Payroll Clearing',
                'institution': 'System',
                'is_active': True,
            }
        )
        return self._payroll_clearing_account

    def _get_primary_checking_account(self) -> Optional[Account]:
        """Get the household's primary checking account."""
        if self._primary_checking_account:
            return self._primary_checking_account

        self._primary_checking_account = Account.objects.filter(
            household=self.household,
            account_type=AccountType.CHECKING,
            is_active=True
        ).first()
        return self._primary_checking_account

    def _generate_income_flows(self):
        """Generate flows for all income sources."""
        income_sources = IncomeSource.objects.filter(
            household=self.household,
            is_active=True
        ).select_related('household_member').prefetch_related(
            'w2_withholding', 'pretax_deductions'
        )

        for income_source in income_sources:
            self._generate_flows_for_income_source(income_source)

    def _generate_flows_for_income_source(self, income_source: IncomeSource):
        """Generate all flows for a single income source."""
        # Get frequency and period count
        flow_frequency = PAY_FREQ_TO_FLOW_FREQ.get(
            income_source.pay_frequency, Frequency.BIWEEKLY
        )
        periods_per_year = PERIODS_PER_YEAR.get(flow_frequency, 26)

        # Calculate gross pay per period
        annual_gross = income_source.gross_annual
        if not annual_gross or annual_gross <= 0:
            return

        gross_per_period = annual_gross / Decimal(str(periods_per_year))

        # Get accounts
        payroll_clearing = self._get_or_create_payroll_clearing_account()
        checking_account = self._get_primary_checking_account()

        # Calculate deductions
        total_pretax_deductions = Decimal('0')
        pretax_deduction_flows = []

        # Process pre-tax deductions (401k, HSA, insurance premiums)
        for deduction in income_source.pretax_deductions.filter(is_active=True):
            deduction_amount = deduction.calculate_per_period(gross_per_period)
            total_pretax_deductions += deduction_amount

            # Generate transfer/expense flow for this deduction
            flow_data = self._create_deduction_flow_data(
                income_source, deduction, deduction_amount, flow_frequency, payroll_clearing
            )
            if flow_data:
                pretax_deduction_flows.append(flow_data)

        # Estimate taxes withheld (simplified - could be enhanced with full tax calc)
        taxes_withheld = self._estimate_taxes_withheld(income_source, gross_per_period)

        # Create tax expense flow so taxes are visible in the expense breakdown
        # This ensures the dashboard shows accurate surplus (income - expenses including taxes)
        if taxes_withheld > 0:
            RecurringFlow.objects.create(
                household=self.household,
                name=f"{income_source.name} - Taxes Withheld",
                flow_type=FlowType.EXPENSE,
                expense_category=ExpenseCategory.ESTIMATED_TAX,
                amount=taxes_withheld,
                frequency=flow_frequency,
                start_date=income_source.start_date or date.today(),
                end_date=income_source.end_date,
                household_member=income_source.household_member,
                income_source=income_source,
                is_active=True,
                is_baseline=True,
                is_system_generated=True,
                system_source_model='IncomeSource',
                system_source_id=income_source.id,
                system_flow_kind='tax_withholding',
                calculation_version=CALCULATION_VERSION,
            )

        # Calculate net pay
        net_pay = gross_per_period - total_pretax_deductions - taxes_withheld

        # Create net pay deposit flow (transfer from payroll clearing to checking)
        if net_pay > 0 and checking_account:
            RecurringFlow.objects.create(
                household=self.household,
                name=f"{income_source.name} - Net Pay",
                flow_type=FlowType.TRANSFER,
                amount=net_pay,
                frequency=flow_frequency,
                start_date=income_source.start_date or date.today(),
                end_date=income_source.end_date,
                from_account=payroll_clearing,
                to_account=checking_account,
                household_member=income_source.household_member,
                income_source=income_source,
                is_active=True,
                is_baseline=True,
                is_system_generated=True,
                system_source_model='IncomeSource',
                system_source_id=income_source.id,
                system_flow_kind='net_pay_deposit',
                calculation_version=CALCULATION_VERSION,
            )

        # Also create a gross income flow for tracking purposes
        income_category = INCOME_TYPE_TO_CATEGORY.get(
            income_source.income_type, IncomeCategory.OTHER_INCOME
        )
        RecurringFlow.objects.create(
            household=self.household,
            name=f"{income_source.name} - Gross Income",
            flow_type=FlowType.INCOME,
            income_category=income_category,
            amount=gross_per_period,
            frequency=flow_frequency,
            start_date=income_source.start_date or date.today(),
            end_date=income_source.end_date,
            household_member=income_source.household_member,
            income_source=income_source,
            is_active=True,
            is_baseline=True,
            is_system_generated=True,
            system_source_model='IncomeSource',
            system_source_id=income_source.id,
            system_flow_kind='gross_income',
            calculation_version=CALCULATION_VERSION,
        )

        # Create deduction flows
        for flow_data in pretax_deduction_flows:
            RecurringFlow.objects.create(**flow_data)

    def _create_deduction_flow_data(
        self,
        income_source: IncomeSource,
        deduction: PreTaxDeduction,
        amount: Decimal,
        frequency: str,
        payroll_clearing: Account
    ) -> Optional[dict]:
        """Create flow data for a pre-tax deduction."""
        if amount <= 0:
            return None

        # Determine flow type and target account based on deduction type
        deduction_type = deduction.deduction_type
        flow_kind = 'pretax_deduction'

        # 401k and HSA are transfers to asset accounts
        if deduction_type in ['traditional_401k', 'roth_401k', 'traditional_403b', 'tsp_traditional', 'tsp_roth']:
            flow_kind = 'pretax_401k'
            # Try to find or create the target 401k account
            target_account = self._get_or_create_retirement_account(
                income_source, deduction_type
            )
            return {
                'household': self.household,
                'name': f"{income_source.name} - {deduction.name or deduction.get_deduction_type_display()}",
                'flow_type': FlowType.TRANSFER,
                'amount': amount,
                'frequency': frequency,
                'start_date': income_source.start_date or date.today(),
                'end_date': income_source.end_date,
                'from_account': payroll_clearing,
                'to_account': target_account,
                'household_member': income_source.household_member,
                'income_source': income_source,
                'is_active': True,
                'is_baseline': True,
                'is_system_generated': True,
                'system_source_model': 'PreTaxDeduction',
                'system_source_id': deduction.id,
                'system_flow_kind': flow_kind,
                'calculation_version': CALCULATION_VERSION,
            }
        elif deduction_type == 'hsa':
            flow_kind = 'pretax_hsa'
            target_account = self._get_or_create_hsa_account(income_source)
            return {
                'household': self.household,
                'name': f"{income_source.name} - HSA Contribution",
                'flow_type': FlowType.TRANSFER,
                'amount': amount,
                'frequency': frequency,
                'start_date': income_source.start_date or date.today(),
                'end_date': income_source.end_date,
                'from_account': payroll_clearing,
                'to_account': target_account,
                'household_member': income_source.household_member,
                'income_source': income_source,
                'is_active': True,
                'is_baseline': True,
                'is_system_generated': True,
                'system_source_model': 'PreTaxDeduction',
                'system_source_id': deduction.id,
                'system_flow_kind': flow_kind,
                'calculation_version': CALCULATION_VERSION,
            }
        elif deduction_type in ['health_insurance', 'dental_insurance', 'vision_insurance', 'life_insurance']:
            # Insurance premiums are expenses from payroll clearing
            flow_kind = 'insurance_premium'
            expense_category_map = {
                'health_insurance': ExpenseCategory.HEALTH_INSURANCE,
                'dental_insurance': ExpenseCategory.DENTAL_INSURANCE,
                'vision_insurance': ExpenseCategory.VISION_INSURANCE,
                'life_insurance': ExpenseCategory.LIFE_INSURANCE,
            }
            return {
                'household': self.household,
                'name': f"{income_source.name} - {deduction.name or deduction.get_deduction_type_display()}",
                'flow_type': FlowType.EXPENSE,
                'expense_category': expense_category_map.get(deduction_type, ExpenseCategory.HEALTH_INSURANCE),
                'amount': amount,
                'frequency': frequency,
                'start_date': income_source.start_date or date.today(),
                'end_date': income_source.end_date,
                'from_account': payroll_clearing,
                'household_member': income_source.household_member,
                'income_source': income_source,
                'is_active': True,
                'is_baseline': True,
                'is_system_generated': True,
                'system_source_model': 'PreTaxDeduction',
                'system_source_id': deduction.id,
                'system_flow_kind': flow_kind,
                'calculation_version': CALCULATION_VERSION,
            }
        else:
            # Other pre-tax deductions (FSA, commuter, etc.) - treat as expenses
            return {
                'household': self.household,
                'name': f"{income_source.name} - {deduction.name or deduction.get_deduction_type_display()}",
                'flow_type': FlowType.EXPENSE,
                'expense_category': ExpenseCategory.MISCELLANEOUS,
                'amount': amount,
                'frequency': frequency,
                'start_date': income_source.start_date or date.today(),
                'end_date': income_source.end_date,
                'from_account': payroll_clearing,
                'household_member': income_source.household_member,
                'income_source': income_source,
                'is_active': True,
                'is_baseline': True,
                'is_system_generated': True,
                'system_source_model': 'PreTaxDeduction',
                'system_source_id': deduction.id,
                'system_flow_kind': flow_kind,
                'calculation_version': CALCULATION_VERSION,
            }

    def _get_or_create_retirement_account(
        self, income_source: IncomeSource, deduction_type: str
    ) -> Account:
        """Get or create a retirement account for deduction target."""
        # Map deduction type to account type
        account_type_map = {
            'traditional_401k': AccountType.TRADITIONAL_401K,
            'roth_401k': AccountType.ROTH_401K,
            'traditional_403b': AccountType.TRADITIONAL_401K,  # Use 401k type for 403b
            'tsp_traditional': AccountType.TSP,
            'tsp_roth': AccountType.TSP,
        }
        account_type = account_type_map.get(deduction_type, AccountType.TRADITIONAL_401K)

        # Try to find existing account
        existing = Account.objects.filter(
            household=self.household,
            account_type=account_type,
            is_active=True
        ).first()

        if existing:
            return existing

        # Create new account
        account_name = f"{income_source.household_member.name if income_source.household_member else 'Household'} {AccountType(account_type).label}"
        return Account.objects.create(
            household=self.household,
            name=account_name,
            account_type=account_type,
            employer_name=income_source.name,
            is_active=True,
        )

    def _get_or_create_hsa_account(self, income_source: IncomeSource) -> Account:
        """Get or create an HSA account."""
        existing = Account.objects.filter(
            household=self.household,
            account_type=AccountType.HSA,
            is_active=True
        ).first()

        if existing:
            return existing

        account_name = f"{income_source.household_member.name if income_source.household_member else 'Household'} HSA"
        return Account.objects.create(
            household=self.household,
            name=account_name,
            account_type=AccountType.HSA,
            is_active=True,
        )

    def _estimate_taxes_withheld(
        self, income_source: IncomeSource, gross_per_period: Decimal
    ) -> Decimal:
        """
        Estimate taxes withheld per pay period.

        This is a simplified estimate. For full accuracy, would need to implement
        complete federal and state withholding calculations.
        """
        # Check if W-2 income with withholding config
        if income_source.income_type not in ['w2', 'w2_hourly']:
            return Decimal('0')

        # Get withholding config if exists
        try:
            withholding = income_source.w2_withholding
        except W2Withholding.DoesNotExist:
            withholding = None

        # Simple estimate: ~25% effective tax rate for W-2 income
        # This could be enhanced with proper tax bracket calculations
        estimated_rate = Decimal('0.25')

        # Adjust for dependents if withholding config exists
        if withholding:
            dependent_reduction = (
                withholding.child_tax_credit_dependents * 2000 +
                withholding.other_dependents * 500
            )
            # Convert annual dependent credit to per-period reduction
            periods = PERIODS_PER_YEAR.get(
                PAY_FREQ_TO_FLOW_FREQ.get(income_source.pay_frequency, Frequency.BIWEEKLY),
                26
            )
            per_period_credit = Decimal(str(dependent_reduction)) / Decimal(str(periods))

            base_tax = gross_per_period * estimated_rate
            return max(Decimal('0'), base_tax - per_period_credit)

        return gross_per_period * estimated_rate

    def _generate_liability_payment_flows(self):
        """Generate expense flows for liability payments (mortgages, loans, etc.)."""
        # Get all liability accounts with payment details
        liabilities = Account.objects.filter(
            household=self.household,
            is_active=True
        ).exclude(
            account_type__in=SYSTEM_ACCOUNT_TYPES
        ).select_related('liability_details')

        checking_account = self._get_primary_checking_account()

        for account in liabilities:
            if not hasattr(account, 'liability_details') or not account.liability_details:
                continue

            details = account.liability_details
            if not details.minimum_payment or details.minimum_payment <= 0:
                continue

            # Determine expense category based on account type
            expense_category = self._get_expense_category_for_liability(account.account_type)

            RecurringFlow.objects.create(
                household=self.household,
                name=f"{account.name} Payment",
                flow_type=FlowType.EXPENSE,
                expense_category=expense_category,
                amount=details.minimum_payment,
                frequency=Frequency.MONTHLY,
                start_date=date.today(),
                from_account=checking_account,
                linked_account=account,
                is_active=True,
                is_baseline=True,
                is_system_generated=True,
                system_source_model='Account',
                system_source_id=account.id,
                system_flow_kind='debt_payment',
                calculation_version=CALCULATION_VERSION,
            )

    def _get_expense_category_for_liability(self, account_type: str) -> str:
        """Map account type to expense category."""
        category_map = {
            AccountType.PRIMARY_MORTGAGE: ExpenseCategory.MORTGAGE_PRINCIPAL,
            AccountType.RENTAL_MORTGAGE: ExpenseCategory.RENTAL_MORTGAGE,
            AccountType.SECOND_MORTGAGE: ExpenseCategory.MORTGAGE_PRINCIPAL,
            AccountType.CREDIT_CARD: ExpenseCategory.CREDIT_CARD_PAYMENT,
            AccountType.STORE_CARD: ExpenseCategory.CREDIT_CARD_PAYMENT,
            AccountType.AUTO_LOAN: ExpenseCategory.AUTO_LOAN,
            AccountType.STUDENT_LOAN_FEDERAL: ExpenseCategory.STUDENT_LOAN,
            AccountType.STUDENT_LOAN_PRIVATE: ExpenseCategory.STUDENT_LOAN,
            AccountType.PERSONAL_LOAN: ExpenseCategory.PERSONAL_LOAN,
            AccountType.HELOC: ExpenseCategory.HELOC_PAYMENT,
        }
        return category_map.get(account_type, ExpenseCategory.OTHER_DEBT)


def generate_system_flows_for_household(household_id) -> dict:
    """
    Generate all system flows for a household.

    This is the main entry point for flow generation.
    Safe to call repeatedly - idempotent.

    Args:
        household_id: UUID of the household

    Returns:
        Dict with generation status

    Raises:
        Household.DoesNotExist: If household not found
        FlowGenerationError: If generation fails
    """
    try:
        household = Household.objects.get(id=household_id)
    except Household.DoesNotExist:
        logger.error(f"Household {household_id} not found for flow generation")
        raise

    generator = SystemFlowGenerator(household)
    generator.generate_all_flows()

    return {
        'status': 'success',
        'household_id': str(household_id),
    }
