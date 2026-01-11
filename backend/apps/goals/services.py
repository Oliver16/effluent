"""Goal evaluation and goal seek solver services."""

from dataclasses import dataclass
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional
import math

from django.utils import timezone

from apps.goals.models import Goal, GoalSolution, GoalType, GoalStatus
from apps.metrics.models import MetricSnapshot
from apps.scenarios.models import ScenarioProjection
from apps.accounts.models import Account, LIABILITY_TYPES
from apps.flows.models import RecurringFlow, FlowType, DEBT_PAYMENT_CATEGORIES


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
            # savings_gap is a ratio (e.g., 0.10 for 10%), not a percentage
            savings_gap = max(Decimal('0'), target - current)
            required_surplus_increase = savings_gap * income

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
        """
        Evaluate retirement age goal by projecting when savings will support retirement.

        Uses the 4% rule: retirement savings should be 25x annual expenses.
        Projects current savings + monthly contributions forward to find when
        target is reached.
        """
        target_age = int(goal.target_value)

        # Get primary member's age
        current_age = self._get_primary_member_age()
        if current_age is None:
            return GoalStatusDTO(
                goal_id=str(goal.id),
                goal_type=goal.goal_type,
                goal_name=goal.display_name,
                target_value=str(target_age),
                target_unit='age',
                current_value='Unknown',
                status='warning',
                delta_to_target='N/A',
                percentage_complete=None,
                recommendation='Add your date of birth to enable retirement projections.',
            )

        if current_age >= target_age:
            return GoalStatusDTO(
                goal_id=str(goal.id),
                goal_type=goal.goal_type,
                goal_name=goal.display_name,
                target_value=str(target_age),
                target_unit='age',
                current_value=str(current_age),
                status='good',
                delta_to_target='0 years',
                percentage_complete='100',
                recommendation='You have reached your target retirement age!',
            )

        # Get retirement analysis
        retirement_info = self._analyze_retirement_readiness(metrics)

        if retirement_info['retirement_savings'] <= 0:
            return GoalStatusDTO(
                goal_id=str(goal.id),
                goal_type=goal.goal_type,
                goal_name=goal.display_name,
                target_value=str(target_age),
                target_unit='age',
                current_value=str(current_age),
                status='critical',
                delta_to_target=f'{target_age - current_age} years',
                percentage_complete='0',
                recommendation='No retirement savings detected. Start contributing to retirement accounts.',
            )

        # Calculate projected retirement age
        projected_age = self._project_retirement_age(
            current_age,
            retirement_info['retirement_savings'],
            retirement_info['monthly_contribution'],
            retirement_info['target_nest_egg'],
            retirement_info['assumed_return']
        )

        if projected_age is None or projected_age > 100:
            return GoalStatusDTO(
                goal_id=str(goal.id),
                goal_type=goal.goal_type,
                goal_name=goal.display_name,
                target_value=str(target_age),
                target_unit='age',
                current_value=str(current_age),
                status='critical',
                delta_to_target='N/A',
                percentage_complete='0',
                recommendation=f'At current savings rate (${retirement_info["monthly_contribution"]:,.0f}/mo), retirement goal is not achievable. Increase contributions.',
            )

        # Calculate delta and status
        delta_years = target_age - projected_age
        years_to_target = target_age - current_age
        years_to_projected = projected_age - current_age

        if projected_age <= target_age:
            status = 'good'
            recommendation = f'On track to retire at age {projected_age:.0f}, {abs(delta_years):.0f} years ahead of your target.'
        elif projected_age <= target_age + 5:
            status = 'warning'
            extra_needed = retirement_info['extra_monthly_needed']
            recommendation = f'Projected retirement age is {projected_age:.0f}, {abs(delta_years):.0f} years late. Increase savings by ${extra_needed:,.0f}/mo to hit target.'
        else:
            status = 'critical'
            extra_needed = retirement_info['extra_monthly_needed']
            recommendation = f'Projected retirement age is {projected_age:.0f}. Need ${extra_needed:,.0f}/mo more in retirement savings to retire at {target_age}.'

        # Percentage is based on how far along we are to retirement readiness
        percentage = min(Decimal('100'),
            (retirement_info['retirement_savings'] / retirement_info['target_nest_egg']) * Decimal('100')
        ) if retirement_info['target_nest_egg'] > 0 else Decimal('0')

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=str(target_age),
            target_unit='age',
            current_value=str(projected_age),
            status=status,
            delta_to_target=f'{delta_years:.0f} years',
            percentage_complete=str(percentage),
            recommendation=recommendation,
        )

    def _get_primary_member_age(self) -> Optional[int]:
        """Get the age of the primary household member."""
        from apps.core.models import HouseholdMember

        member = HouseholdMember.objects.filter(
            household=self.household,
            is_primary=True
        ).first()

        if not member:
            # Try to get the 'self' relationship member
            member = HouseholdMember.objects.filter(
                household=self.household,
                relationship='self'
            ).first()

        if not member or not member.date_of_birth:
            return None

        today = timezone.now().date()
        age = today.year - member.date_of_birth.year
        if (today.month, today.day) < (member.date_of_birth.month, member.date_of_birth.day):
            age -= 1
        return age

    def _analyze_retirement_readiness(self, metrics: dict) -> dict:
        """Analyze retirement savings and contribution rate."""
        from apps.accounts.models import Account, RETIREMENT_TYPES

        # Get retirement account balances
        retirement_savings = Decimal('0')
        retirement_accounts = Account.objects.filter(
            household=self.household,
            account_type__in=RETIREMENT_TYPES,
            is_active=True
        )
        for account in retirement_accounts:
            snapshot = account.latest_snapshot
            if snapshot:
                retirement_savings += snapshot.market_value or snapshot.balance or Decimal('0')

        # Get monthly contributions (from investment rate)
        total_income = metrics.get('total_income', Decimal('0'))
        investment_rate = Decimal('0')

        # Try to get from metrics calculator
        snapshot = MetricSnapshot.objects.filter(
            household=self.household
        ).order_by('-as_of_date').first()

        if snapshot:
            investment_rate = snapshot.investment_rate or Decimal('0')

        monthly_contribution = total_income * investment_rate

        # Calculate target nest egg using 4% rule (25x annual expenses)
        annual_expenses = metrics.get('total_expenses', Decimal('0')) * Decimal('12')
        target_nest_egg = annual_expenses * Decimal('25')

        # Assumed real return rate (after inflation)
        assumed_return = Decimal('0.05')  # 5% real return

        # Calculate extra monthly needed to hit target (simplified)
        extra_monthly_needed = Decimal('0')

        return {
            'retirement_savings': retirement_savings,
            'monthly_contribution': monthly_contribution,
            'target_nest_egg': target_nest_egg,
            'assumed_return': assumed_return,
            'extra_monthly_needed': extra_monthly_needed,
        }

    def _project_retirement_age(
        self,
        current_age: int,
        current_savings: Decimal,
        monthly_contribution: Decimal,
        target_nest_egg: Decimal,
        annual_return: Decimal
    ) -> Optional[int]:
        """Project at what age retirement target will be reached."""
        if target_nest_egg <= 0:
            return current_age

        if current_savings >= target_nest_egg:
            return current_age

        if monthly_contribution <= 0:
            # No contributions - will never reach target
            return None

        # Future value calculation with regular contributions
        # FV = PV(1+r)^n + PMT * ((1+r)^n - 1) / r
        # We need to solve for n such that FV >= target

        monthly_rate = float(annual_return) / 12
        pv = float(current_savings)
        pmt = float(monthly_contribution)
        fv_target = float(target_nest_egg)

        # Binary search for months needed
        low_months = 0
        high_months = 50 * 12  # 50 years max

        while low_months < high_months:
            mid_months = (low_months + high_months) // 2
            if monthly_rate > 0:
                fv = pv * ((1 + monthly_rate) ** mid_months) + pmt * (((1 + monthly_rate) ** mid_months - 1) / monthly_rate)
            else:
                fv = pv + pmt * mid_months

            if fv >= fv_target:
                high_months = mid_months
            else:
                low_months = mid_months + 1

        years_needed = low_months / 12
        return int(current_age + years_needed)

    def _evaluate_debt_free(self, goal: Goal, metrics: dict) -> GoalStatusDTO:
        """Evaluate debt-free date goal by projecting when current debt will be paid off."""
        target_date = goal.target_date
        if not target_date:
            return self._create_default_status(goal)

        # Get debt analysis
        debt_info = self._analyze_household_debt()

        if debt_info['total_balance'] <= 0:
            # Already debt-free
            return GoalStatusDTO(
                goal_id=str(goal.id),
                goal_type=goal.goal_type,
                goal_name=goal.display_name,
                target_value=str(target_date),
                target_unit='date',
                current_value='Debt-free',
                status='good',
                delta_to_target='0 months',
                percentage_complete='100',
                recommendation='Congratulations! You are already debt-free.',
            )

        # Calculate projected payoff date
        projected_payoff = self._calculate_payoff_date(
            debt_info['total_balance'],
            debt_info['monthly_payment'],
            debt_info['weighted_rate']
        )

        if projected_payoff is None:
            return GoalStatusDTO(
                goal_id=str(goal.id),
                goal_type=goal.goal_type,
                goal_name=goal.display_name,
                target_value=str(target_date),
                target_unit='date',
                current_value='Never (payments too low)',
                status='critical',
                delta_to_target='N/A',
                percentage_complete='0',
                recommendation='Your current payments are not enough to pay down the debt. Increase payments to make progress.',
            )

        # Calculate delta in months
        today = timezone.now().date()
        months_to_target = (target_date.year - today.year) * 12 + (target_date.month - today.month)
        months_to_payoff = (projected_payoff.year - today.year) * 12 + (projected_payoff.month - today.month)
        delta_months = months_to_target - months_to_payoff

        # Determine status
        if projected_payoff <= target_date:
            status = 'good'
            recommendation = f'On track to be debt-free by {projected_payoff.strftime("%b %Y")}, ahead of your {target_date.strftime("%b %Y")} target.'
        elif months_to_payoff <= months_to_target * Decimal('1.25'):
            status = 'warning'
            recommendation = f'Projected payoff is {projected_payoff.strftime("%b %Y")}, {abs(delta_months)} months after target. Consider increasing payments by ${debt_info["extra_needed_monthly"]:.0f}/mo.'
        else:
            status = 'critical'
            recommendation = f'Projected payoff is {projected_payoff.strftime("%b %Y")}, {abs(delta_months)} months late. Increase payments by ${debt_info["extra_needed_monthly"]:.0f}/mo to reach goal.'

        # Calculate percentage (inverse - how close to target vs projected)
        percentage = min(Decimal('100'), (Decimal(str(months_to_target)) / Decimal(str(max(1, months_to_payoff)))) * Decimal('100'))

        return GoalStatusDTO(
            goal_id=str(goal.id),
            goal_type=goal.goal_type,
            goal_name=goal.display_name,
            target_value=str(target_date),
            target_unit='date',
            current_value=projected_payoff.strftime('%Y-%m-%d'),
            status=status,
            delta_to_target=f'{delta_months} months',
            percentage_complete=str(percentage),
            recommendation=recommendation,
        )

    def _analyze_household_debt(self) -> dict:
        """Analyze household debt balances and payments."""
        total_balance = Decimal('0')
        weighted_rate_sum = Decimal('0')
        monthly_payment = Decimal('0')

        # Get all liability accounts with their details
        liabilities = Account.objects.filter(
            household=self.household,
            account_type__in=LIABILITY_TYPES,
            is_active=True
        ).select_related('liability_details')

        for account in liabilities:
            snapshot = account.latest_snapshot
            if snapshot:
                balance = abs(snapshot.balance)
                total_balance += balance

                # Get interest rate
                rate = Decimal('0')
                if hasattr(account, 'liability_details') and account.liability_details:
                    rate = account.liability_details.interest_rate or Decimal('0')
                weighted_rate_sum += balance * rate

        # Get monthly debt payments
        debt_flows = RecurringFlow.objects.filter(
            household=self.household,
            flow_type=FlowType.EXPENSE,
            is_active=True
        )
        for flow in debt_flows:
            if flow.is_debt_payment and flow.is_active_on(timezone.now().date()):
                monthly_payment += flow.monthly_amount

        weighted_rate = weighted_rate_sum / total_balance if total_balance > 0 else Decimal('0')

        return {
            'total_balance': total_balance,
            'monthly_payment': monthly_payment,
            'weighted_rate': weighted_rate,
            'extra_needed_monthly': Decimal('0'),  # Will be calculated by solver
        }

    def _calculate_payoff_date(
        self,
        balance: Decimal,
        monthly_payment: Decimal,
        annual_rate: Decimal
    ) -> Optional[date]:
        """Calculate when debt will be paid off given balance, payment, and rate."""
        if balance <= 0:
            return timezone.now().date()

        if monthly_payment <= 0:
            return None

        monthly_rate = annual_rate / Decimal('12')

        # If payment doesn't cover interest, debt will never be paid off
        interest_only = balance * monthly_rate
        if monthly_payment <= interest_only:
            return None

        # Calculate months to payoff using amortization formula
        # n = -log(1 - (r * P / M)) / log(1 + r)
        # where P = principal, M = monthly payment, r = monthly rate
        if monthly_rate > 0:
            try:
                numerator = float(monthly_payment) - float(balance * monthly_rate)
                if numerator <= 0:
                    return None
                months = -math.log(1 - (float(monthly_rate) * float(balance) / float(monthly_payment))) / math.log(1 + float(monthly_rate))
                months = int(math.ceil(months))
            except (ValueError, ZeroDivisionError):
                return None
        else:
            # No interest - simple division
            months = int(math.ceil(float(balance / monthly_payment)))

        return timezone.now().date() + relativedelta(months=months)

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
    Supports combined optimization to find optimal mix of interventions.
    """

    MAX_ITERATIONS = 15
    DEFAULT_HORIZON_MONTHS = 24
    CONVERGENCE_THRESHOLD = Decimal('0.05')

    def __init__(self, household):
        self.household = household
        self._evaluator = GoalEvaluator(household)

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
                - optimize_combined: If True, find optimal mix of interventions

        Returns:
            GoalSolution with computed plan
        """
        # Route to specialized solvers for specific goal types
        if goal.goal_type == GoalType.DEBT_FREE_DATE:
            return self._solve_debt_free_goal(goal, options)
        elif goal.goal_type == GoalType.RETIREMENT_AGE:
            return self._solve_retirement_goal(goal, options)
        else:
            return self._solve_metric_goal(goal, options)

    def _solve_metric_goal(self, goal: Goal, options: dict) -> GoalSolution:
        """Solve for metric-based goals (emergency fund, DSCR, savings rate, net worth)."""
        allowed = options.get('allowed_interventions', ['reduce_expenses', 'increase_income'])
        bounds = options.get('bounds', {})
        projection_months = options.get('projection_months', self.DEFAULT_HORIZON_MONTHS)
        optimize_combined = options.get('optimize_combined', True)

        # Get current baseline
        current_metrics = self._evaluator._get_baseline_metrics()

        if not current_metrics:
            return self._create_failed_solution(
                goal, options,
                "Cannot solve: no metrics data available"
            )

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

        if optimize_combined and len(allowed) > 1:
            # Combined optimization: find optimal mix
            return self._solve_combined_optimization(
                goal, current_metrics, target_value, current_value, allowed, bounds, projection_months, options
            )
        else:
            # Sequential: try each intervention in order
            return self._solve_sequential(
                goal, current_metrics, target_value, current_value, allowed, bounds, projection_months, options
            )

    def _solve_combined_optimization(
        self,
        goal: Goal,
        metrics: dict,
        target_value: Decimal,
        current_value: Decimal,
        allowed: list,
        bounds: dict,
        projection_months: int,
        options: dict
    ) -> GoalSolution:
        """
        Find optimal combination of interventions.

        Uses a greedy approach: find the most cost-effective intervention at each step,
        then combine them to minimize total required change.
        """
        plan = []
        remaining_gap = target_value - current_value

        # Calculate effectiveness of each intervention (value gained per dollar)
        intervention_effectiveness = []

        if 'reduce_expenses' in allowed:
            max_exp = Decimal(str(bounds.get('max_reduce_expenses_monthly', '2000')))
            test_value = self._estimate_with_expense_change(goal, metrics, -Decimal('100'))
            effectiveness = (test_value - current_value) / Decimal('100') if test_value > current_value else Decimal('0')
            intervention_effectiveness.append(('reduce_expenses', effectiveness, max_exp))

        if 'increase_income' in allowed:
            max_inc = Decimal(str(bounds.get('max_increase_income_monthly', '3000')))
            test_value = self._estimate_with_income_change(goal, metrics, Decimal('100'))
            effectiveness = (test_value - current_value) / Decimal('100') if test_value > current_value else Decimal('0')
            intervention_effectiveness.append(('increase_income', effectiveness, max_inc))

        if 'accelerate_debt' in allowed:
            max_debt = Decimal(str(bounds.get('max_accelerate_debt_monthly', '1000')))
            # For debt acceleration, effectiveness depends on goal type
            intervention_effectiveness.append(('accelerate_debt', Decimal('0.5'), max_debt))

        # Sort by effectiveness (highest first)
        intervention_effectiveness.sort(key=lambda x: x[1], reverse=True)

        # Allocate budget proportionally based on effectiveness
        total_effectiveness = sum(e[1] for e in intervention_effectiveness if e[1] > 0)
        if total_effectiveness <= 0:
            # Fall back to sequential
            return self._solve_sequential(
                goal, metrics, target_value, current_value, allowed, bounds, projection_months, options
            )

        final_value = current_value
        modified_metrics = dict(metrics)

        for intervention, effectiveness, max_amount in intervention_effectiveness:
            if effectiveness <= 0:
                continue

            # Calculate how much of this intervention to use
            proportion = effectiveness / total_effectiveness
            # Use binary search to find exact amount needed

            if intervention == 'reduce_expenses':
                result = self._solve_expense_reduction(
                    goal, modified_metrics, target_value,
                    max_amount, projection_months
                )
                if result:
                    plan.append(result['change'])
                    # Update metrics for next iteration
                    adjustment = Decimal(result['change']['parameters']['monthly_adjustment'])
                    modified_metrics['total_expenses'] = modified_metrics.get('total_expenses', Decimal('0')) + adjustment
                    final_value = result['final_value']

            elif intervention == 'increase_income':
                result = self._solve_income_increase(
                    goal, modified_metrics, target_value,
                    max_amount, projection_months
                )
                if result:
                    plan.append(result['change'])
                    adjustment = Decimal(result['change']['parameters']['monthly_adjustment'])
                    modified_metrics['total_income'] = modified_metrics.get('total_income', Decimal('0')) + adjustment
                    final_value = result['final_value']

            if final_value >= target_value:
                break

        success = final_value >= target_value * Decimal('0.95')

        if success:
            return self._create_success_solution(
                goal, options,
                plan=plan,
                baseline_value=current_value,
                final_value=final_value,
                message="Combined optimization found a solution"
            )
        else:
            return self._create_failed_solution(
                goal, options,
                f"Combined optimization reached {final_value:.2f} (target: {target_value:.2f})",
                best_plan=plan,
                best_value=final_value
            )

    def _solve_sequential(
        self,
        goal: Goal,
        metrics: dict,
        target_value: Decimal,
        current_value: Decimal,
        allowed: list,
        bounds: dict,
        projection_months: int,
        options: dict
    ) -> GoalSolution:
        """Sequential solver: try each intervention in order."""
        plan = []
        final_value = current_value

        for intervention in allowed:
            if intervention == 'reduce_expenses':
                result = self._solve_expense_reduction(
                    goal, metrics, target_value,
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
                    goal, metrics, target_value,
                    Decimal(str(bounds.get('max_increase_income_monthly', '3000'))),
                    projection_months
                )
                if result:
                    plan.append(result['change'])
                    final_value = result['final_value']
                    if final_value >= target_value:
                        break

            elif intervention == 'accelerate_debt':
                result = self._solve_debt_acceleration(
                    goal, metrics, target_value,
                    Decimal(str(bounds.get('max_accelerate_debt_monthly', '1000'))),
                    projection_months
                )
                if result:
                    plan.append(result['change'])
                    final_value = result['final_value']
                    if final_value >= target_value:
                        break

        success = final_value >= target_value * Decimal('0.95')

        if success:
            return self._create_success_solution(
                goal, options, plan=plan, baseline_value=current_value, final_value=final_value
            )
        else:
            return self._create_failed_solution(
                goal, options,
                f"Cannot achieve goal within specified bounds. Best attempt reaches {final_value:.2f} (target: {target_value:.2f})",
                best_plan=plan, best_value=final_value
            )

    def _solve_debt_free_goal(self, goal: Goal, options: dict) -> GoalSolution:
        """Solve for debt-free date goal by calculating required extra payments."""
        target_date = goal.target_date
        if not target_date:
            return self._create_failed_solution(
                goal, options, "Debt-free goal requires a target date"
            )

        bounds = options.get('bounds', {})
        max_extra_payment = Decimal(str(bounds.get('max_accelerate_debt_monthly', '2000')))

        # Get current debt situation
        debt_info = self._evaluator._analyze_household_debt()

        if debt_info['total_balance'] <= 0:
            return self._create_success_solution(
                goal, options,
                plan=[],
                baseline_value=Decimal('0'),
                final_value=Decimal('0'),
                message="Already debt-free - no changes needed"
            )

        # Calculate current payoff date
        current_payoff = self._evaluator._calculate_payoff_date(
            debt_info['total_balance'],
            debt_info['monthly_payment'],
            debt_info['weighted_rate']
        )

        if current_payoff and current_payoff <= target_date:
            return self._create_success_solution(
                goal, options,
                plan=[],
                baseline_value=Decimal('0'),
                final_value=Decimal('0'),
                message=f"Already on track to be debt-free by {current_payoff.strftime('%b %Y')}"
            )

        # Binary search for required extra monthly payment
        today = timezone.now().date()
        target_months = (target_date.year - today.year) * 12 + (target_date.month - today.month)

        if target_months <= 0:
            return self._create_failed_solution(
                goal, options, "Target date is in the past"
            )

        # Calculate minimum payment needed to pay off in target_months
        # Using amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
        balance = debt_info['total_balance']
        monthly_rate = debt_info['weighted_rate'] / Decimal('12')

        if monthly_rate > 0:
            rate_factor = (1 + float(monthly_rate)) ** target_months
            required_payment = float(balance) * (float(monthly_rate) * rate_factor) / (rate_factor - 1)
            required_payment = Decimal(str(required_payment))
        else:
            required_payment = balance / Decimal(str(target_months))

        extra_needed = max(Decimal('0'), required_payment - debt_info['monthly_payment'])

        if extra_needed > max_extra_payment:
            return self._create_failed_solution(
                goal, options,
                f"Need ${extra_needed:.0f}/mo extra payment, but max allowed is ${max_extra_payment:.0f}/mo",
                best_plan=[{
                    'change_type': 'ADJUST_DEBT_PAYMENT',
                    'name': 'Increase debt payments',
                    'parameters': {
                        'monthly_adjustment': str(max_extra_payment),
                        'description': f'Maximum extra debt payment of ${max_extra_payment:.0f}/mo'
                    }
                }],
                best_value=max_extra_payment
            )

        plan = [{
            'change_type': 'ADJUST_DEBT_PAYMENT',
            'name': 'Increase debt payments',
            'parameters': {
                'monthly_adjustment': str(extra_needed),
                'description': f'Extra ${extra_needed:.0f}/mo toward debt to be debt-free by {target_date.strftime("%b %Y")}'
            }
        }]

        return self._create_success_solution(
            goal, options,
            plan=plan,
            baseline_value=debt_info['monthly_payment'],
            final_value=required_payment,
            message=f"Increase debt payments by ${extra_needed:.0f}/mo to reach target"
        )

    def _solve_retirement_goal(self, goal: Goal, options: dict) -> GoalSolution:
        """Solve for retirement age goal by calculating required savings increase."""
        target_age = int(goal.target_value)
        bounds = options.get('bounds', {})
        max_extra_savings = Decimal(str(bounds.get('max_increase_retirement_monthly', '2000')))

        # Get current age
        current_age = self._evaluator._get_primary_member_age()
        if current_age is None:
            return self._create_failed_solution(
                goal, options, "Cannot solve: date of birth not set for primary member"
            )

        if current_age >= target_age:
            return self._create_success_solution(
                goal, options,
                plan=[],
                baseline_value=Decimal(str(current_age)),
                final_value=Decimal(str(current_age)),
                message="Already at or past target retirement age"
            )

        # Get current retirement info
        current_metrics = self._evaluator._get_baseline_metrics() or {}
        retirement_info = self._evaluator._analyze_retirement_readiness(current_metrics)

        if retirement_info['target_nest_egg'] <= 0:
            return self._create_failed_solution(
                goal, options, "Cannot calculate retirement target - no expense data"
            )

        # Calculate required monthly savings to retire at target age
        years_to_retirement = target_age - current_age
        months_to_retirement = years_to_retirement * 12

        current_savings = float(retirement_info['retirement_savings'])
        target = float(retirement_info['target_nest_egg'])
        current_monthly = float(retirement_info['monthly_contribution'])
        annual_return = float(retirement_info['assumed_return'])
        monthly_rate = annual_return / 12

        # Future value with current savings: FV = PV(1+r)^n + PMT * ((1+r)^n - 1) / r
        if monthly_rate > 0:
            current_fv = current_savings * ((1 + monthly_rate) ** months_to_retirement)
            current_fv += current_monthly * (((1 + monthly_rate) ** months_to_retirement - 1) / monthly_rate)
        else:
            current_fv = current_savings + current_monthly * months_to_retirement

        if current_fv >= target:
            return self._create_success_solution(
                goal, options,
                plan=[],
                baseline_value=Decimal(str(current_age)),
                final_value=Decimal(str(current_age)),
                message=f"On track to retire at {target_age} with current savings rate"
            )

        # Calculate required additional monthly savings
        # We need: target = PV(1+r)^n + (current_pmt + extra) * ((1+r)^n - 1) / r
        # Solve for extra:
        # extra = (target - PV(1+r)^n - current_pmt * factor) / factor
        # where factor = ((1+r)^n - 1) / r

        if monthly_rate > 0:
            pv_factor = (1 + monthly_rate) ** months_to_retirement
            pmt_factor = (pv_factor - 1) / monthly_rate
            shortfall = target - current_savings * pv_factor - current_monthly * pmt_factor
            extra_needed = shortfall / pmt_factor if pmt_factor > 0 else Decimal('0')
        else:
            shortfall = target - current_savings - current_monthly * months_to_retirement
            extra_needed = shortfall / months_to_retirement if months_to_retirement > 0 else Decimal('0')

        extra_needed = Decimal(str(max(0, extra_needed)))

        if extra_needed > max_extra_savings:
            return self._create_failed_solution(
                goal, options,
                f"Need ${extra_needed:.0f}/mo extra retirement savings, but max is ${max_extra_savings:.0f}/mo",
                best_plan=[{
                    'change_type': 'ADJUST_RETIREMENT_SAVINGS',
                    'name': 'Increase retirement contributions',
                    'parameters': {
                        'monthly_adjustment': str(max_extra_savings),
                        'description': f'Maximum extra retirement savings of ${max_extra_savings:.0f}/mo'
                    }
                }],
                best_value=max_extra_savings
            )

        plan = [{
            'change_type': 'ADJUST_RETIREMENT_SAVINGS',
            'name': 'Increase retirement contributions',
            'parameters': {
                'monthly_adjustment': str(extra_needed),
                'description': f'Extra ${extra_needed:.0f}/mo toward retirement to retire at age {target_age}'
            }
        }]

        return self._create_success_solution(
            goal, options,
            plan=plan,
            baseline_value=retirement_info['monthly_contribution'],
            final_value=retirement_info['monthly_contribution'] + extra_needed,
            message=f"Increase retirement savings by ${extra_needed:.0f}/mo to retire at {target_age}"
        )

    def _solve_debt_acceleration(
        self,
        goal: Goal,
        metrics: dict,
        target_value: Decimal,
        max_acceleration: Decimal,
        horizon_months: int
    ) -> Optional[dict]:
        """Solve for debt acceleration to improve DSCR or other metrics."""
        # Accelerating debt payoff reduces total debt service over time
        # For now, return a simple acceleration plan
        debt_info = self._evaluator._analyze_household_debt()

        if debt_info['total_balance'] <= 0:
            return None

        # Estimate impact: extra payment reduces future interest
        # Simplified: assume extra payment reduces monthly debt service proportionally over horizon
        monthly_interest_savings = max_acceleration * debt_info['weighted_rate'] / Decimal('12')

        if monthly_interest_savings <= 0:
            return None

        return {
            'change': {
                'change_type': 'ADJUST_DEBT_PAYMENT',
                'name': 'Accelerate debt payoff',
                'parameters': {
                    'monthly_adjustment': str(max_acceleration),
                    'description': f'Extra ${max_acceleration:.0f}/mo toward debt payoff'
                }
            },
            'final_value': target_value  # Simplified - actual value would need full projection
        }

    def _get_current_goal_value(self, goal: Goal, metrics: dict) -> Decimal:
        """Get current metric value for the goal."""
        metric_map = {
            GoalType.EMERGENCY_FUND_MONTHS: 'liquidity_months',
            GoalType.MIN_DSCR: 'dscr',
            GoalType.MIN_SAVINGS_RATE: 'savings_rate',
            GoalType.NET_WORTH_TARGET: 'net_worth',
            GoalType.NET_WORTH_TARGET_BY_DATE: 'net_worth',
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
