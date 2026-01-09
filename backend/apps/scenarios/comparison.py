"""
TASK-15: Scenario Comparison Service

Provides driver decomposition to explain "what changed and why" between scenarios.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

from .models import Scenario, ScenarioProjection


@dataclass
class DriverBucket:
    """A driver bucket representing a category of change."""
    name: str
    amount: Decimal
    description: str


@dataclass
class ComparisonSummary:
    """Summary of a scenario comparison with driver decomposition."""
    baseline_id: str
    scenario_id: str
    horizon_months: int
    baseline_start_nw: Decimal
    baseline_end_nw: Decimal
    scenario_start_nw: Decimal
    scenario_end_nw: Decimal
    net_worth_delta: Decimal
    drivers: list = field(default_factory=list)
    reconciliation_error_percent: Decimal = Decimal('0')


class ScenarioComparisonService:
    """
    Service for comparing scenarios and computing driver decomposition.

    Computes drivers via monthly component deltas and reconciles to ensure
    the sum of drivers approximately equals the net worth delta.
    """

    # API constraints per TASK-15
    MAX_SCENARIOS = 4
    MAX_HORIZON_MONTHS = 360
    RECONCILIATION_TOLERANCE = Decimal('1.0')  # 1% tolerance

    def __init__(self, household):
        self.household = household

    def compare_scenarios(
        self,
        baseline: Scenario,
        scenario: Scenario,
        horizon_months: Optional[int] = None
    ) -> ComparisonSummary:
        """
        Compare two scenarios and compute driver decomposition.

        Args:
            baseline: The baseline scenario to compare against
            scenario: The scenario to analyze
            horizon_months: Optional limit on comparison horizon

        Returns:
            ComparisonSummary with driver decomposition
        """
        # Get projections
        baseline_projections = list(
            ScenarioProjection.objects.filter(scenario=baseline)
            .order_by('month_number')
        )
        scenario_projections = list(
            ScenarioProjection.objects.filter(scenario=scenario)
            .order_by('month_number')
        )

        if not baseline_projections or not scenario_projections:
            raise ValueError("Both scenarios must have projections")

        # Determine horizon
        max_months = min(
            len(baseline_projections),
            len(scenario_projections),
            horizon_months or self.MAX_HORIZON_MONTHS
        )

        # Get start and end values
        baseline_start = baseline_projections[0]
        baseline_end = baseline_projections[max_months - 1]
        scenario_start = scenario_projections[0]
        scenario_end = scenario_projections[max_months - 1]

        # Compute net worth delta
        nw_delta = scenario_end.net_worth - baseline_end.net_worth

        # Compute driver buckets
        drivers = self._compute_drivers(
            baseline_projections[:max_months],
            scenario_projections[:max_months]
        )

        # Calculate reconciliation error
        driver_sum = sum(d.amount for d in drivers)
        if nw_delta != 0:
            error_percent = abs((driver_sum - nw_delta) / nw_delta) * 100
        else:
            error_percent = Decimal('0') if driver_sum == 0 else Decimal('100')

        # Add unattributed bucket if error exceeds tolerance
        if error_percent > self.RECONCILIATION_TOLERANCE:
            unattributed = nw_delta - driver_sum
            drivers.append(DriverBucket(
                name='unattributed',
                amount=unattributed,
                description='Unattributed changes due to compounding or rounding'
            ))

        return ComparisonSummary(
            baseline_id=str(baseline.id),
            scenario_id=str(scenario.id),
            horizon_months=max_months,
            baseline_start_nw=baseline_start.net_worth,
            baseline_end_nw=baseline_end.net_worth,
            scenario_start_nw=scenario_start.net_worth,
            scenario_end_nw=scenario_end.net_worth,
            net_worth_delta=nw_delta,
            drivers=drivers,
            reconciliation_error_percent=error_percent,
        )

    def _compute_drivers(
        self,
        baseline_projections: list,
        scenario_projections: list
    ) -> list:
        """
        Compute driver buckets from monthly deltas.

        Returns list of DriverBucket objects representing:
        - Income changes
        - Spending changes
        - Interest savings/costs
        - Tax impact
        - Investment performance
        - Other asset changes
        """
        # Accumulate deltas across all months
        income_delta = Decimal('0')
        spending_delta = Decimal('0')
        interest_delta = Decimal('0')
        tax_delta = Decimal('0')
        investment_delta = Decimal('0')
        other_delta = Decimal('0')

        for i in range(len(scenario_projections)):
            baseline = baseline_projections[i]
            scenario = scenario_projections[i]

            # Income delta (positive = higher income in scenario)
            income_diff = scenario.total_income - baseline.total_income
            income_delta += income_diff

            # Spending delta (negative = reduced spending in scenario)
            # Note: expenses are typically positive, so lower expense = savings
            expense_diff = baseline.total_expenses - scenario.total_expenses
            spending_delta += expense_diff

            # Interest delta - from expense breakdown if available
            baseline_interest = self._get_interest_expense(baseline)
            scenario_interest = self._get_interest_expense(scenario)
            interest_diff = baseline_interest - scenario_interest
            interest_delta += interest_diff

            # Tax delta - from expense breakdown if available
            baseline_tax = self._get_tax_expense(baseline)
            scenario_tax = self._get_tax_expense(scenario)
            tax_diff = baseline_tax - scenario_tax
            tax_delta += tax_diff

            # Investment returns - from asset changes vs contributions
            baseline_invest = self._get_investment_returns(baseline)
            scenario_invest = self._get_investment_returns(scenario)
            investment_delta += scenario_invest - baseline_invest

        drivers = []

        # Add non-zero drivers with appropriate descriptions
        if income_delta != 0:
            drivers.append(DriverBucket(
                name='income',
                amount=income_delta,
                description='Higher income' if income_delta > 0 else 'Lower income'
            ))

        if spending_delta != 0:
            drivers.append(DriverBucket(
                name='spending',
                amount=spending_delta,
                description='Reduced spending' if spending_delta > 0 else 'Increased spending'
            ))

        if interest_delta != 0:
            drivers.append(DriverBucket(
                name='interest',
                amount=interest_delta,
                description='Interest savings' if interest_delta > 0 else 'Interest costs'
            ))

        if tax_delta != 0:
            drivers.append(DriverBucket(
                name='tax',
                amount=tax_delta,
                description='Tax savings' if tax_delta > 0 else 'Tax increase'
            ))

        if investment_delta != 0:
            drivers.append(DriverBucket(
                name='investment',
                amount=investment_delta,
                description='Better investment performance' if investment_delta > 0 else 'Worse investment performance'
            ))

        return drivers

    def _get_interest_expense(self, projection: ScenarioProjection) -> Decimal:
        """Extract interest expense from projection breakdown."""
        breakdown = projection.expense_breakdown or {}
        # Look for common interest-related keys
        interest_keys = ['interest', 'debt_interest', 'mortgage_interest', 'loan_interest']
        total = Decimal('0')
        for key in interest_keys:
            if key in breakdown:
                try:
                    total += Decimal(str(breakdown[key]))
                except (ValueError, TypeError):
                    pass
        return total

    def _get_tax_expense(self, projection: ScenarioProjection) -> Decimal:
        """Extract tax expense from projection breakdown."""
        breakdown = projection.expense_breakdown or {}
        tax_keys = ['taxes', 'income_tax', 'federal_tax', 'state_tax', 'property_tax']
        total = Decimal('0')
        for key in tax_keys:
            if key in breakdown:
                try:
                    total += Decimal(str(breakdown[key]))
                except (ValueError, TypeError):
                    pass
        return total

    def _get_investment_returns(self, projection: ScenarioProjection) -> Decimal:
        """
        Estimate investment returns for a projection.

        This is approximated as the change in retirement/investment assets
        minus any contributions (which would be in net cash flow).
        """
        # For now, use a simple approximation based on retirement assets
        # A more sophisticated implementation would track contributions separately
        return projection.retirement_assets * Decimal('0.005')  # Approx monthly return

    def compare_multiple(
        self,
        scenarios: list,
        horizon_months: Optional[int] = None
    ) -> dict:
        """
        Compare multiple scenarios against the first (baseline).

        Args:
            scenarios: List of Scenario objects (first is treated as baseline)
            horizon_months: Optional horizon limit

        Returns:
            Dict with baseline and list of comparison summaries
        """
        if len(scenarios) < 2:
            raise ValueError("Need at least 2 scenarios to compare")

        if len(scenarios) > self.MAX_SCENARIOS:
            raise ValueError(f"Maximum {self.MAX_SCENARIOS} scenarios allowed")

        baseline = scenarios[0]
        comparisons = []

        for scenario in scenarios[1:]:
            summary = self.compare_scenarios(
                baseline=baseline,
                scenario=scenario,
                horizon_months=horizon_months
            )
            comparisons.append(summary)

        return {
            'baseline_id': str(baseline.id),
            'baseline_name': baseline.name,
            'comparisons': comparisons,
        }
