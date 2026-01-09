"""Goal evaluation service for computing goal status and recommendations."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from django.utils import timezone

from apps.goals.models import Goal, GoalType
from apps.metrics.models import MetricSnapshot
from apps.scenarios.models import ScenarioProjection


@dataclass
class GoalStatusDTO:
    """Data transfer object for goal evaluation results."""
    goal_id: str
    goal_type: str
    name: str
    target_value: str
    current_value: str
    status: str  # 'good', 'warning', 'critical'
    delta_to_target: str
    recommendation: str


class GoalEvaluationService:
    """
    Evaluates household goals against current metrics or scenario projections.

    For baseline evaluation, uses the latest MetricSnapshot.
    For scenario evaluation, uses ScenarioProjection data.
    """

    # Threshold multipliers for status determination
    CRITICAL_THRESHOLD = Decimal('0.5')  # < 50% of target
    WARNING_THRESHOLD = Decimal('0.8')   # < 80% of target

    def __init__(self, household):
        self.household = household

    def evaluate_goals(
        self,
        as_of_date=None,
        scenario_id: Optional[str] = None
    ) -> list[GoalStatusDTO]:
        """
        Evaluate all active goals for the household.

        Args:
            as_of_date: Date to evaluate goals as of (defaults to today)
            scenario_id: If provided, evaluate against scenario projections

        Returns:
            List of GoalStatusDTO with status and recommendations
        """
        if as_of_date is None:
            as_of_date = timezone.now().date()

        goals = Goal.objects.filter(
            household=self.household,
            is_active=True
        ).order_by('-is_primary', '-created_at')

        if not goals.exists():
            return []

        # Get metrics data
        if scenario_id:
            metrics = self._get_scenario_metrics(scenario_id)
        else:
            metrics = self._get_baseline_metrics()

        if not metrics:
            # Return goals with default values if no metrics available
            return [
                self._create_default_status(goal)
                for goal in goals
            ]

        results = []
        for goal in goals:
            status = self._evaluate_goal(goal, metrics)
            results.append(status)

        return results

    def _get_baseline_metrics(self) -> Optional[dict]:
        """Get latest metrics snapshot for baseline evaluation."""
        snapshot = MetricSnapshot.objects.filter(
            household=self.household
        ).order_by('-as_of_date').first()

        if not snapshot:
            return None

        return {
            'liquidity_months': snapshot.liquidity_months,
            'dscr': snapshot.dscr,
            'savings_rate': snapshot.savings_rate,
            'net_worth_market': snapshot.net_worth_market,
            'monthly_surplus': snapshot.monthly_surplus,
            'total_monthly_expenses': snapshot.total_monthly_expenses,
            'total_monthly_income': snapshot.total_monthly_income,
            'total_debt_service': snapshot.total_debt_service,
        }

    def _get_scenario_metrics(self, scenario_id: str) -> Optional[dict]:
        """Get latest projection metrics for scenario evaluation."""
        projection = ScenarioProjection.objects.filter(
            scenario_id=scenario_id
        ).order_by('-month_number').first()

        if not projection:
            return None

        return {
            'liquidity_months': projection.liquidity_months,
            'dscr': projection.dscr,
            'savings_rate': projection.savings_rate,
            'net_worth_market': projection.net_worth,
            'monthly_surplus': projection.net_cash_flow,
            'total_monthly_expenses': projection.total_expenses,
            'total_monthly_income': projection.total_income,
            'total_debt_service': Decimal('0'),  # Not tracked in projection
        }

    def _evaluate_goal(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate a single goal against metrics."""
        evaluators = {
            GoalType.EMERGENCY_FUND_MONTHS: self._evaluate_emergency_fund,
            GoalType.MIN_DSCR: self._evaluate_dscr,
            GoalType.MIN_SAVINGS_RATE: self._evaluate_savings_rate,
            GoalType.NET_WORTH_TARGET_BY_DATE: self._evaluate_net_worth_target,
            GoalType.RETIREMENT_AGE: self._evaluate_retirement_age,
        }

        evaluator = evaluators.get(goal.goal_type)
        if evaluator:
            return evaluator(goal, metrics)

        return self._create_default_status(goal)

    def _evaluate_emergency_fund(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate emergency fund months goal."""
        current = metrics.get('liquidity_months', Decimal('0'))
        target = goal.target_value
        delta = current - target
        status = self._calculate_status(current, target)

        # Generate recommendation per TASK-13 spec
        recommendation = ''
        if status != 'good':
            monthly_expenses = metrics.get('total_monthly_expenses', Decimal('0'))
            dollar_gap = max(Decimal('0'), (target - current) * monthly_expenses)
            months_to_goal = goal.target_meta.get('months_to_goal', 24)
            monthly_gap = dollar_gap / Decimal(str(months_to_goal)) if months_to_goal else Decimal('0')

            recommendation = (
                f"Increase liquidity by ${dollar_gap:,.0f} or "
                f"increase surplus by ${monthly_gap:,.0f}/mo"
            )

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            name=goal.name,
            target_value=str(target),
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            recommendation=recommendation,
        )

    def _evaluate_dscr(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate minimum DSCR goal."""
        current = metrics.get('dscr', Decimal('0'))
        target = goal.target_value
        delta = current - target
        status = self._calculate_status(current, target)

        recommendation = ''
        if status != 'good':
            income = metrics.get('total_monthly_income', Decimal('0'))
            debt_service = metrics.get('total_debt_service', Decimal('0'))
            expenses = metrics.get('total_monthly_expenses', Decimal('0'))

            # Calculate required income increase
            essential_and_debt = expenses + debt_service
            required_income = (target * essential_and_debt) - income
            required_income = max(Decimal('0'), required_income)

            recommendation = (
                f"Increase net income by ${required_income:,.0f}/mo "
                f"or reduce debt payments"
            )

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            name=goal.name,
            target_value=str(target),
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            recommendation=recommendation,
        )

    def _evaluate_savings_rate(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate minimum savings rate goal."""
        current = metrics.get('savings_rate', Decimal('0'))
        target = goal.target_value
        delta = current - target
        status = self._calculate_status(current, target)

        recommendation = ''
        if status != 'good':
            income = metrics.get('total_monthly_income', Decimal('0'))
            savings_gap = max(Decimal('0'), target - current)
            required_surplus_increase = (savings_gap / Decimal('100')) * income

            recommendation = (
                f"Increase surplus by ${required_surplus_increase:,.0f}/mo "
                f"(reduce expenses or raise income)"
            )

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            name=goal.name,
            target_value=str(target),
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            recommendation=recommendation,
        )

    def _evaluate_net_worth_target(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate net worth target by date goal."""
        current = metrics.get('net_worth_market', Decimal('0'))
        target = goal.target_value
        delta = current - target

        # For net worth targets, status depends on trajectory
        ratio = current / target if target else Decimal('0')
        if ratio >= Decimal('1'):
            status = 'good'
        elif ratio >= Decimal('0.7'):
            status = 'warning'
        else:
            status = 'critical'

        recommendation = ''
        if status != 'good':
            gap = target - current
            recommendation = f"Need ${gap:,.0f} more to reach target"

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            name=goal.name,
            target_value=str(target),
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            recommendation=recommendation,
        )

    def _evaluate_retirement_age(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate retirement age goal (placeholder for long-horizon model)."""
        # Retirement age requires long-horizon projections
        # For V1, return a placeholder status
        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            name=goal.name,
            target_value=str(goal.target_value),
            current_value='N/A',
            status='warning',
            delta_to_target='N/A',
            recommendation='Retirement projections require long-horizon modeling',
        )

    def _calculate_status(
        self,
        current: Decimal,
        target: Decimal
    ) -> str:
        """Calculate status based on current vs target ratio."""
        if target == 0:
            return 'good' if current >= 0 else 'critical'

        ratio = current / target

        if ratio >= Decimal('1'):
            return 'good'
        elif ratio >= self.WARNING_THRESHOLD:
            return 'warning'
        else:
            return 'critical'

    def _create_default_status(self, goal: Goal) -> GoalStatusDTO:
        """Create default status when metrics are unavailable."""
        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            name=goal.name,
            target_value=str(goal.target_value),
            current_value='N/A',
            status='warning',
            delta_to_target='N/A',
            recommendation='Add financial data to evaluate this goal',
        )
