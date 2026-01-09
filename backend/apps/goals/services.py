"""Goal evaluation and goal seek solver services."""

from dataclasses import dataclass
from decimal import Decimal
from datetime import date, timedelta
from typing import Optional

from django.utils import timezone

from apps.goals.models import Goal, GoalSolution, GoalType, GoalStatus
from apps.metrics.models import MetricSnapshot
from apps.scenarios.models import ScenarioProjection


@dataclass
class GoalStatusDTO:
    """Data transfer object for goal evaluation results."""
    goal_id: str
    goal_type: str
    goal_name: str
    target_value: str
    target_unit: str
    current_value: str
    status: str  # 'good', 'warning', 'critical'
    delta_to_target: str
    percentage_complete: Optional[str]
    recommendation: str


class GoalEvaluator:
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
            return [self._create_default_status(goal) for goal in goals]

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
            'net_worth': snapshot.net_worth_market,
            'monthly_surplus': snapshot.monthly_surplus,
            'total_expenses': snapshot.total_monthly_expenses,
            'total_income': snapshot.total_monthly_income,
            'total_debt_service': snapshot.total_debt_service,
        }

    def _get_scenario_metrics(self, scenario_id: str) -> Optional[dict]:
        """
        Get projection metrics for scenario evaluation.

        Uses min/worst values for DSCR and liquidity goals as per TASK-13 spec.
        Returns latest month values for net worth and savings rate.
        """
        projections = list(ScenarioProjection.objects.filter(
            scenario_id=scenario_id
        ).order_by('month_number'))

        if not projections:
            return None

        latest = projections[-1]

        # For DSCR and liquidity, use WORST month (min value) per TASK-13 spec
        min_dscr = min(p.dscr for p in projections)
        min_liquidity = min(p.liquidity_months for p in projections)

        # Calculate debt service from expense breakdown
        # Sum up categories that are typically debt payments
        debt_categories = ('debt', 'mortgage', 'loan', 'credit_card', 'heloc', 'other_debt')
        total_debt_service = Decimal('0')
        for p in projections[-1:]:  # Use latest month's breakdown
            expense_breakdown = p.expense_breakdown or {}
            for category, amount in expense_breakdown.items():
                if any(dc in category.lower() for dc in debt_categories):
                    try:
                        total_debt_service += Decimal(str(amount))
                    except (ValueError, TypeError):
                        pass

        return {
            'liquidity_months': min_liquidity,  # Worst month
            'dscr': min_dscr,  # Worst month
            'savings_rate': latest.savings_rate,
            'net_worth': latest.net_worth,
            'monthly_surplus': latest.net_cash_flow,
            'total_expenses': latest.total_expenses,
            'total_income': latest.total_income,
            'total_debt_service': total_debt_service,
            # Additional context for goal evaluation
            'worst_liquidity_month': min((p for p in projections), key=lambda x: x.liquidity_months).month_number,
            'worst_dscr_month': min((p for p in projections), key=lambda x: x.dscr).month_number,
        }

    def _evaluate_goal(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate a single goal against metrics."""
        evaluators = {
            GoalType.EMERGENCY_FUND_MONTHS: self._evaluate_emergency_fund,
            GoalType.MIN_DSCR: self._evaluate_dscr,
            GoalType.MIN_SAVINGS_RATE: self._evaluate_savings_rate,
            GoalType.NET_WORTH_TARGET: self._evaluate_net_worth_target,
            GoalType.RETIREMENT_AGE: self._evaluate_retirement_age,
            GoalType.DEBT_FREE_DATE: self._evaluate_debt_free,
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
        percentage = self._calculate_percentage(current, target)

        recommendation = ''
        if status != 'good':
            monthly_expenses = metrics.get('total_expenses', Decimal('0'))
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
            goal_name=goal.display_name,
            target_value=str(target),
            target_unit=goal.target_unit,
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            percentage_complete=str(percentage),
            recommendation=recommendation,
        )

    def _evaluate_dscr(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate minimum DSCR goal."""
        current = metrics.get('dscr', Decimal('0'))
        target = goal.target_value
        delta = current - target
        status = self._calculate_status(current, target)
        percentage = self._calculate_percentage(current, target)

        recommendation = ''
        if status != 'good':
            recommendation = "Increase net income or reduce debt payments to improve DSCR"

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=str(target),
            target_unit=goal.target_unit,
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            percentage_complete=str(percentage),
            recommendation=recommendation,
        )

    def _evaluate_savings_rate(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate minimum savings rate goal."""
        current = metrics.get('savings_rate', Decimal('0'))
        target = goal.target_value
        delta = current - target
        status = self._calculate_status(current, target)
        percentage = self._calculate_percentage(current, target)

        recommendation = ''
        if status != 'good':
            income = metrics.get('total_income', Decimal('0'))
            savings_gap = max(Decimal('0'), target - current)
            required_surplus_increase = (savings_gap / Decimal('100')) * income

            recommendation = (
                f"Increase surplus by ${required_surplus_increase:,.0f}/mo "
                f"(reduce expenses or raise income)"
            )

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=str(target),
            target_unit=goal.target_unit,
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            percentage_complete=str(percentage),
            recommendation=recommendation,
        )

    def _evaluate_net_worth_target(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate net worth target goal."""
        current = metrics.get('net_worth', Decimal('0'))
        target = goal.target_value
        delta = current - target
        percentage = self._calculate_percentage(current, target)

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
            goal_name=goal.display_name,
            target_value=str(target),
            target_unit=goal.target_unit,
            current_value=str(current),
            status=status,
            delta_to_target=str(delta),
            percentage_complete=str(percentage),
            recommendation=recommendation,
        )

    def _evaluate_retirement_age(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate retirement age goal (placeholder for long-horizon model)."""
        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=str(goal.target_value),
            target_unit=goal.target_unit,
            current_value='N/A',
            status='warning',
            delta_to_target='N/A',
            percentage_complete=None,
            recommendation='Retirement projections require long-horizon modeling',
        )

    def _evaluate_debt_free(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate debt-free date goal."""
        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=str(goal.target_value),
            target_unit=goal.target_unit,
            current_value='N/A',
            status='warning',
            delta_to_target='N/A',
            percentage_complete=None,
            recommendation='Debt-free projections require scenario modeling',
        )

    def _calculate_status(self, current: Decimal, target: Decimal) -> str:
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

    def _calculate_percentage(self, current: Decimal, target: Decimal) -> Decimal:
        """Calculate percentage complete."""
        if target == 0:
            return Decimal('100') if current >= 0 else Decimal('0')
        return min(Decimal('100'), (current / target) * Decimal('100'))

    def _create_default_status(self, goal: Goal) -> GoalStatusDTO:
        """Create default status when metrics are unavailable."""
        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=str(goal.target_value),
            target_unit=goal.target_unit,
            current_value='N/A',
            status='warning',
            delta_to_target='N/A',
            percentage_complete=None,
            recommendation='Add financial data to evaluate this goal',
        )


# Alias for backwards compatibility
GoalEvaluationService = GoalEvaluator


class GoalSeekSolver:
    """
    Solver for finding required changes to achieve a goal.

    Uses binary search to find the minimal change needed to satisfy goal constraints.
    """

    MAX_ITERATIONS = 10
    DEFAULT_HORIZON_MONTHS = 24
    CONVERGENCE_THRESHOLD = Decimal('0.05')

    def __init__(self, household):
        self.household = household

    def solve_goal(self, goal: Goal, options: dict) -> GoalSolution:
        """
        Solve for required changes to achieve a goal.

        Args:
            goal: The goal to solve for
            options: Solver options including:
                - allowed_interventions: List of intervention types
                - bounds: Max values for each intervention
                - start_date: When changes would start
                - projection_months: Horizon for evaluation

        Returns:
            GoalSolution with computed plan
        """
        allowed = options.get('allowed_interventions', ['reduce_expenses', 'increase_income'])
        bounds = options.get('bounds', {})
        projection_months = options.get('projection_months', self.DEFAULT_HORIZON_MONTHS)

        # Get current baseline
        evaluator = GoalEvaluator(self.household)
        current_metrics = evaluator._get_baseline_metrics()

        if not current_metrics:
            return self._create_failed_solution(
                goal, options,
                "Cannot solve: no metrics data available"
            )

        # Get target value
        target_value = goal.target_value
        current_value = self._get_current_goal_value(goal, current_metrics)

        if current_value >= target_value:
            return self._create_success_solution(
                goal, options,
                plan=[],
                baseline_value=current_value,
                final_value=current_value,
                message="Goal already achieved - no changes needed"
            )

        # Try each intervention type
        plan = []
        final_value = current_value

        for intervention in allowed:
            if intervention == 'reduce_expenses':
                result = self._solve_expense_reduction(
                    goal, current_metrics, target_value,
                    Decimal(str(bounds.get('max_reduce_expenses_monthly', '2000'))),
                    projection_months
                )
                if result:
                    plan.append(result['change'])
                    final_value = result['final_value']
                    if final_value >= target_value:
                        break

            elif intervention == 'increase_income':
                result = self._solve_income_increase(
                    goal, current_metrics, target_value,
                    Decimal(str(bounds.get('max_increase_income_monthly', '3000'))),
                    projection_months
                )
                if result:
                    plan.append(result['change'])
                    final_value = result['final_value']
                    if final_value >= target_value:
                        break

        # Check if solution was found
        success = final_value >= target_value * Decimal('0.95')

        if success:
            return self._create_success_solution(
                goal, options,
                plan=plan,
                baseline_value=current_value,
                final_value=final_value
            )
        else:
            return self._create_failed_solution(
                goal, options,
                f"Cannot achieve goal within specified bounds. Best attempt reaches {final_value:.2f} (target: {target_value:.2f})",
                best_plan=plan,
                best_value=final_value
            )

    def _get_current_goal_value(self, goal: Goal, metrics: dict) -> Decimal:
        """Get current metric value for the goal."""
        metric_map = {
            GoalType.EMERGENCY_FUND_MONTHS: 'liquidity_months',
            GoalType.MIN_DSCR: 'dscr',
            GoalType.MIN_SAVINGS_RATE: 'savings_rate',
            GoalType.NET_WORTH_TARGET: 'net_worth',
        }
        metric_key = metric_map.get(goal.goal_type, 'net_worth')
        return metrics.get(metric_key, Decimal('0'))

    def _solve_expense_reduction(
        self,
        goal: Goal,
        metrics: dict,
        target_value: Decimal,
        max_reduction: Decimal,
        horizon_months: int
    ) -> Optional[dict]:
        """Binary search for expense reduction needed."""
        current = self._get_current_goal_value(goal, metrics)
        if current >= target_value:
            return None

        low = Decimal('0')
        high = max_reduction

        for _ in range(self.MAX_ITERATIONS):
            mid = (low + high) / Decimal('2')
            projected_value = self._estimate_with_expense_change(goal, metrics, -mid)

            if projected_value >= target_value:
                high = mid
            else:
                low = mid

            if high - low < Decimal('10'):
                break

        reduction_amount = high

        if reduction_amount <= Decimal('0') or reduction_amount > max_reduction:
            return None

        return {
            'change': {
                'change_type': 'ADJUST_TOTAL_EXPENSES',
                'name': 'Expense reduction target',
                'parameters': {
                    'monthly_adjustment': str(-reduction_amount),
                    'description': 'Expense reduction target'
                }
            },
            'final_value': self._estimate_with_expense_change(goal, metrics, -reduction_amount)
        }

    def _solve_income_increase(
        self,
        goal: Goal,
        metrics: dict,
        target_value: Decimal,
        max_increase: Decimal,
        horizon_months: int
    ) -> Optional[dict]:
        """Binary search for income increase needed."""
        current = self._get_current_goal_value(goal, metrics)
        if current >= target_value:
            return None

        low = Decimal('0')
        high = max_increase

        for _ in range(self.MAX_ITERATIONS):
            mid = (low + high) / Decimal('2')
            projected_value = self._estimate_with_income_change(goal, metrics, mid)

            if projected_value >= target_value:
                high = mid
            else:
                low = mid

            if high - low < Decimal('10'):
                break

        increase_amount = high

        if increase_amount <= Decimal('0') or increase_amount > max_increase:
            return None

        return {
            'change': {
                'change_type': 'ADJUST_TOTAL_INCOME',
                'name': 'Income increase target',
                'parameters': {
                    'monthly_adjustment': str(increase_amount),
                    'description': 'Income increase target'
                }
            },
            'final_value': self._estimate_with_income_change(goal, metrics, increase_amount)
        }

    def _estimate_with_expense_change(
        self,
        goal: Goal,
        metrics: dict,
        monthly_change: Decimal
    ) -> Decimal:
        """Estimate goal metric after expense adjustment."""
        total_income = metrics.get('total_income', Decimal('0'))
        total_expenses = metrics.get('total_expenses', Decimal('0'))
        liquid_assets = metrics.get('liquidity_months', Decimal('0')) * total_expenses

        new_expenses = max(Decimal('0'), total_expenses + monthly_change)
        new_surplus = total_income - new_expenses

        if goal.goal_type == GoalType.EMERGENCY_FUND_MONTHS:
            if new_expenses > 0:
                future_liquid = liquid_assets + (new_surplus * Decimal('12'))
                return future_liquid / new_expenses
            return Decimal('99')

        elif goal.goal_type == GoalType.MIN_SAVINGS_RATE:
            if total_income > 0:
                return new_surplus / total_income
            return Decimal('0')

        return metrics.get('net_worth', Decimal('0'))

    def _estimate_with_income_change(
        self,
        goal: Goal,
        metrics: dict,
        monthly_change: Decimal
    ) -> Decimal:
        """Estimate goal metric after income adjustment."""
        total_income = metrics.get('total_income', Decimal('0'))
        total_expenses = metrics.get('total_expenses', Decimal('0'))
        liquid_assets = metrics.get('liquidity_months', Decimal('0')) * total_expenses

        net_income_change = monthly_change * Decimal('0.70')
        new_income = total_income + net_income_change
        new_surplus = new_income - total_expenses

        if goal.goal_type == GoalType.EMERGENCY_FUND_MONTHS:
            if total_expenses > 0:
                future_liquid = liquid_assets + (new_surplus * Decimal('12'))
                return future_liquid / total_expenses
            return Decimal('99')

        elif goal.goal_type == GoalType.MIN_SAVINGS_RATE:
            if new_income > 0:
                return new_surplus / new_income
            return Decimal('0')

        return metrics.get('net_worth', Decimal('0'))

    def _create_success_solution(
        self,
        goal: Goal,
        options: dict,
        plan: list,
        baseline_value: Decimal,
        final_value: Decimal,
        message: str = ""
    ) -> GoalSolution:
        """Create a successful goal solution."""
        return GoalSolution.objects.create(
            goal=goal,
            options=options,
            plan=plan,
            result={
                'baseline_value': str(baseline_value),
                'final_value': str(final_value),
                'message': message
            },
            success=True,
            error_message=""
        )

    def _create_failed_solution(
        self,
        goal: Goal,
        options: dict,
        error: str,
        best_plan: list = None,
        best_value: Decimal = None
    ) -> GoalSolution:
        """Create a failed goal solution."""
        result = {'error': error}
        if best_plan:
            result['best_plan'] = best_plan
            result['best_value'] = str(best_value) if best_value else None

        return GoalSolution.objects.create(
            goal=goal,
            options=options,
            plan=best_plan or [],
            result=result,
            success=False,
            error_message=error
        )
