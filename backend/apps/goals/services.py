"""
Goal evaluation and goal seek solver services.

This module provides:
- Goal evaluation against current metrics or scenario projections
- Goal seek solver for computing required changes to achieve goals
"""
from decimal import Decimal
from datetime import date, timedelta
from typing import Optional
from dataclasses import dataclass
from django.utils import timezone

from apps.core.models import Household
from apps.metrics.models import MetricSnapshot
from apps.metrics.services import MetricsCalculator
from apps.scenarios.models import Scenario, ScenarioProjection
from .models import Goal, GoalSolution, GoalType, GoalStatus


@dataclass
class GoalStatusDTO:
    """Data transfer object for goal status."""
    goal_id: str
    goal_type: str
    goal_name: str
    target_value: Decimal
    target_unit: str
    current_value: Decimal
    status: str
    delta_to_target: Decimal
    percentage_complete: Optional[Decimal]
    recommendation: str


class GoalEvaluator:
    """
    Evaluates goals against current metrics or scenario projections.
    """

    def __init__(self, household: Household):
        self.household = household

    def evaluate_goals(
        self,
        as_of_date: Optional[date] = None,
        scenario_id: Optional[str] = None
    ) -> list[GoalStatusDTO]:
        """
        Evaluate all active goals for the household.

        Args:
            as_of_date: Date to evaluate as-of (defaults to today)
            scenario_id: If provided, evaluate against scenario projections

        Returns:
            List of GoalStatusDTO with evaluation results
        """
        results = []
        goals = Goal.objects.filter(
            household=self.household,
            is_active=True
        ).order_by('-is_primary', '-created_at')

        # Get the metric values source
        if scenario_id:
            metrics = self._get_scenario_metrics(scenario_id)
        else:
            metrics = self._get_current_metrics(as_of_date)

        if not metrics:
            # Return goals with unknown status if no metrics available
            for goal in goals:
                results.append(GoalStatusDTO(
                    goal_id=str(goal.id),
                    goal_type=goal.goal_type,
                    goal_name=goal.display_name,
                    target_value=goal.target_value,
                    target_unit=goal.target_unit,
                    current_value=Decimal('0'),
                    status=GoalStatus.WARNING,
                    delta_to_target=goal.target_value,
                    percentage_complete=Decimal('0'),
                    recommendation="Unable to evaluate - no metrics data available"
                ))
            return results

        for goal in goals:
            result = self._evaluate_single_goal(goal, metrics)
            results.append(result)

            # Update goal status in database
            goal.current_status = result.status
            goal.current_value = result.current_value
            goal.last_evaluated_at = timezone.now()
            goal.save(update_fields=['current_status', 'current_value', 'last_evaluated_at'])

        return results

    def _get_current_metrics(self, as_of_date: Optional[date] = None) -> Optional[dict]:
        """Get metrics from latest MetricSnapshot or calculate fresh."""
        as_of_date = as_of_date or date.today()

        # Try to get existing snapshot
        snapshot = MetricSnapshot.objects.filter(
            household=self.household,
            as_of_date=as_of_date
        ).first()

        # If no snapshot for today, try to calculate
        if not snapshot:
            try:
                calc = MetricsCalculator(self.household, as_of_date)
                snapshot = calc.calculate_all_metrics()
            except Exception:
                # Return last known snapshot if calculation fails
                snapshot = MetricSnapshot.objects.filter(
                    household=self.household
                ).order_by('-as_of_date').first()

        if not snapshot:
            return None

        return {
            'net_worth': snapshot.net_worth_market,
            'liquidity_months': snapshot.liquidity_months,
            'dscr': snapshot.dscr,
            'savings_rate': snapshot.savings_rate,
            'total_income': snapshot.total_monthly_income,
            'total_expenses': snapshot.total_monthly_expenses,
            'monthly_surplus': snapshot.monthly_surplus,
        }

    def _get_scenario_metrics(self, scenario_id: str) -> Optional[dict]:
        """Get metrics from scenario projections."""
        try:
            scenario = Scenario.objects.get(
                id=scenario_id,
                household=self.household
            )
        except Scenario.DoesNotExist:
            return None

        # Get latest projection
        projection = scenario.projections.order_by('-month_number').first()
        if not projection:
            return None

        return {
            'net_worth': projection.net_worth,
            'liquidity_months': projection.liquidity_months,
            'dscr': projection.dscr,
            'savings_rate': projection.savings_rate,
            'total_income': projection.total_income,
            'total_expenses': projection.total_expenses,
            'monthly_surplus': projection.net_cash_flow,
        }

    def _evaluate_single_goal(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate a single goal against metrics."""
        current_value = Decimal('0')
        status = GoalStatus.WARNING
        delta = goal.target_value
        percentage = Decimal('0')
        recommendation = ""

        goal_type = goal.goal_type
        target = goal.target_value

        if goal_type == GoalType.EMERGENCY_FUND_MONTHS:
            current_value = metrics.get('liquidity_months', Decimal('0'))
            delta, status, percentage = self._evaluate_numeric_goal(current_value, target, higher_is_better=True)
            recommendation = self._generate_liquidity_recommendation(goal, current_value, metrics)

        elif goal_type == GoalType.MIN_DSCR:
            current_value = metrics.get('dscr', Decimal('0'))
            delta, status, percentage = self._evaluate_numeric_goal(current_value, target, higher_is_better=True)
            recommendation = self._generate_dscr_recommendation(goal, current_value, metrics)

        elif goal_type == GoalType.MIN_SAVINGS_RATE:
            current_value = metrics.get('savings_rate', Decimal('0'))
            # Convert to percentage for display if needed
            if goal.target_unit == 'percent' and target <= 1:
                current_value = current_value * Decimal('100') if current_value < Decimal('1') else current_value
            delta, status, percentage = self._evaluate_numeric_goal(current_value, target, higher_is_better=True)
            recommendation = self._generate_savings_recommendation(goal, current_value, metrics)

        elif goal_type == GoalType.NET_WORTH_TARGET:
            current_value = metrics.get('net_worth', Decimal('0'))
            delta, status, percentage = self._evaluate_numeric_goal(current_value, target, higher_is_better=True)
            recommendation = self._generate_net_worth_recommendation(goal, current_value, metrics)

        elif goal_type == GoalType.RETIREMENT_AGE:
            # Retirement age evaluation requires more complex logic
            # For now, just store target - needs actual retirement projection
            current_value = target  # Placeholder
            status = GoalStatus.ON_TRACK
            delta = Decimal('0')
            percentage = Decimal('100')
            recommendation = "Retirement planning requires long-horizon projections."

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=target,
            target_unit=goal.target_unit,
            current_value=current_value,
            status=status,
            delta_to_target=delta,
            percentage_complete=percentage,
            recommendation=recommendation
        )

    def _evaluate_numeric_goal(
        self,
        current: Decimal,
        target: Decimal,
        higher_is_better: bool = True
    ) -> tuple[Decimal, str, Decimal]:
        """
        Evaluate a numeric goal.

        Returns:
            Tuple of (delta_to_target, status, percentage_complete)
        """
        delta = target - current

        # Calculate percentage complete
        if target == Decimal('0'):
            percentage = Decimal('100') if current >= Decimal('0') else Decimal('0')
        elif higher_is_better:
            percentage = min(Decimal('100'), (current / target) * Decimal('100'))
        else:
            percentage = min(Decimal('100'), (target / current) * Decimal('100')) if current > 0 else Decimal('0')

        # Determine status
        if higher_is_better:
            if current >= target:
                status = GoalStatus.ACHIEVED
            elif current >= target * Decimal('0.75'):
                status = GoalStatus.ON_TRACK
            elif current >= target * Decimal('0.5'):
                status = GoalStatus.WARNING
            else:
                status = GoalStatus.CRITICAL
        else:
            if current <= target:
                status = GoalStatus.ACHIEVED
            elif current <= target * Decimal('1.25'):
                status = GoalStatus.ON_TRACK
            elif current <= target * Decimal('1.5'):
                status = GoalStatus.WARNING
            else:
                status = GoalStatus.CRITICAL

        return delta, status, percentage

    def _generate_liquidity_recommendation(
        self,
        goal: Goal,
        current: Decimal,
        metrics: dict
    ) -> str:
        """Generate recommendation for liquidity/emergency fund goal."""
        if current >= goal.target_value:
            return "Emergency fund goal achieved! Consider maintaining this level."

        monthly_expenses = metrics.get('total_expenses', Decimal('1'))
        if monthly_expenses <= 0:
            return "Add expense data to get accurate recommendations."

        dollar_gap = max(Decimal('0'), (goal.target_value - current) * monthly_expenses)
        months_to_goal = Decimal(goal.target_meta.get('months_to_goal', 24))
        monthly_gap = dollar_gap / months_to_goal if months_to_goal > 0 else dollar_gap

        return f"Increase liquidity by ${dollar_gap:,.0f} or increase surplus by ${monthly_gap:,.0f}/mo"

    def _generate_dscr_recommendation(
        self,
        goal: Goal,
        current: Decimal,
        metrics: dict
    ) -> str:
        """Generate recommendation for DSCR goal."""
        if current >= goal.target_value:
            return "DSCR goal achieved! Your debt coverage is healthy."

        total_expenses = metrics.get('total_expenses', Decimal('0'))
        total_income = metrics.get('total_income', Decimal('0'))

        # Estimate required adjustment
        if total_expenses > 0 and current < goal.target_value:
            # Required additional income or expense reduction
            gap = goal.target_value - current
            adjustment = gap * total_expenses * Decimal('0.3')  # Rough estimate
            return f"Increase net income by ${adjustment:,.0f}/mo or reduce debt payments by a similar amount"

        return "Reduce debt service or increase income to improve DSCR."

    def _generate_savings_recommendation(
        self,
        goal: Goal,
        current: Decimal,
        metrics: dict
    ) -> str:
        """Generate recommendation for savings rate goal."""
        if current >= goal.target_value:
            return "Savings rate goal achieved! Keep up the great work."

        total_income = metrics.get('total_income', Decimal('1'))
        if total_income <= 0:
            return "Add income data to get accurate recommendations."

        savings_gap = max(Decimal('0'), goal.target_value - current)
        # Convert to percentage if needed
        if savings_gap > 1:
            savings_gap = savings_gap / Decimal('100')

        required_surplus_increase = savings_gap * total_income

        return f"Increase surplus by ${required_surplus_increase:,.0f}/mo (reduce expenses or raise income)."

    def _generate_net_worth_recommendation(
        self,
        goal: Goal,
        current: Decimal,
        metrics: dict
    ) -> str:
        """Generate recommendation for net worth target goal."""
        if current >= goal.target_value:
            return "Net worth goal achieved! Consider setting a new milestone."

        gap = goal.target_value - current

        if goal.target_date:
            months_until = max(1, (goal.target_date - date.today()).days / 30)
            monthly_needed = gap / Decimal(months_until)
            return f"Need to grow net worth by ${gap:,.0f}. Save ${monthly_needed:,.0f}/mo to reach goal by target date."

        return f"Net worth gap: ${gap:,.0f}. Focus on increasing savings and investments."


class GoalSeekSolver:
    """
    Solver for finding required changes to achieve a goal.

    Uses binary search to find the minimal change needed to satisfy goal constraints.
    """

    MAX_ITERATIONS = 10  # 5 coarse + 5 fine
    DEFAULT_HORIZON_MONTHS = 24
    CONVERGENCE_THRESHOLD = Decimal('0.05')  # 5% tolerance

    def __init__(self, household: Household):
        self.household = household

    def solve_goal(
        self,
        goal: Goal,
        options: dict
    ) -> GoalSolution:
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
        start_date = options.get('start_date', date.today().replace(day=1) + timedelta(days=32))
        start_date = start_date.replace(day=1)  # First of month
        projection_months = options.get('projection_months', self.DEFAULT_HORIZON_MONTHS)

        # Get current baseline
        evaluator = GoalEvaluator(self.household)
        current_metrics = evaluator._get_current_metrics()

        if not current_metrics:
            return self._create_failed_solution(
                goal, options,
                "Cannot solve: no metrics data available"
            )

        # Get target value
        target_value = self._get_goal_metric_value(goal, goal.target_value)
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
                    bounds.get('max_reduce_expenses_monthly', Decimal('2000')),
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
                    bounds.get('max_increase_income_monthly', Decimal('3000')),
                    projection_months
                )
                if result:
                    plan.append(result['change'])
                    final_value = result['final_value']
                    if final_value >= target_value:
                        break

            elif intervention == 'payoff_debt':
                result = self._solve_debt_payoff(
                    goal, current_metrics, target_value,
                    bounds.get('max_extra_debt_payment_monthly', Decimal('1000'))
                )
                if result:
                    plan.append(result['change'])
                    final_value = result['final_value']

        # Check if solution was found
        success = final_value >= target_value * Decimal('0.95')  # Within 5%

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

    def _get_goal_metric_value(self, goal: Goal, target: Decimal) -> Decimal:
        """Get the target metric value based on goal type."""
        # For percentage goals stored as 0-100, normalize to 0-1
        if goal.goal_type == GoalType.MIN_SAVINGS_RATE and goal.target_unit == 'percent':
            return target / Decimal('100') if target > 1 else target
        return target

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

        # Binary search
        low = Decimal('0')
        high = max_reduction

        for _ in range(self.MAX_ITERATIONS):
            mid = (low + high) / Decimal('2')

            # Estimate effect of expense reduction
            projected_value = self._estimate_with_expense_change(goal, metrics, -mid)

            if projected_value >= target_value:
                high = mid
            else:
                low = mid

            # Check convergence
            if high - low < Decimal('10'):  # $10 tolerance
                break

        reduction_amount = high

        if reduction_amount <= Decimal('0') or reduction_amount > max_reduction:
            return None

        return {
            'change': {
                'change_type': 'ADJUST_TOTAL_EXPENSES',
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

        # Binary search
        low = Decimal('0')
        high = max_increase

        for _ in range(self.MAX_ITERATIONS):
            mid = (low + high) / Decimal('2')

            # Estimate effect of income increase
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
                'parameters': {
                    'monthly_adjustment': str(increase_amount),
                    'description': 'Income increase target',
                    'tax_treatment': 'w2'
                }
            },
            'final_value': self._estimate_with_income_change(goal, metrics, increase_amount)
        }

    def _solve_debt_payoff(
        self,
        goal: Goal,
        metrics: dict,
        target_value: Decimal,
        max_extra_payment: Decimal
    ) -> Optional[dict]:
        """Find debt payoff strategy."""
        # This is a simplified version - full implementation would iterate over debts
        current = self._get_current_goal_value(goal, metrics)
        if current >= target_value:
            return None

        # For now, return None - debt payoff requires more complex account iteration
        return None

    def _estimate_with_expense_change(
        self,
        goal: Goal,
        metrics: dict,
        monthly_change: Decimal
    ) -> Decimal:
        """Estimate goal metric after expense adjustment."""
        # Simple estimation without full projection
        total_income = metrics.get('total_income', Decimal('0'))
        total_expenses = metrics.get('total_expenses', Decimal('0'))
        liquid_assets = metrics.get('liquidity_months', Decimal('0')) * total_expenses

        new_expenses = max(Decimal('0'), total_expenses + monthly_change)
        new_surplus = total_income - new_expenses

        if goal.goal_type == GoalType.EMERGENCY_FUND_MONTHS:
            # Estimate liquidity improvement over time
            if new_expenses > 0:
                # After 12 months of saving
                future_liquid = liquid_assets + (new_surplus * Decimal('12'))
                return future_liquid / new_expenses
            return Decimal('99')

        elif goal.goal_type == GoalType.MIN_SAVINGS_RATE:
            if total_income > 0:
                return new_surplus / total_income
            return Decimal('0')

        elif goal.goal_type == GoalType.MIN_DSCR:
            debt_service = total_expenses - new_expenses  # Very rough
            if debt_service > 0:
                operating = total_income - (new_expenses - debt_service)
                return operating / debt_service
            return Decimal('999')

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

        # Apply rough tax estimate (30% tax)
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

        elif goal.goal_type == GoalType.MIN_DSCR:
            return metrics.get('dscr', Decimal('0')) * (new_income / total_income if total_income > 0 else 1)

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
