"""
Service for generating system-managed RecurringFlow records from canonical models.

This service generates cash-flow flows (net pay deposits, payroll deductions, expenses)
from canonical input models (IncomeSource, PreTaxDeduction, Account/LiabilityDetails).

Key design:
- All system-generated flows have is_system_generated=True
- Safe to regenerate (idempotent) - only touches system flows, not user-created flows
- Maintains linkage via system_source_model and system_source_id
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from django.db import transaction

from apps.core.models import Household
from apps.accounts.models import Account, AccountType, LiabilityDetails, SYSTEM_ACCOUNT_TYPES, INSTALLMENT_DEBT_TYPES
from apps.taxes.models import IncomeSource, PreTaxDeduction, W2Withholding
from apps.taxes.services import PaycheckCalculator
from .models import RecurringFlow, FlowType, Frequency, ExpenseCategory, IncomeCategory


# Current version of flow calculation logic - increment when logic changes
# v2: Added tax withholding as visible expense flow
# v3: Use PaycheckCalculator for accurate tax calculations instead of flat 25% estimate
# v4: Fix start_date to use first of month (aligns with baseline scenario start_date)
CALCULATION_VERSION = 4


def _get_default_start_date() -> date:
    """
    Get the default start date for system-generated flows.

    Uses the first of the current month to align with baseline scenario's
    start_date, ensuring flows are active when the baseline projection begins.
    """
    return date.today().replace(day=1)

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
            Exception: If flow generation fails. Transaction will rollback.
                      Error details are logged for debugging.
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            with transaction.atomic():
                # Track progress for better error reporting
                deleted_count = 0
                income_flows_created = 0
                liability_flows_created = 0

                # Delete existing system-generated flows
                logger.debug(f"Deleting system flows for household {self.household.id}")
                result = RecurringFlow.objects.filter(
                    household=self.household,
                    is_system_generated=True
                ).delete()
                deleted_count = result[0]  # Django returns (count, dict_of_details)
                logger.debug(f"Deleted {deleted_count} system flows")

                # Generate flows from income sources
                try:
                    logger.debug(f"Generating income flows for household {self.household.id}")
                    income_sources = IncomeSource.objects.filter(
                        household=self.household,
                        is_active=True
                    ).count()
                    self._generate_income_flows()
                    # Count created flows
                    income_flows_created = RecurringFlow.objects.filter(
                        household=self.household,
                        is_system_generated=True,
                        system_source_model='IncomeSource'
                    ).count()
                    logger.debug(
                        f"Generated {income_flows_created} income flows "
                        f"from {income_sources} income sources"
                    )
                except Exception as e:
                    logger.error(
                        f"Income flow generation failed for household {self.household.id}: {e}",
                        exc_info=True,
                        extra={
                            'household_id': str(self.household.id),
                            'stage': 'income_flows',
                            'deleted_count': deleted_count,
                        }
                    )
                    raise Exception(f"Income flow generation failed: {str(e)}") from e

                # Generate flows from liabilities (mortgage, loan payments)
                try:
                    logger.debug(f"Generating liability flows for household {self.household.id}")
                    self._generate_liability_payment_flows()
                    # Count created flows
                    liability_flows_created = RecurringFlow.objects.filter(
                        household=self.household,
                        is_system_generated=True,
                        system_source_model='Account'
                    ).count()
                    logger.debug(
                        f"Generated {liability_flows_created} liability payment flows"
                    )
                except Exception as e:
                    logger.error(
                        f"Liability flow generation failed for household {self.household.id}: {e}",
                        exc_info=True,
                        extra={
                            'household_id': str(self.household.id),
                            'stage': 'liability_flows',
                            'deleted_count': deleted_count,
                            'income_flows_created': income_flows_created,
                        }
                    )
                    raise Exception(f"Liability flow generation failed: {str(e)}") from e

                total_created = income_flows_created + liability_flows_created
                logger.info(
                    f"Flow generation complete for household {self.household.id}: "
                    f"deleted {deleted_count}, created {total_created} "
                    f"({income_flows_created} income + {liability_flows_created} liability)"
                )

        except Exception as e:
            # Top-level error handler - logs and re-raises
            logger.error(
                f"Flow generation failed for household {self.household.id}: {e}",
                exc_info=True,
                extra={
                    'household_id': str(self.household.id),
                    'error_type': type(e).__name__,
                }
            )
            # Re-raise to trigger task retry
            raise

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
        ).select_related('household_member', 'household').prefetch_related(
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
        # This ensures the control plane shows accurate surplus (income - expenses including taxes)
        if taxes_withheld > 0:
            RecurringFlow.objects.create(
                household=self.household,
                name=f"{income_source.name} - Taxes Withheld",
                flow_type=FlowType.EXPENSE,
                expense_category=ExpenseCategory.ESTIMATED_TAX,
                amount=taxes_withheld,
                frequency=flow_frequency,
                start_date=income_source.start_date or _get_default_start_date(),
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
                start_date=income_source.start_date or _get_default_start_date(),
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
            start_date=income_source.start_date or _get_default_start_date(),
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
                'start_date': income_source.start_date or _get_default_start_date(),
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
                'start_date': income_source.start_date or _get_default_start_date(),
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
                'start_date': income_source.start_date or _get_default_start_date(),
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
                'start_date': income_source.start_date or _get_default_start_date(),
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
        Calculate taxes withheld per pay period using the PaycheckCalculator.

        Uses the proper tax calculation logic including:
        - Federal income tax with brackets, standard deduction, W-4 adjustments
        - Social Security (6.2% up to wage base)
        - Medicare (1.45% + 0.9% additional over threshold)
        - State income tax
        """
        # Only calculate taxes for W-2 income
        if income_source.income_type not in ['w2', 'w2_hourly']:
            return Decimal('0')

        # Use PaycheckCalculator for accurate tax calculation
        calculator = PaycheckCalculator(income_source)
        breakdown = calculator.calculate_paycheck()

        # Return total taxes (federal + FICA + state)
        return breakdown.total_taxes

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

            # Skip accounts in forbearance (payments temporarily suspended)
            if details.in_forbearance:
                continue

            payment = details.minimum_payment

            # If no minimum payment specified, calculate from amortization for installment debt
            if (not payment or payment <= 0) and account.account_type in INSTALLMENT_DEBT_TYPES:
                payment = self._calculate_amortized_payment(account, details)

            # Skip if still no payment (e.g., revolving debt without min payment, or missing data)
            if not payment or payment <= 0:
                continue

            # Determine expense category based on account type
            expense_category = self._get_expense_category_for_liability(account.account_type)

            RecurringFlow.objects.create(
                household=self.household,
                name=f"{account.name} Payment",
                flow_type=FlowType.EXPENSE,
                expense_category=expense_category,
                amount=payment,
                frequency=Frequency.MONTHLY,
                start_date=_get_default_start_date(),
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

    def _calculate_amortized_payment(self, account: Account, details: LiabilityDetails) -> Decimal:
        """Calculate monthly payment using amortization formula.

        Uses the standard amortization formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
        where M = monthly payment, P = principal, r = monthly rate, n = term in months.
        """
        balance = account.current_balance
        rate = details.interest_rate or Decimal('0')
        term = details.term_months

        # Need balance and term to calculate
        if not balance or balance <= 0 or not term or term <= 0:
            return Decimal('0')

        if rate > 0:
            monthly_rate = rate / 12
            # Standard amortization formula
            payment = balance * (monthly_rate * (1 + monthly_rate) ** term) / ((1 + monthly_rate) ** term - 1)
        else:
            # No interest: simple division
            payment = balance / term

        return payment.quantize(Decimal('0.01'))

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

    Uses distributed locking to prevent concurrent regeneration for the same household.
    This protects all entry points: async tasks, sync API calls, onboarding, reality events.

    Returns:
        dict: Result with 'success': True or 'skipped': True if lock held
    """
    from apps.core.task_utils import get_household_lock, release_household_lock
    from apps.core.monitoring import MonitoringService, ErrorSeverity
    import logging
    import time

    logger = logging.getLogger(__name__)
    start_time = time.time()

    # Acquire distributed lock for this household's flow regeneration
    lock_acquired = get_household_lock(str(household_id), 'flow_generation', timeout=300)

    if not lock_acquired:
        logger.info(f"Flow generation already in progress for household {household_id}, skipping")
        return {'skipped': True, 'reason': 'lock_held'}

    try:
        household = Household.objects.get(id=household_id)
        generator = SystemFlowGenerator(household)
        generator.generate_all_flows()

        # Track performance
        duration_ms = (time.time() - start_time) * 1000
        MonitoringService.track_performance(
            'flow_generation',
            duration_ms,
            context={'household_id': str(household_id)},
            tags={'success': 'true'}
        )

        logger.info(f"Flow generation completed for household {household_id} in {duration_ms:.0f}ms")
        return {'success': True}

    except Exception as e:
        # Track error for monitoring
        duration_ms = (time.time() - start_time) * 1000
        MonitoringService.track_error(
            e,
            context={
                'household_id': str(household_id),
                'duration_ms': duration_ms,
            },
            severity=ErrorSeverity.HIGH,
            tags={'component': 'flows', 'operation': 'generation'}
        )
        raise

    finally:
        # Always release lock, even if generation fails
        release_household_lock(str(household_id), 'flow_generation')
