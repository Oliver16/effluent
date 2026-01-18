from dataclasses import dataclass, field
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import transaction

from apps.core.models import Household
from apps.accounts.models import Account, ASSET_TYPES, LIABILITY_TYPES, LIQUID_TYPES, RETIREMENT_TYPES
from apps.flows.models import RecurringFlow, FlowType, Frequency, FREQUENCY_TO_MONTHLY
from apps.taxes.models import PreTaxDeduction, IncomeSource
from apps.taxes.services import ScenarioTaxCalculator
from .models import Scenario, ScenarioChange, ScenarioProjection, ChangeType


@dataclass
class AssetInfo:
    """Information about an asset account."""
    balance: Decimal
    account_type: str
    is_liquid: bool = False
    is_retirement: bool = False
    name: str = ""


@dataclass
class LiabilityInfo:
    """Information about a liability account."""
    balance: Decimal
    account_type: str
    rate: Decimal = Decimal('0')
    payment: Decimal = Decimal('0')
    term_months: int = 0
    name: str = ""


@dataclass
class EmployerMatchInfo:
    """Employer 401k match configuration."""
    match_percentage: Decimal = Decimal('0')  # e.g., 0.50 = 50% match
    limit_percentage: Decimal = Decimal('0')  # e.g., 0.06 = match up to 6% of salary
    limit_annual: Decimal | None = None  # annual cap on match


@dataclass
class MonthlyState:
    """State at a point in time."""
    date: date
    month: int
    assets: dict  # account_id -> AssetInfo
    liabilities: dict  # account_id -> LiabilityInfo
    incomes: list  # active flows (gross income)
    expenses: list  # active flows (includes taxes)
    transfers: list = field(default_factory=list)  # transfer flows (move money between accounts)
    contribution_rates: dict = field(default_factory=dict)  # 401k, HSA percentages
    applied_changes: set = field(default_factory=set)  # Track one-time changes applied
    employer_match: EmployerMatchInfo = field(default_factory=EmployerMatchInfo)  # Employer 401k match config
    employer_match_ytd: Decimal = field(default_factory=lambda: Decimal('0'))  # Track YTD employer match for annual limits
    # Deferred flows: flows with future start dates that activate during the projection
    deferred_incomes: list = field(default_factory=list)
    deferred_expenses: list = field(default_factory=list)
    income_tax_map: dict = field(default_factory=dict)  # income_id -> tax_expense_id mapping

    @property
    def total_assets(self) -> Decimal:
        return sum(a.balance for a in self.assets.values()) if self.assets else Decimal('0')

    @property
    def total_liabilities(self) -> Decimal:
        return sum(l.balance for l in self.liabilities.values()) if self.liabilities else Decimal('0')

    @property
    def liquid_assets(self) -> Decimal:
        return sum(a.balance for a in self.assets.values() if a.is_liquid) if self.assets else Decimal('0')

    @property
    def retirement_assets(self) -> Decimal:
        return sum(a.balance for a in self.assets.values() if a.is_retirement) if self.assets else Decimal('0')

    @property
    def net_worth(self) -> Decimal:
        return self.total_assets - self.total_liabilities

    @property
    def total_income(self) -> Decimal:
        return sum(f['monthly'] for f in self.incomes) if self.incomes else Decimal('0')

    @property
    def total_expenses(self) -> Decimal:
        return sum(f['monthly'] for f in self.expenses) if self.expenses else Decimal('0')

    @property
    def net_cash_flow(self) -> Decimal:
        return self.total_income - self.total_expenses

    def get_asset_breakdown(self) -> dict:
        """Return assets grouped by type."""
        breakdown = {}
        for aid, asset in self.assets.items():
            key = asset.account_type or 'other'
            if key not in breakdown:
                breakdown[key] = Decimal('0')
            breakdown[key] += asset.balance
        return {k: str(v.quantize(Decimal('0.01'))) for k, v in breakdown.items()}

    def get_liability_breakdown(self) -> dict:
        """Return liabilities grouped by type."""
        breakdown = {}
        for lid, liab in self.liabilities.items():
            key = liab.account_type or 'other'
            if key not in breakdown:
                breakdown[key] = Decimal('0')
            breakdown[key] += liab.balance
        return {k: str(v.quantize(Decimal('0.01'))) for k, v in breakdown.items()}


class ScenarioEngine:
    """Projects financial state over time with scenario changes."""

    def __init__(self, scenario: Scenario):
        self.scenario = scenario
        self.household = scenario.household
        # Initialize tax calculator for income tax calculations
        self.tax_calculator = ScenarioTaxCalculator(
            household=self.household,
            filing_status=self._get_filing_status(),
            state=getattr(self.household, 'state_of_residence', None),
        )

    def _get_filing_status(self) -> str:
        """Get filing status from household W2 withholding or default."""
        from apps.taxes.models import W2Withholding
        withholding = W2Withholding.objects.filter(
            income_source__household=self.household,
            income_source__is_active=True,
        ).first()
        if withholding:
            return withholding.filing_status
        # Default based on household member count
        member_count = self.household.members.count()
        if member_count > 1:
            return 'married_jointly'
        return 'single'

    def _get_all_changes(self) -> list[ScenarioChange]:
        """
        Get all changes including inherited from parent scenarios.

        Override semantics for "SET" type changes:
        - For change types that SET values (MODIFY_401K, SET_SAVINGS_TRANSFER,
          OVERRIDE_INFLATION, etc.), child scenario changes override parent
          changes of the same type that affect the same resource.
        - For "ADD/ADJUST" type changes, both parent and child apply cumulatively.
        """
        # Change types where child should override parent (not accumulate)
        SET_CHANGE_TYPES = {
            ChangeType.MODIFY_401K,
            ChangeType.SET_SAVINGS_TRANSFER,
            ChangeType.OVERRIDE_ASSUMPTIONS,
            ChangeType.OVERRIDE_INFLATION,
            ChangeType.OVERRIDE_INVESTMENT_RETURN,
            ChangeType.OVERRIDE_SALARY_GROWTH,
            ChangeType.MODIFY_WITHHOLDING,
        }

        # Collect this scenario's changes first (they take precedence)
        scenario_changes = list(self.scenario.changes.filter(is_enabled=True))

        # Track which SET-type changes this scenario has by type and optional source
        scenario_override_keys = set()
        for change in scenario_changes:
            if change.change_type in SET_CHANGE_TYPES:
                # Key by change_type and source_flow_id if present
                key = (change.change_type, change.source_flow_id)
                scenario_override_keys.add(key)

        # Walk up the parent chain to collect inherited changes
        parent_changes = []
        parent = self.scenario.parent_scenario
        while parent:
            for change in parent.changes.filter(is_enabled=True):
                # For SET-type changes, skip if child has an override
                if change.change_type in SET_CHANGE_TYPES:
                    key = (change.change_type, change.source_flow_id)
                    if key in scenario_override_keys:
                        continue  # Child overrides this
                parent_changes.append(change)
            parent = parent.parent_scenario

        # Combine parent and scenario changes
        changes = parent_changes + scenario_changes

        # Sort by date
        changes.sort(key=lambda c: c.effective_date)
        return changes

    def compute_projection(
        self,
        as_of_date: date | None = None,
        in_memory: bool = False
    ) -> list[ScenarioProjection]:
        """
        Compute full projection, optionally saving to database.

        Args:
            as_of_date: Optional date to use for initializing state.
                       When provided (for pinned baselines), account balances
                       and flows are taken as of this date.
                       When None, uses the latest available data.
            in_memory: If True, compute projections without DB writes.
                       TASK-14 requirement for solver trials.

        Returns:
            List of ScenarioProjection objects (unsaved if in_memory=True)
        """
        # Initialize from current state (or as_of_date if pinned)
        state = self._initialize_state(as_of_date=as_of_date)

        # Get scenario changes sorted by date, including inherited changes from parent
        changes = self._get_all_changes()

        projections = []

        for month in range(self.scenario.projection_months):
            current_date = self.scenario.start_date + relativedelta(months=month)

            # Activate deferred flows whose start date has been reached
            state = self._activate_deferred_flows(state, current_date)

            # Check for flows that have ended and remove them
            state = self._remove_ended_flows(state, current_date)

            # Apply any changes that take effect this month
            for change in changes:
                if change.effective_date <= current_date:
                    if not change.end_date or change.end_date >= current_date:
                        state = self._apply_change(state, change, current_date)

            # Apply growth rates
            state = self._apply_growth(state, month)

            # Compute this month's projection
            proj = self._create_projection(state, current_date, month)
            projections.append(proj)

            # Advance state (apply cash flow to liquid assets)
            state = self._advance_month(state)

        # Only save to DB if not in_memory mode
        if not in_memory:
            with transaction.atomic():
                ScenarioProjection.objects.filter(scenario=self.scenario).delete()
                ScenarioProjection.objects.bulk_create(projections)

        return projections

    def compute_projection_to_memory(self, as_of_date: date | None = None) -> list[ScenarioProjection]:
        """
        Compute projection without DB writes.

        Convenience wrapper for compute_projection(in_memory=True).
        TASK-14 requirement for solver trials to avoid DB bloat.

        Returns:
            List of unsaved ScenarioProjection objects
        """
        return self.compute_projection(as_of_date=as_of_date, in_memory=True)

    def _initialize_state(self, as_of_date: date | None = None) -> MonthlyState:
        """
        Initialize state from household data.

        Args:
            as_of_date: Optional date to use for initializing balances.
                       When provided, uses snapshots closest to this date.
                       When None, uses the latest available snapshots.

        Returns:
            MonthlyState initialized from household data
        """
        assets = {}
        liabilities = {}

        # Determine the reference date for checking active flows
        # Use the scenario's start_date to determine which flows are active at the
        # beginning of the projection. This ensures flows with future effective dates
        # (e.g., life events set for November) are not included in the initial state
        # but instead take effect at the correct point in the projection.
        # For pinned baselines, use the specified as_of_date.
        reference_date = as_of_date or self.scenario.start_date

        for acct in Account.objects.filter(household=self.household, is_active=True):
            # Get appropriate snapshot based on as_of_date
            if as_of_date:
                # For pinned baselines, get snapshot closest to as_of_date
                snap = acct.snapshots.filter(
                    as_of_date__lte=as_of_date
                ).order_by('-as_of_date').first()
            else:
                snap = acct.latest_snapshot

            if snap:
                if acct.is_asset:
                    assets[str(acct.id)] = AssetInfo(
                        balance=snap.market_value or snap.balance,
                        account_type=acct.account_type,
                        is_liquid=acct.is_liquid,
                        is_retirement=acct.account_type in RETIREMENT_TYPES,
                        name=acct.name,
                    )
                else:
                    # Try to get rate from liability details
                    rate = Decimal('0')
                    payment = Decimal('0')
                    term = 0
                    if hasattr(acct, 'liability_details') and acct.liability_details:
                        details = acct.liability_details
                        rate = details.interest_rate or Decimal('0')
                        payment = details.minimum_payment or Decimal('0')
                        term = details.term_months or 0

                    liabilities[str(acct.id)] = LiabilityInfo(
                        balance=abs(snap.balance),
                        account_type=acct.account_type,
                        rate=rate,
                        payment=payment,
                        term_months=term,
                        name=acct.name,
                    )

        incomes = []
        expenses = []
        transfers = []
        deferred_incomes = []
        deferred_expenses = []
        income_tax_map = {}  # Maps income_id -> tax_expense_id

        # Calculate the end of the projection period for collecting deferred flows
        projection_end = reference_date + relativedelta(months=self.scenario.projection_months)

        # Include income from IncomeSource objects (primary source of income data)
        # Calculate taxes for each income source
        cumulative_income = Decimal('0')
        for source in IncomeSource.objects.filter(household=self.household, is_active=True):
            # Skip sources that have already ended before reference date
            if source.end_date and source.end_date < reference_date:
                continue

            income_id = f'income_source_{source.id}'
            income_type = '1099' if source.income_type in ('self_employed', '1099') else 'w2'
            monthly_gross = source.gross_annual / Decimal('12')

            income_data = {
                'id': income_id,
                'name': source.name,
                'category': 'salary' if source.income_type in ('w2', 'w2_hourly') else source.income_type,
                'amount': source.gross_annual,
                'frequency': 'annually',
                'monthly': monthly_gross,
                'linked_account': None,
                'start_date': source.start_date,
                'end_date': source.end_date,
                '_income_type': income_type,  # Track for tax purposes
            }

            # Check if source starts in the future (deferred)
            if source.start_date and source.start_date > reference_date:
                # Only defer if within projection period
                if source.start_date <= projection_end:
                    deferred_incomes.append(income_data)
                continue

            incomes.append(income_data)

            # Calculate tax on this income using marginal calculation
            tax_breakdown = self.tax_calculator.calculate_marginal_tax(
                income_change=source.gross_annual,
                income_type=income_type,
                existing_annual_income=cumulative_income,
            )
            cumulative_income += source.gross_annual

            # Add tax expense for this income
            tax_expense_id = f'tax_{income_id}'
            monthly_tax = tax_breakdown.total_tax / Decimal('12')
            expenses.append({
                'id': tax_expense_id,
                'name': f'{source.name} - Taxes',
                'category': 'income_tax',
                'amount': tax_breakdown.total_tax,
                'frequency': 'annually',
                'monthly': monthly_tax.quantize(Decimal('0.01')),
                '_is_tax_expense': True,
                '_source_income_id': income_id,
            })
            income_tax_map[income_id] = tax_expense_id

        # Also include baseline flows for projection (scenario-specific flows are added via changes)
        # Use is_active_on() method to check if flow is active on the reference date
        #
        # IMPORTANT: Skip income flows from RecurringFlow if we already have IncomeSources
        # to avoid double-counting. IncomeSources are the primary/authoritative source of
        # income data; RecurringFlow income entries are legacy or supplementary.
        has_income_sources = len(incomes) > 0 or len(deferred_incomes) > 0

        # Query active flows - use is_active=True to match metrics service behavior
        for flow in RecurringFlow.objects.filter(household=self.household, is_active=True):
            # Skip flows that have already ended
            if flow.end_date and flow.end_date < reference_date:
                continue

            f = {
                'id': str(flow.id),
                'name': flow.name,
                'category': flow.category,
                'amount': flow.amount,
                'frequency': flow.frequency,
                'monthly': flow.monthly_amount,
                'linked_account': str(flow.linked_account_id) if flow.linked_account_id else None,
                'start_date': flow.start_date,
                'end_date': flow.end_date,
            }

            # Check if flow starts in the future (deferred)
            if flow.start_date > reference_date:
                # Only defer if within projection period
                if flow.start_date <= projection_end:
                    if flow.flow_type == FlowType.INCOME:
                        # Skip employment income if we have income sources
                        if has_income_sources:
                            employment_categories = {'salary', 'hourly_wages', 'w2', 'w2_hourly', 'bonus', 'commission'}
                            if flow.category in employment_categories:
                                continue
                        deferred_incomes.append(f)
                    elif flow.flow_type == FlowType.EXPENSE:
                        deferred_expenses.append(f)
                    # Note: transfers are not deferred for simplicity
                continue

            # Flow is active now - add to appropriate list
            if flow.flow_type == FlowType.INCOME:
                # Only include income flows from RecurringFlow if there are no IncomeSources
                # This prevents double-counting salary/wages income
                # Exception: include if category is not typical employment income (e.g., rental, passive)
                if has_income_sources:
                    # Skip employment-type income categories (already covered by IncomeSources)
                    employment_categories = {'salary', 'hourly_wages', 'w2', 'w2_hourly', 'bonus', 'commission'}
                    if flow.category in employment_categories:
                        continue

                # Determine income type for tax calculation
                se_categories = {'self_employed', '1099', 'business_income', 'freelance'}
                income_type = '1099' if flow.category in se_categories else 'w2'
                f['_income_type'] = income_type

                incomes.append(f)

                # Calculate and add tax expense for this income flow
                annual_income = flow.monthly_amount * Decimal('12')
                tax_breakdown = self.tax_calculator.calculate_marginal_tax(
                    income_change=annual_income,
                    income_type=income_type,
                    existing_annual_income=cumulative_income,
                )
                cumulative_income += annual_income

                tax_expense_id = f'tax_{flow.id}'
                monthly_tax = tax_breakdown.total_tax / Decimal('12')
                expenses.append({
                    'id': tax_expense_id,
                    'name': f'{flow.name} - Taxes',
                    'category': 'income_tax',
                    'amount': tax_breakdown.total_tax,
                    'frequency': 'annually',
                    'monthly': monthly_tax.quantize(Decimal('0.01')),
                    '_is_tax_expense': True,
                    '_source_income_id': str(flow.id),
                })
                income_tax_map[str(flow.id)] = tax_expense_id
            elif flow.flow_type == FlowType.EXPENSE:
                expenses.append(f)
            elif flow.flow_type == FlowType.TRANSFER:
                transfers.append(f)

        # Initialize contribution rates from pre-tax deductions
        contribution_rates = {'401k': Decimal('0'), 'hsa': Decimal('0')}
        employer_match = EmployerMatchInfo()

        # Safely query deductions - query may fail if no income sources exist
        deductions = PreTaxDeduction.objects.filter(
            income_source__household=self.household,
            is_active=True
        )
        for deduction in deductions:
            if deduction.deduction_type in ('traditional_401k', 'roth_401k'):
                if deduction.amount_type == 'percentage':
                    contribution_rates['401k'] = deduction.amount
                # Load employer match configuration
                if deduction.employer_match_percentage:
                    employer_match = EmployerMatchInfo(
                        match_percentage=deduction.employer_match_percentage,
                        limit_percentage=deduction.employer_match_limit_percentage or Decimal('0'),
                        limit_annual=deduction.employer_match_limit_annual,
                    )
            elif deduction.deduction_type == 'hsa':
                if deduction.amount_type == 'percentage':
                    contribution_rates['hsa'] = deduction.amount

        # Calculate initial employer_match_ytd for mid-year scenario starts
        # If scenario starts in June, the household may have already received 6 months of employer match
        initial_employer_match_ytd = Decimal('0')
        if employer_match.match_percentage > 0 and employer_match.limit_annual:
            # Calculate how many complete months have passed in the current calendar year
            months_elapsed_in_year = self.scenario.start_date.month - 1

            if months_elapsed_in_year > 0:
                # Estimate monthly employer match based on current income and contribution rates
                gross_monthly_salary = sum(
                    inc['monthly'] for inc in incomes
                    if inc['category'] in ('salary', 'hourly_wages', 'w2', 'w2_hourly')
                )

                if gross_monthly_salary > 0:
                    contribution_rate = contribution_rates.get('401k', Decimal('0'))
                    employee_contribution = gross_monthly_salary * contribution_rate

                    # Calculate matchable contribution
                    if employer_match.limit_percentage > 0:
                        max_matchable = gross_monthly_salary * employer_match.limit_percentage
                        matchable_contribution = min(employee_contribution, max_matchable)
                    else:
                        matchable_contribution = employee_contribution

                    # Calculate estimated monthly match
                    estimated_monthly_match = matchable_contribution * employer_match.match_percentage

                    # Estimate YTD match (assuming constant income/contribution year-to-date)
                    estimated_ytd = estimated_monthly_match * Decimal(str(months_elapsed_in_year))

                    # Cap at annual limit
                    initial_employer_match_ytd = min(estimated_ytd, employer_match.limit_annual)

        return MonthlyState(
            date=self.scenario.start_date,
            month=0,
            assets=assets,
            liabilities=liabilities,
            incomes=incomes,
            expenses=expenses,
            transfers=transfers,
            contribution_rates=contribution_rates,
            applied_changes=set(),
            employer_match=employer_match,
            employer_match_ytd=initial_employer_match_ytd,
            deferred_incomes=deferred_incomes,
            deferred_expenses=deferred_expenses,
            income_tax_map=income_tax_map,
        )

    def _activate_deferred_flows(self, state: MonthlyState, current_date: date) -> MonthlyState:
        """
        Activate deferred flows whose start date has been reached.

        Moves flows from deferred_incomes/deferred_expenses to active incomes/expenses
        when the projection date reaches or passes their start_date.
        Also calculates taxes for newly activated income flows.
        """
        # Activate deferred incomes
        still_deferred_incomes = []
        for flow in state.deferred_incomes:
            start_date = flow.get('start_date')
            if start_date and start_date <= current_date:
                # Flow is now active - move to active incomes
                state.incomes.append(flow)

                # Calculate and add tax expense for this newly activated income
                income_id = flow['id']
                income_type = flow.get('_income_type', 'w2')
                annual_income = flow['monthly'] * Decimal('12')

                existing_annual_income = self._get_state_annual_income(state, exclude_id=income_id)
                tax_breakdown = self.tax_calculator.calculate_marginal_tax(
                    income_change=annual_income,
                    income_type=income_type,
                    existing_annual_income=existing_annual_income,
                )

                tax_expense_id = f'tax_{income_id}'
                monthly_tax = tax_breakdown.total_tax / Decimal('12')
                state.expenses.append({
                    'id': tax_expense_id,
                    'name': f'{flow["name"]} - Taxes',
                    'category': 'income_tax',
                    'amount': tax_breakdown.total_tax,
                    'frequency': 'annually',
                    'monthly': monthly_tax.quantize(Decimal('0.01')),
                    '_is_tax_expense': True,
                    '_source_income_id': income_id,
                })
                state.income_tax_map[income_id] = tax_expense_id
            else:
                # Still deferred
                still_deferred_incomes.append(flow)
        state.deferred_incomes = still_deferred_incomes

        # Activate deferred expenses
        still_deferred_expenses = []
        for flow in state.deferred_expenses:
            start_date = flow.get('start_date')
            if start_date and start_date <= current_date:
                # Flow is now active - move to active expenses
                state.expenses.append(flow)
            else:
                # Still deferred
                still_deferred_expenses.append(flow)
        state.deferred_expenses = still_deferred_expenses

        return state

    def _remove_ended_flows(self, state: MonthlyState, current_date: date) -> MonthlyState:
        """
        Remove flows that have ended as of the current date.

        Checks end_date on active flows and removes any that have ended.
        Also removes associated tax expenses when income ends.
        """
        # Find incomes that are ending and remove their tax expenses
        ended_income_ids = set()
        for flow in state.incomes:
            if flow.get('end_date') and flow['end_date'] < current_date:
                ended_income_ids.add(flow['id'])
                # Remove from income_tax_map
                if flow['id'] in state.income_tax_map:
                    del state.income_tax_map[flow['id']]

        # Remove ended incomes
        state.incomes = [
            flow for flow in state.incomes
            if not flow.get('end_date') or flow['end_date'] >= current_date
        ]

        # Remove ended expenses (including tax expenses for ended incomes)
        state.expenses = [
            flow for flow in state.expenses
            if (not flow.get('end_date') or flow['end_date'] >= current_date) and
               flow.get('_source_income_id') not in ended_income_ids
        ]

        return state

    def _apply_change(self, state: MonthlyState, change: ScenarioChange, current_date: date) -> MonthlyState:
        """
        Apply a scenario change to the state.

        This is the core logic for modifying the financial state based on scenario changes.
        Handles 40+ different change types including:
        - Income/expense additions, modifications, and removals
        - Debt additions, payoffs, and refinancing
        - Asset additions and sales
        - Tax withholding and deduction modifications
        - Savings transfers and contribution rate changes
        - Life event changes (job changes, retirement, etc.)

        Args:
            state: Current monthly state to modify
            change: ScenarioChange object containing the change type and parameters
            current_date: Current date in the projection (used for effective date checking)

        Returns:
            Modified MonthlyState with the change applied

        Notes:
            - One-time changes (ADD_INCOME, ADD_DEBT, etc.) are tracked to prevent duplicate application
            - Many changes trigger tax recalculation by calling _recalculate_all_taxes()
            - Income/expense changes update state.incomes/expenses lists
            - Debt/asset changes update state.liabilities/assets dictionaries
            - Some changes (MODIFY_401K, MODIFY_HSA) update contribution_rates
        """
        params = change.parameters
        change_key = str(change.id)

        # Check if this is a one-time change that was already applied
        # These change types should only be applied once, not every month
        one_time_types = {
            ChangeType.LUMP_SUM_INCOME,
            ChangeType.LUMP_SUM_EXPENSE,
            ChangeType.ADD_INCOME,
            ChangeType.ADD_EXPENSE,
            ChangeType.REMOVE_INCOME,
            ChangeType.REMOVE_EXPENSE,
            ChangeType.ADD_DEBT,
            ChangeType.ADD_ASSET,
            ChangeType.SELL_ASSET,
        }
        if change.change_type in one_time_types:
            if change_key in state.applied_changes:
                return state
            state.applied_changes.add(change_key)

        if change.change_type == ChangeType.ADD_INCOME:
            income_id = f'scenario_{change.id}'
            category = params.get('category', 'other_income')
            amount = Decimal(str(params.get('amount', 0)))
            frequency = params.get('frequency', 'monthly')
            monthly = self._to_monthly(amount, frequency)

            # Determine income type for tax calculation
            se_categories = {'self_employed', '1099', 'business_income', 'freelance', 'rental'}
            income_type = params.get('tax_treatment', '1099' if category in se_categories else 'w2')

            state.incomes.append({
                'id': income_id,
                'name': change.name,
                'category': category,
                'amount': amount,
                'frequency': frequency,
                'monthly': monthly,
                '_income_type': income_type,
            })

            # Calculate tax on this new income
            existing_annual_income = self._get_state_annual_income(state, exclude_id=income_id)
            annual_income = monthly * Decimal('12')
            tax_breakdown = self.tax_calculator.calculate_marginal_tax(
                income_change=annual_income,
                income_type=income_type,
                existing_annual_income=existing_annual_income,
            )

            # Add tax expense
            tax_expense_id = f'tax_{income_id}'
            monthly_tax = tax_breakdown.total_tax / Decimal('12')
            state.expenses.append({
                'id': tax_expense_id,
                'name': f'{change.name} - Taxes',
                'category': 'income_tax',
                'amount': tax_breakdown.total_tax,
                'frequency': 'annually',
                'monthly': monthly_tax.quantize(Decimal('0.01')),
                '_is_tax_expense': True,
                '_source_income_id': income_id,
            })
            state.income_tax_map[income_id] = tax_expense_id

        elif change.change_type == ChangeType.MODIFY_INCOME:
            # Modify existing income flow and recalculate taxes
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            for income in state.incomes:
                if income['id'] == flow_id:
                    old_monthly = income['monthly']

                    if 'amount' in params:
                        income['amount'] = Decimal(str(params['amount']))
                        freq = params.get('frequency', income['frequency'])
                        income['frequency'] = freq
                        income['monthly'] = self._to_monthly(params['amount'], freq)
                    if 'category' in params:
                        income['category'] = params['category']

                    new_monthly = income['monthly']

                    # Recalculate tax if income amount changed
                    if new_monthly != old_monthly:
                        income_type = income.get('_income_type', 'w2')
                        if params.get('tax_treatment'):
                            income_type = params['tax_treatment']
                            income['_income_type'] = income_type

                        # Calculate new tax based on this income
                        existing_annual_income = self._get_state_annual_income(state, exclude_id=flow_id)
                        annual_income = new_monthly * Decimal('12')
                        tax_breakdown = self.tax_calculator.calculate_marginal_tax(
                            income_change=annual_income,
                            income_type=income_type,
                            existing_annual_income=existing_annual_income,
                        )

                        # Update or create tax expense
                        tax_expense_id = state.income_tax_map.get(flow_id)
                        monthly_tax = tax_breakdown.total_tax / Decimal('12')

                        if tax_expense_id:
                            # Update existing tax expense
                            for expense in state.expenses:
                                if expense['id'] == tax_expense_id:
                                    expense['amount'] = tax_breakdown.total_tax
                                    expense['monthly'] = monthly_tax.quantize(Decimal('0.01'))
                                    break
                        else:
                            # Create new tax expense
                            tax_expense_id = f'tax_{flow_id}'
                            state.expenses.append({
                                'id': tax_expense_id,
                                'name': f'{income["name"]} - Taxes',
                                'category': 'income_tax',
                                'amount': tax_breakdown.total_tax,
                                'frequency': 'annually',
                                'monthly': monthly_tax.quantize(Decimal('0.01')),
                                '_is_tax_expense': True,
                                '_source_income_id': flow_id,
                            })
                            state.income_tax_map[flow_id] = tax_expense_id
                    break

        elif change.change_type == ChangeType.REMOVE_INCOME:
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            state.incomes = [i for i in state.incomes if i['id'] != flow_id]

            # Also remove the associated tax expense
            tax_expense_id = state.income_tax_map.get(flow_id)
            if tax_expense_id:
                state.expenses = [e for e in state.expenses if e['id'] != tax_expense_id]
                del state.income_tax_map[flow_id]
            else:
                # Fallback: remove any tax expense linked to this income
                state.expenses = [
                    e for e in state.expenses
                    if e.get('_source_income_id') != flow_id
                ]

        elif change.change_type == ChangeType.ADD_EXPENSE:
            state.expenses.append({
                'id': f'scenario_{change.id}',
                'name': change.name,
                'category': params.get('category', 'miscellaneous'),
                'amount': Decimal(str(params.get('amount', 0))),
                'frequency': params.get('frequency', 'monthly'),
                'monthly': self._to_monthly(params.get('amount', 0), params.get('frequency', 'monthly')),
            })

        elif change.change_type == ChangeType.MODIFY_EXPENSE:
            # Modify existing expense flow
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            for expense in state.expenses:
                if expense['id'] == flow_id:
                    if 'amount' in params:
                        expense['amount'] = Decimal(str(params['amount']))
                        freq = params.get('frequency', expense['frequency'])
                        expense['frequency'] = freq
                        expense['monthly'] = self._to_monthly(params['amount'], freq)
                    if 'category' in params:
                        expense['category'] = params['category']
                    break

        elif change.change_type == ChangeType.REMOVE_EXPENSE:
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            state.expenses = [e for e in state.expenses if e['id'] != flow_id]

        elif change.change_type == ChangeType.ADD_DEBT:
            debt_id = f'scenario_debt_{change.id}'
            principal = Decimal(str(params.get('principal', 0)))
            rate = Decimal(str(params.get('rate', 0)))
            payment = Decimal(str(params.get('payment', 0)))
            term = int(params.get('term_months', 0))

            # If payment not provided, calculate it using amortization formula
            if payment == 0 and principal > 0 and term > 0:
                if rate > 0:
                    monthly_rate = rate / 12
                    payment = principal * (monthly_rate * (1 + monthly_rate) ** term) / ((1 + monthly_rate) ** term - 1)
                else:
                    payment = principal / term
                payment = payment.quantize(Decimal('0.01'))

            state.liabilities[debt_id] = LiabilityInfo(
                balance=principal,
                account_type='personal_loan',
                rate=rate,
                payment=payment,
                term_months=term,
                name=change.name,
            )
            # Add payment as expense with explicit debt ID mapping
            state.expenses.append({
                'id': f'payment_{debt_id}',
                'name': f'{change.name} Payment',
                'category': 'other_debt',
                'amount': payment,
                'frequency': 'monthly',
                'monthly': payment,
                '_target_debt_id': debt_id,  # Explicit mapping
            })

        elif change.change_type == ChangeType.MODIFY_DEBT:
            # Modify existing debt parameters
            debt_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if debt_id in state.liabilities:
                liab = state.liabilities[debt_id]
                if 'principal' in params:
                    liab.balance = Decimal(str(params['principal']))
                if 'rate' in params:
                    liab.rate = Decimal(str(params['rate']))
                if 'term_months' in params:
                    liab.term_months = int(params['term_months'])
                if 'payment' in params:
                    new_payment = Decimal(str(params['payment']))
                    liab.payment = new_payment
                    # Update the payment expense - check explicit mapping or ID-based matching
                    for exp in state.expenses:
                        if exp.get('_target_debt_id') == debt_id or exp['id'] == f'payment_{debt_id}' or debt_id in exp.get('id', ''):
                            exp['amount'] = new_payment
                            exp['monthly'] = new_payment
                            exp['_target_debt_id'] = debt_id  # Ensure explicit mapping
                            break

        elif change.change_type == ChangeType.PAYOFF_DEBT:
            # Add extra payment to existing debt
            debt_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            extra = Decimal(str(params.get('extra_monthly', 0)))

            # Validate that the debt exists in state
            if debt_id and debt_id in state.liabilities:
                liab = state.liabilities[debt_id]
                # Use a unique expense ID that can be matched back to the debt
                state.expenses.append({
                    'id': f'extra_{debt_id}_{change.id}',
                    'name': f'{change.name or liab.name} Extra Payment',
                    'category': 'other_debt',
                    'amount': extra,
                    'frequency': 'monthly',
                    'monthly': extra,
                    '_target_debt_id': debt_id,  # Explicit mapping for debt payoff
                })
            elif debt_id:
                # Debt ID provided but not found - still add expense but warn
                state.expenses.append({
                    'id': f'extra_{debt_id}_{change.id}',
                    'name': f'{change.name} Extra Payment',
                    'category': 'other_debt',
                    'amount': extra,
                    'frequency': 'monthly',
                    'monthly': extra,
                    '_target_debt_id': debt_id,
                })
            else:
                # No debt ID - generic extra payment (legacy behavior)
                state.expenses.append({
                    'id': f'extra_payment_{change.id}',
                    'name': f'{change.name} Extra Payment',
                    'category': 'other_debt',
                    'amount': extra,
                    'frequency': 'monthly',
                    'monthly': extra,
                })

        elif change.change_type == ChangeType.REFINANCE:
            # Refinance existing debt with new terms
            debt_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if debt_id in state.liabilities:
                liab = state.liabilities[debt_id]
                old_balance = liab.balance

                # Apply closing costs (add to balance)
                closing_costs = Decimal(str(params.get('closing_costs', 0)))
                new_balance = old_balance + closing_costs

                # Update rate and term
                new_rate = Decimal(str(params.get('rate', liab.rate)))
                new_term = int(params.get('term_months', liab.term_months))

                # Calculate new payment using amortization formula
                if new_rate > 0 and new_term > 0:
                    monthly_rate = new_rate / 12
                    new_payment = new_balance * (monthly_rate * (1 + monthly_rate) ** new_term) / ((1 + monthly_rate) ** new_term - 1)
                else:
                    new_payment = new_balance / new_term if new_term > 0 else Decimal('0')

                liab.balance = new_balance
                liab.rate = new_rate
                liab.term_months = new_term
                liab.payment = new_payment.quantize(Decimal('0.01'))

                # Update/replace the payment expense
                old_payment_found = False
                for exp in state.expenses:
                    # Check explicit mapping or ID-based matching
                    if exp.get('_target_debt_id') == debt_id or debt_id in exp.get('id', ''):
                        exp['amount'] = liab.payment
                        exp['monthly'] = liab.payment
                        exp['name'] = f'{liab.name} (Refinanced)'
                        exp['_target_debt_id'] = debt_id  # Ensure explicit mapping
                        old_payment_found = True
                        break

                if not old_payment_found:
                    state.expenses.append({
                        'id': f'refi_payment_{debt_id}',
                        'name': f'{liab.name} Payment (Refinanced)',
                        'category': 'other_debt',
                        'amount': liab.payment,
                        'frequency': 'monthly',
                        'monthly': liab.payment,
                        '_target_debt_id': debt_id,  # Explicit mapping
                    })

        elif change.change_type == ChangeType.ADD_ASSET:
            asset_id = f'scenario_asset_{change.id}'
            value = Decimal(str(params.get('value', params.get('amount', 0))))
            asset_type = params.get('account_type', 'other_asset')

            state.assets[asset_id] = AssetInfo(
                balance=value,
                account_type=asset_type,
                is_liquid=asset_type in LIQUID_TYPES if hasattr(LIQUID_TYPES, '__contains__') else False,
                is_retirement=asset_type in RETIREMENT_TYPES if hasattr(RETIREMENT_TYPES, '__contains__') else False,
                name=change.name,
            )

        elif change.change_type == ChangeType.MODIFY_ASSET:
            # Modify existing asset value
            asset_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if asset_id in state.assets:
                if 'value' in params:
                    state.assets[asset_id].balance = Decimal(str(params['value']))
                elif 'amount' in params:
                    state.assets[asset_id].balance = Decimal(str(params['amount']))

        elif change.change_type == ChangeType.SELL_ASSET:
            # Sell asset and add proceeds to liquid assets
            asset_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if asset_id in state.assets:
                sale_price = Decimal(str(params.get('sale_price', state.assets[asset_id].balance)))
                selling_costs = Decimal(str(params.get('selling_costs', 0)))
                net_proceeds = sale_price - selling_costs

                # Remove the asset
                del state.assets[asset_id]

                # Add proceeds to first liquid asset or create new cash
                liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
                if liquid_asset:
                    state.assets[liquid_asset].balance += net_proceeds
                else:
                    state.assets[f'sale_proceeds_{change.id}'] = AssetInfo(
                        balance=net_proceeds,
                        account_type='cash',
                        is_liquid=True,
                        is_retirement=False,
                        name='Sale Proceeds',
                    )

        elif change.change_type == ChangeType.LUMP_SUM_INCOME:
            # One-time income: add net (after tax) to liquid assets
            gross_amount = Decimal(str(params.get('amount', 0)))

            # Determine income type for tax calculation
            income_type = params.get('tax_treatment', 'w2')

            # Calculate tax on this lump sum income
            existing_annual_income = self._get_state_annual_income(state)
            tax_breakdown = self.tax_calculator.calculate_marginal_tax(
                income_change=gross_amount,
                income_type=income_type,
                existing_annual_income=existing_annual_income,
            )

            # Net amount after tax withholding
            net_amount = gross_amount - tax_breakdown.total_tax

            liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
            if liquid_asset:
                state.assets[liquid_asset].balance += net_amount
            elif state.assets:
                first_key = next(iter(state.assets.keys()))
                state.assets[first_key].balance += net_amount

        elif change.change_type == ChangeType.LUMP_SUM_EXPENSE:
            # One-time: subtract from liquid assets
            amount = Decimal(str(params.get('amount', 0)))
            liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
            if liquid_asset:
                state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance - amount)
            elif state.assets:
                first_key = next(iter(state.assets.keys()))
                state.assets[first_key].balance = max(Decimal('0'), state.assets[first_key].balance - amount)

        elif change.change_type == ChangeType.MODIFY_401K:
            # Change 401(k) contribution rate
            new_percentage = Decimal(str(params.get('percentage', 0)))
            new_rate = new_percentage / 100  # Convert to decimal
            state.contribution_rates['401k'] = new_rate

            # Calculate contribution amount from gross salary income
            for inc in state.incomes:
                if inc['category'] in ('salary', 'hourly_wages'):
                    gross_monthly = inc['monthly']
                    new_contribution = gross_monthly * new_rate

                    # Add 401(k) contribution as expense (reduces take-home pay)
                    # But also add to retirement assets
                    existing_expense = next(
                        (e for e in state.expenses if '401k_contribution' in e.get('id', '')),
                        None
                    )
                    if existing_expense:
                        existing_expense['monthly'] = new_contribution
                        existing_expense['amount'] = new_contribution
                    elif new_contribution > 0:
                        state.expenses.append({
                            'id': f'401k_contribution_{change.id}',
                            'name': f'{change.name} - 401(k) Contribution',
                            'category': 'retirement_contribution',
                            'amount': new_contribution,
                            'frequency': 'monthly',
                            'monthly': new_contribution,
                        })

                    # Add transfer to retirement account
                    retirement_acct = next(
                        (k for k, a in state.assets.items() if a.is_retirement),
                        None
                    )
                    if retirement_acct and new_contribution > 0:
                        existing_transfer = next(
                            (t for t in state.transfers if '401k_transfer' in t.get('id', '')),
                            None
                        )
                        if existing_transfer:
                            existing_transfer['monthly'] = new_contribution
                            existing_transfer['amount'] = new_contribution
                        else:
                            state.transfers.append({
                                'id': f'401k_transfer_{change.id}',
                                'name': '401(k) Contribution',
                                'category': 'retirement_transfer',
                                'amount': new_contribution,
                                'frequency': 'monthly',
                                'monthly': new_contribution,
                                'linked_account': retirement_acct,
                            })
                    break

            # Recalculate taxes since pre-tax deductions affect taxable income
            self._recalculate_all_taxes(state)

        elif change.change_type == ChangeType.MODIFY_HSA:
            # Change HSA contribution rate
            new_percentage = Decimal(str(params.get('percentage', 0)))
            new_rate = new_percentage / 100  # Convert to decimal
            state.contribution_rates['hsa'] = new_rate

            # Calculate HSA contribution amount from gross salary income
            for inc in state.incomes:
                if inc['category'] in ('salary', 'hourly_wages'):
                    gross_monthly = inc['monthly']
                    new_contribution = gross_monthly * new_rate

                    # Add HSA contribution as expense (reduces take-home pay)
                    existing_expense = next(
                        (e for e in state.expenses if 'hsa_contribution' in e.get('id', '')),
                        None
                    )
                    if existing_expense:
                        existing_expense['monthly'] = new_contribution
                        existing_expense['amount'] = new_contribution
                    elif new_contribution > 0:
                        state.expenses.append({
                            'id': f'hsa_contribution_{change.id}',
                            'name': f'{change.name} - HSA Contribution',
                            'category': 'health_savings',
                            'amount': new_contribution,
                            'frequency': 'monthly',
                            'monthly': new_contribution,
                        })
                    break

            # Recalculate taxes since HSA contributions are pre-tax
            self._recalculate_all_taxes(state)

        # TASK-14: Overlay adjustments
        # Supports both legacy (monthly_adjustment) and new schema (amount/mode)
        elif change.change_type == ChangeType.ADJUST_TOTAL_EXPENSES:
            # Apply as an overlay adjustment (not a persisted flow)
            # Support both schemas: legacy (monthly_adjustment) and TASK-14 spec (amount/mode)
            if 'amount' in params:
                raw_amount = Decimal(str(params.get('amount', 0)))
                mode = params.get('mode', 'absolute')

                if mode == 'percent':
                    # Percent mode: amount is a ratio (e.g., 0.10 = +10%, -0.10 = -10%)
                    baseline_expenses = state.total_expenses
                    adjustment = baseline_expenses * raw_amount
                else:
                    # Absolute mode: amount is the monthly adjustment value
                    adjustment = raw_amount
            else:
                # Legacy schema: monthly_adjustment
                adjustment = Decimal(str(params.get('monthly_adjustment', 0)))

            if adjustment != 0:
                state.expenses.append({
                    'id': f'expense_adjustment_{change.id}',
                    'name': params.get('description', 'Expense Adjustment'),
                    'category': params.get('category', 'adjustment'),
                    'amount': adjustment,
                    'frequency': 'monthly',
                    'monthly': adjustment,
                })

        elif change.change_type == ChangeType.ADJUST_TOTAL_INCOME:
            # Apply as an overlay adjustment with tax consideration
            # Support both schemas: legacy (monthly_adjustment) and TASK-14 spec (amount/mode)
            if 'amount' in params:
                raw_amount = Decimal(str(params.get('amount', 0)))
                mode = params.get('mode', 'absolute')

                if mode == 'percent':
                    # Percent mode: amount is a ratio (e.g., 0.25 = +25%)
                    baseline_income = state.total_income
                    adjustment = baseline_income * raw_amount
                else:
                    # Absolute mode: amount is the monthly adjustment value
                    adjustment = raw_amount
            else:
                # Legacy schema: monthly_adjustment
                adjustment = Decimal(str(params.get('monthly_adjustment', 0)))

            income_type = params.get('tax_treatment', 'w2')

            if adjustment != 0:
                income_id = f'income_adjustment_{change.id}'

                # Add gross income
                state.incomes.append({
                    'id': income_id,
                    'name': params.get('description', 'Income Adjustment'),
                    'category': 'other_income',
                    'amount': adjustment,
                    'frequency': 'monthly',
                    'monthly': adjustment,
                    '_income_type': income_type,
                })

                # Calculate and add tax expense using the tax calculator
                existing_annual_income = self._get_state_annual_income(state, exclude_id=income_id)
                annual_adjustment = adjustment * Decimal('12')
                tax_breakdown = self.tax_calculator.calculate_marginal_tax(
                    income_change=annual_adjustment,
                    income_type=income_type,
                    existing_annual_income=existing_annual_income,
                )

                # Add tax expense
                tax_expense_id = f'tax_{income_id}'
                monthly_tax = tax_breakdown.total_tax / Decimal('12')
                state.expenses.append({
                    'id': tax_expense_id,
                    'name': f'{params.get("description", "Income Adjustment")} - Taxes',
                    'category': 'income_tax',
                    'amount': tax_breakdown.total_tax,
                    'frequency': 'annually',
                    'monthly': monthly_tax.quantize(Decimal('0.01')),
                    '_is_tax_expense': True,
                    '_source_income_id': income_id,
                })
                state.income_tax_map[income_id] = tax_expense_id

        elif change.change_type == ChangeType.SET_SAVINGS_TRANSFER:
            # Set up a recurring transfer from liquid to investment account
            amount = Decimal(str(params.get('amount', 0)))
            target_id = params.get('target_account_id')

            if amount > 0:
                # Find target account or first retirement account
                if not target_id:
                    target_id = next(
                        (k for k, a in state.assets.items() if a.is_retirement),
                        None
                    )

                if target_id:
                    state.transfers.append({
                        'id': f'savings_transfer_{change.id}',
                        'name': 'Savings Transfer',
                        'category': 'savings_transfer',
                        'amount': amount,
                        'frequency': 'monthly',
                        'monthly': amount,
                        'linked_account': target_id,
                    })

        elif change.change_type == ChangeType.OVERRIDE_ASSUMPTIONS:
            # Override scenario-level assumptions for projection
            # These are applied at initialization, not monthly
            # The scenario object's rates are used in _apply_growth
            pass  # Handled by checking params during growth calculation

        elif change.change_type == ChangeType.ADJUST_INTEREST_RATES:
            # Adjust interest rates on liabilities
            # adjustment_percent is in percentage points (e.g., 2 means +2%)
            adjustment_percent = Decimal(str(params.get('adjustment_percent', 0)))
            applies_to = params.get('applies_to', 'all')

            # Define variable-rate debt types for "variable" filter
            variable_rate_types = {'credit_card', 'heloc', 'arm', 'variable_rate', 'line_of_credit'}

            for lid, liab in state.liabilities.items():
                should_apply = False
                if applies_to == 'all':
                    should_apply = True
                elif applies_to == 'variable':
                    # Match debts with typically variable rates
                    should_apply = liab.account_type in variable_rate_types
                elif applies_to in liab.account_type:
                    should_apply = True

                if should_apply:
                    # Convert percentage points to decimal and add to rate
                    rate_adjustment = adjustment_percent / Decimal('100')
                    liab.rate = liab.rate + rate_adjustment
                    # Recalculate payment if we have term info
                    if liab.term_months > 0 and liab.rate > 0:
                        monthly_rate = liab.rate / 12
                        remaining_term = max(1, liab.term_months - state.month)
                        new_payment = liab.balance * (monthly_rate * (1 + monthly_rate) ** remaining_term) / ((1 + monthly_rate) ** remaining_term - 1)
                        liab.payment = new_payment.quantize(Decimal('0.01'))

        elif change.change_type == ChangeType.ADJUST_INVESTMENT_VALUE:
            # Apply a one-time adjustment to investment values (e.g., market crash)
            if change_key in state.applied_changes:
                return state
            state.applied_changes.add(change_key)

            # percent_change is a ratio (e.g., -0.20 for a 20% drop)
            percent_change = Decimal(str(params.get('percent_change', 0)))
            applies_to = params.get('applies_to', 'all')
            recovery_months = int(params.get('recovery_months', 0))
            multiplier = 1 + percent_change  # percent_change is already a ratio

            for aid, asset in state.assets.items():
                if applies_to == 'all':
                    if asset.is_retirement or asset.account_type in ('brokerage', 'crypto'):
                        asset.balance = asset.balance * multiplier
                elif applies_to in asset.account_type:
                    asset.balance = asset.balance * multiplier

            # Store recovery info for gradual recovery in _apply_growth
            if recovery_months > 0 and percent_change < 0:
                # Calculate monthly recovery rate to restore over recovery_months
                # total_drop is negative (e.g., -0.20), so recovery per month is positive
                monthly_recovery = -percent_change / recovery_months
                state.contribution_rates['_investment_recovery_monthly'] = monthly_recovery
                state.contribution_rates['_investment_recovery_remaining'] = recovery_months

        elif change.change_type == ChangeType.OVERRIDE_INFLATION:
            # Override inflation rate for a period (duration_months)
            # rate can be passed as 'rate' or 'inflation_rate' from stress tests
            new_rate = Decimal(str(params.get('rate', params.get('inflation_rate', self.scenario.inflation_rate))))
            duration_months = int(params.get('duration_months', 0))

            # Store the override and duration info for _apply_growth
            state.contribution_rates['_override_inflation'] = new_rate
            if duration_months > 0:
                state.contribution_rates['_inflation_duration_remaining'] = duration_months
                # Store original rate to revert to after duration
                state.contribution_rates['_original_inflation'] = self.scenario.inflation_rate

        elif change.change_type == ChangeType.MODIFY_WITHHOLDING:
            # Modify withholding affects take-home but not liability
            extra_withholding = Decimal(str(params.get('extra_monthly', 0)))
            if extra_withholding != 0:
                state.expenses.append({
                    'id': f'extra_withholding_{change.id}',
                    'name': 'Additional Withholding',
                    'category': 'tax_withholding',
                    'amount': extra_withholding,
                    'frequency': 'monthly',
                    'monthly': extra_withholding,
                })

        elif change.change_type == ChangeType.SET_QUARTERLY_ESTIMATES:
            # Set up quarterly estimated tax payments
            quarterly_amount = Decimal(str(params.get('quarterly_amount', 0)))
            if quarterly_amount > 0:
                # Convert to monthly for projection purposes
                monthly_equiv = quarterly_amount / Decimal('3')
                state.expenses.append({
                    'id': f'quarterly_estimates_{change.id}',
                    'name': 'Quarterly Estimated Taxes',
                    'category': 'estimated_taxes',
                    'amount': monthly_equiv,
                    'frequency': 'monthly',
                    'monthly': monthly_equiv,
                })

        elif change.change_type == ChangeType.OVERRIDE_INVESTMENT_RETURN:
            # Override investment return rate
            new_rate = Decimal(str(params.get('rate', self.scenario.investment_return_rate)))
            state.contribution_rates['_override_investment_return'] = new_rate

        elif change.change_type == ChangeType.OVERRIDE_SALARY_GROWTH:
            # Override salary growth rate
            new_rate = Decimal(str(params.get('rate', self.scenario.salary_growth_rate)))
            state.contribution_rates['_override_salary_growth'] = new_rate

        return state

    def _apply_growth(self, state: MonthlyState, month: int) -> MonthlyState:
        """Apply annual growth rates (pro-rated monthly)."""
        # Get rates, respecting any overrides from stress tests
        salary_growth_rate = state.contribution_rates.get(
            '_override_salary_growth',
            self.scenario.salary_growth_rate
        )

        # Handle inflation rate with duration tracking
        if '_inflation_duration_remaining' in state.contribution_rates:
            remaining = state.contribution_rates['_inflation_duration_remaining']
            if remaining > 0:
                inflation_rate = state.contribution_rates.get('_override_inflation', self.scenario.inflation_rate)
                state.contribution_rates['_inflation_duration_remaining'] = remaining - 1
            else:
                # Duration expired, revert to original rate
                inflation_rate = state.contribution_rates.get('_original_inflation', self.scenario.inflation_rate)
                # Clean up the override
                state.contribution_rates.pop('_override_inflation', None)
                state.contribution_rates.pop('_inflation_duration_remaining', None)
                state.contribution_rates.pop('_original_inflation', None)
        else:
            inflation_rate = state.contribution_rates.get(
                '_override_inflation',
                self.scenario.inflation_rate
            )

        investment_return_rate = state.contribution_rates.get(
            '_override_investment_return',
            self.scenario.investment_return_rate
        )

        # Apply investment recovery if active (gradual recovery after market drop)
        if '_investment_recovery_remaining' in state.contribution_rates:
            remaining = state.contribution_rates['_investment_recovery_remaining']
            if remaining > 0:
                monthly_recovery = state.contribution_rates.get('_investment_recovery_monthly', Decimal('0'))
                # Apply recovery to investment accounts
                for aid, asset in state.assets.items():
                    if asset.is_retirement or asset.account_type in ('brokerage', 'crypto'):
                        # Recovery adds back value: balance * (1 + monthly_recovery)
                        asset.balance = asset.balance * (1 + monthly_recovery)
                state.contribution_rates['_investment_recovery_remaining'] = remaining - 1
            else:
                # Recovery complete, clean up
                state.contribution_rates.pop('_investment_recovery_monthly', None)
                state.contribution_rates.pop('_investment_recovery_remaining', None)

        # INTENTIONAL: Annual growth is applied as step changes at year boundaries (months 12, 24, 36, etc.)
        # This creates discrete annual raises rather than continuous growth.
        # For example, a 3% salary growth rate means salaries increase by 3% at the start of each year,
        # not 0.25% each month. This matches how most compensation adjustments work in reality.
        if month > 0 and month % 12 == 0:
            # Annual salary growth
            growth = 1 + float(salary_growth_rate)
            for inc in state.incomes:
                if inc['category'] in ('salary', 'hourly_wages', 'bonus', 'commission'):
                    inc['amount'] = inc['amount'] * Decimal(str(growth))
                    inc['monthly'] = inc['monthly'] * Decimal(str(growth))

            # Annual inflation on expenses (excluding debt payments)
            inflation = 1 + float(inflation_rate)
            for exp in state.expenses:
                # Don't inflate fixed debt payments
                if not any(x in exp['category'] for x in ('debt', 'mortgage', 'loan')):
                    exp['amount'] = exp['amount'] * Decimal(str(inflation))
                    exp['monthly'] = exp['monthly'] * Decimal(str(inflation))

        # Monthly investment returns (apply to investment and retirement accounts)
        monthly_return = (1 + float(investment_return_rate)) ** (1/12) - 1
        for aid, asset in state.assets.items():
            # Apply returns only to investment-type accounts (not liquid cash)
            if asset.is_retirement or asset.account_type in ('brokerage', 'crypto'):
                asset.balance = asset.balance * Decimal(str(1 + monthly_return))

        return state

    def _advance_month(self, state: MonthlyState) -> MonthlyState:
        """
        Advance the financial state by one month.

        This function executes all monthly financial operations:
        1. Applies net cash flow to liquid assets (or first asset if no liquid assets)
        2. Processes inter-account transfers (savings, extra debt payments)
        3. Calculates and applies employer 401k match (with annual limit tracking)
        4. Updates debt balances with interest accrual and payments
        5. Applies investment returns to asset balances
        6. Applies annual growth rates (salary, inflation) at year boundaries

        Args:
            state: Current monthly state

        Returns:
            Updated MonthlyState with all monthly operations applied

        Notes:
            - Negative balances are clamped to zero (masks cash flow problems)
            - First liquid asset is always selected for cash flow operations
            - Employer match YTD resets at month 0, 12, 24, etc.
            - Growth rates (salary, inflation) apply at month 12, 24, 36, etc.
            - Investment returns compound monthly at rate/12
        """
        net_flow = state.net_cash_flow

        # Add net cash flow to first liquid asset
        # DESIGN DECISION: Always selects the FIRST liquid asset found in the dictionary.
        # Dictionary iteration order is guaranteed in Python 3.7+, so this is deterministic.
        # In practice, this is usually a checking account. Future enhancement could allow
        # users to specify which account to use for cash flow operations.
        liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
        if liquid_asset:
            state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance + net_flow)
        elif state.assets:
            first_key = next(iter(state.assets.keys()))
            state.assets[first_key].balance = max(Decimal('0'), state.assets[first_key].balance + net_flow)

        # Process transfers (move money between accounts)
        for transfer in state.transfers:
            amount = transfer['monthly']
            target_id = transfer.get('linked_account')
            if target_id and target_id in state.assets:
                # Transfer from liquid assets to target account
                if liquid_asset:
                    state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance - amount)
                state.assets[target_id].balance += amount
            elif target_id and target_id in state.liabilities:
                # Extra payment to liability
                if liquid_asset:
                    state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance - amount)
                state.liabilities[target_id].balance = max(Decimal('0'), state.liabilities[target_id].balance - amount)

        # Calculate and add employer 401k match to retirement account
        if state.employer_match.match_percentage > 0:
            # Reset YTD tracking at year boundary
            if state.month > 0 and state.month % 12 == 0:
                state.employer_match_ytd = Decimal('0')

            # Calculate gross monthly salary income
            gross_monthly_salary = sum(
                inc['monthly'] for inc in state.incomes
                if inc['category'] in ('salary', 'hourly_wages', 'w2', 'w2_hourly')
            )

            if gross_monthly_salary > 0:
                # Get employee contribution rate
                contribution_rate = state.contribution_rates.get('401k', Decimal('0'))

                # Calculate employee contribution this month
                employee_contribution = gross_monthly_salary * contribution_rate

                # Calculate matchable contribution (limited by employer's limit percentage)
                if state.employer_match.limit_percentage > 0:
                    max_matchable = gross_monthly_salary * state.employer_match.limit_percentage
                    matchable_contribution = min(employee_contribution, max_matchable)
                else:
                    matchable_contribution = employee_contribution

                # Calculate employer match
                employer_match_amount = matchable_contribution * state.employer_match.match_percentage

                # Apply annual limit if set
                if state.employer_match.limit_annual:
                    remaining_annual = state.employer_match.limit_annual - state.employer_match_ytd
                    employer_match_amount = min(employer_match_amount, max(Decimal('0'), remaining_annual))
                    state.employer_match_ytd += employer_match_amount

                # Add employer match to retirement account (free money!)
                if employer_match_amount > 0:
                    retirement_acct = next(
                        (k for k, a in state.assets.items() if a.is_retirement),
                        None
                    )
                    if retirement_acct:
                        state.assets[retirement_acct].balance += employer_match_amount

        # Reduce debt balances based on payments
        for lid, liab in list(state.liabilities.items()):
            if liab.balance > 0 and liab.payment > 0:
                # Calculate interest for this month
                monthly_interest = liab.balance * (liab.rate / 12) if liab.rate > 0 else Decimal('0')
                principal_payment = liab.payment - monthly_interest

                # Find any extra payments for this debt using explicit mapping first, then fallback to ID matching
                extra_payment = Decimal('0')
                for e in state.expenses:
                    # Prefer explicit mapping via _target_debt_id
                    target_debt = e.get('_target_debt_id')
                    if target_debt and target_debt == lid:
                        extra_payment += e['monthly']
                    # Fallback to ID-based matching for legacy/scenario_debt entries
                    elif not target_debt and 'extra' in e.get('id', '') and lid in e.get('id', ''):
                        extra_payment += e['monthly']

                principal_payment += extra_payment

                # Reduce balance
                liab.balance = max(Decimal('0'), liab.balance - principal_payment)

                # If paid off, remove the payment expense and extra payments
                if liab.balance == 0:
                    state.expenses = [
                        e for e in state.expenses
                        if not (
                            # Remove expenses targeting this debt explicitly
                            e.get('_target_debt_id') == lid or
                            # Remove expenses with this debt ID in their ID (payment_, extra_, etc.)
                            lid in e.get('id', '')
                        )
                    ]

        state.month += 1
        state.date = state.date + relativedelta(months=1)

        return state

    def _create_projection(self, state: MonthlyState, proj_date: date, month: int) -> ScenarioProjection:
        """Create projection record from state."""
        total_exp = state.total_expenses
        debt_categories = ('debt', 'mortgage', 'loan', 'credit_card', 'heloc')
        debt_service = sum(
            e['monthly'] for e in state.expenses
            if any(cat in e.get('category', '') for cat in debt_categories)
        )

        non_debt_exp = total_exp - debt_service
        operating_income = state.total_income - non_debt_exp
        dscr = operating_income / debt_service if debt_service > 0 else Decimal('999')

        savings_rate = state.net_cash_flow / state.total_income if state.total_income > 0 else Decimal('0')
        liquidity = state.liquid_assets / total_exp if total_exp > 0 else Decimal('999')
        days_cash = (state.liquid_assets * Decimal('30')) / total_exp if total_exp > 0 else Decimal('999.9')

        # Build income breakdown aggregating by category
        income_breakdown = {}
        for i in state.incomes:
            cat = i['category']
            monthly = i['monthly'].quantize(Decimal('0.01'))
            if cat in income_breakdown:
                income_breakdown[cat] = str(Decimal(income_breakdown[cat]) + monthly)
            else:
                income_breakdown[cat] = str(monthly)

        # Build expense breakdown aggregating by category
        expense_breakdown = {}
        for e in state.expenses:
            cat = e['category']
            monthly = e['monthly'].quantize(Decimal('0.01'))
            if cat in expense_breakdown:
                expense_breakdown[cat] = str(Decimal(expense_breakdown[cat]) + monthly)
            else:
                expense_breakdown[cat] = str(monthly)

        return ScenarioProjection(
            scenario=self.scenario,
            projection_date=proj_date,
            month_number=month,
            total_assets=state.total_assets.quantize(Decimal('0.01')),
            total_liabilities=state.total_liabilities.quantize(Decimal('0.01')),
            net_worth=state.net_worth.quantize(Decimal('0.01')),
            liquid_assets=state.liquid_assets.quantize(Decimal('0.01')),
            retirement_assets=state.retirement_assets.quantize(Decimal('0.01')),
            total_income=state.total_income.quantize(Decimal('0.01')),
            total_expenses=total_exp.quantize(Decimal('0.01')),
            net_cash_flow=state.net_cash_flow.quantize(Decimal('0.01')),
            dscr=min(dscr, Decimal('999')).quantize(Decimal('0.001')),
            savings_rate=max(Decimal('-9.9999'), min(savings_rate, Decimal('9.9999'))).quantize(Decimal('0.0001')),
            liquidity_months=min(liquidity, Decimal('999')).quantize(Decimal('0.01')),
            days_cash_on_hand=min(days_cash, Decimal('999.9')).quantize(Decimal('0.1')),
            income_breakdown=income_breakdown,
            expense_breakdown=expense_breakdown,
            asset_breakdown=state.get_asset_breakdown(),
            liability_breakdown=state.get_liability_breakdown(),
        )

    def _to_monthly(self, amount, frequency: str) -> Decimal:
        """Convert amount to monthly."""
        # Convert string frequency to Frequency enum if needed
        if isinstance(frequency, str):
            try:
                frequency = Frequency(frequency)
            except ValueError:
                pass  # Keep as string if invalid
        mult = FREQUENCY_TO_MONTHLY.get(frequency, Decimal('1'))
        return Decimal(str(amount)) * mult

    def _get_state_annual_income(self, state: MonthlyState, exclude_id: str | None = None) -> Decimal:
        """
        Calculate total annual income from current state.

        Args:
            state: Current monthly state
            exclude_id: Optional income ID to exclude from calculation

        Returns:
            Total annual income
        """
        total = Decimal('0')
        for income in state.incomes:
            if exclude_id and income['id'] == exclude_id:
                continue
            # Skip tax-related income entries
            if income.get('_is_tax_expense'):
                continue
            total += income['monthly'] * Decimal('12')
        return total

    def _recalculate_all_taxes(self, state: MonthlyState) -> None:
        """
        Recalculate taxes for all income sources in the state.

        This should be called after any change that affects taxable income
        (e.g., adding/removing pre-tax deductions like 401k or HSA).
        """
        # Calculate total pre-tax deductions from expenses
        pretax_categories = {'retirement_contribution', 'health_savings', '401k_contribution', 'hsa_contribution'}
        monthly_pretax_deductions = sum(
            e['monthly'] for e in state.expenses
            if e.get('category') in pretax_categories
        )

        # Recalculate tax for each income source
        cumulative_income = Decimal('0')
        for income in state.incomes:
            income_id = income['id']

            # Skip non-primary incomes and tax adjustments
            if income.get('_is_tax_expense'):
                continue

            income_type = income.get('_income_type', 'w2')
            annual_income = income['monthly'] * Decimal('12')

            # Calculate tax considering pre-tax deductions
            annual_pretax = monthly_pretax_deductions * Decimal('12')
            tax_breakdown = self.tax_calculator.calculate_annual_tax(
                annual_income=annual_income,
                income_type=income_type,
                existing_annual_income=cumulative_income,
                pre_tax_deductions=annual_pretax if income_type == 'w2' else Decimal('0'),
            )
            cumulative_income += annual_income

            # Update or create tax expense
            tax_expense_id = state.income_tax_map.get(income_id)
            monthly_tax = tax_breakdown.total_tax / Decimal('12')

            if tax_expense_id:
                # Update existing tax expense
                for expense in state.expenses:
                    if expense['id'] == tax_expense_id:
                        expense['amount'] = tax_breakdown.total_tax
                        expense['monthly'] = monthly_tax.quantize(Decimal('0.01'))
                        break
            else:
                # Create new tax expense
                tax_expense_id = f'tax_{income_id}'
                state.expenses.append({
                    'id': tax_expense_id,
                    'name': f'{income.get("name", "Income")} - Taxes',
                    'category': 'income_tax',
                    'amount': tax_breakdown.total_tax,
                    'frequency': 'annually',
                    'monthly': monthly_tax.quantize(Decimal('0.01')),
                    '_is_tax_expense': True,
                    '_source_income_id': income_id,
                })
                state.income_tax_map[income_id] = tax_expense_id
