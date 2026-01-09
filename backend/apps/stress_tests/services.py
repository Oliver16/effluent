"""
TASK-15: Stress Test Services

Services for running stress tests and analyzing results.
"""
from dataclasses import dataclass, field
from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from typing import Optional

from django.utils import timezone

from apps.scenarios.models import Scenario, ScenarioChange, ScenarioProjection, ChangeType
from apps.scenarios.services import ScenarioEngine
from .templates import get_stress_test_by_key, get_stress_test_templates


@dataclass
class ThresholdBreach:
    """A threshold breach detected during stress test."""
    metric: str
    threshold: Decimal
    first_breach_month: int
    breach_duration_months: int
    worst_value: Decimal


@dataclass
class StressTestSummary:
    """Summary of stress test results."""
    status: str  # 'passed', 'warning', 'failed'
    first_negative_cash_flow_month: Optional[int] = None
    first_liquidity_breach_month: Optional[int] = None
    min_liquidity_months: Decimal = Decimal('0')
    min_dscr: Decimal = Decimal('0')
    max_net_worth_drawdown_percent: Decimal = Decimal('0')
    breached_thresholds_count: int = 0


@dataclass
class StressTestResult:
    """Complete stress test run result."""
    test_key: str
    test_name: str
    scenario_id: str
    summary: StressTestSummary
    breaches: list = field(default_factory=list)
    monthly_comparison: dict = field(default_factory=dict)
    computed_at: str = ''


class StressTestService:
    """
    Service for running stress tests against a household's financial data.

    Creates temporary scenarios to evaluate financial resilience.
    """

    # Default thresholds for breach detection
    DEFAULT_THRESHOLDS = {
        'liquidity_months': Decimal('1.0'),
        'dscr': Decimal('1.0'),
        'savings_rate': Decimal('0.0'),
    }

    def __init__(self, household, thresholds: dict = None):
        self.household = household
        self.thresholds = thresholds or self.DEFAULT_THRESHOLDS

    def resolve_inputs(self, inputs: dict) -> dict:
        """
        Resolve dynamic input values like 'next_month'.
        """
        resolved = inputs.copy()

        if resolved.get('start_date') == 'next_month':
            next_month = date.today().replace(day=1) + relativedelta(months=1)
            resolved['start_date'] = next_month.isoformat()

        return resolved

    def run_stress_test(
        self,
        test_key: str,
        custom_inputs: dict = None,
        horizon_months: int = 60
    ) -> StressTestResult:
        """
        Run a stress test and return results.

        Args:
            test_key: Key of the stress test template
            custom_inputs: Override default inputs
            horizon_months: Projection horizon

        Returns:
            StressTestResult with summary and breach details
        """
        template = get_stress_test_by_key(test_key)
        if not template:
            raise ValueError(f"Unknown stress test: {test_key}")

        # Get baseline scenario
        baseline = Scenario.objects.filter(
            household=self.household,
            is_baseline=True
        ).first()

        if not baseline:
            raise ValueError("No baseline scenario found")

        # Resolve inputs
        inputs = template['default_inputs'].copy()
        if custom_inputs:
            inputs.update(custom_inputs)
        inputs = self.resolve_inputs(inputs)

        # Create stress test scenario
        scenario = Scenario.objects.create(
            household=self.household,
            name=f"Stress Test: {template['name']}",
            description=template['description'],
            is_baseline=False,
            parent_scenario=baseline,
            start_date=date.today(),
            projection_months=horizon_months,
            inflation_rate=baseline.inflation_rate,
            investment_return_rate=baseline.investment_return_rate,
            salary_growth_rate=baseline.salary_growth_rate,
        )

        # Create the stress change
        change_type = template['change_type']
        effective_date = date.fromisoformat(inputs.get('start_date', date.today().isoformat()))

        parameters = self._build_parameters(template, inputs)

        ScenarioChange.objects.create(
            scenario=scenario,
            change_type=change_type,
            name=template['name'],
            description=template['description'],
            effective_date=effective_date,
            parameters=parameters,
            is_enabled=True,
        )

        # Run projection
        engine = ScenarioEngine(scenario)
        engine.compute_projection()

        # Get baseline projections for comparison
        baseline_projections = list(
            ScenarioProjection.objects.filter(scenario=baseline)
            .order_by('month_number')[:horizon_months]
        )

        # Get stress test projections
        stress_projections = list(
            ScenarioProjection.objects.filter(scenario=scenario)
            .order_by('month_number')
        )

        # Analyze results
        summary, breaches = self._analyze_results(
            baseline_projections,
            stress_projections
        )

        # Build monthly comparison
        monthly_comparison = self._build_monthly_comparison(
            baseline_projections,
            stress_projections
        )

        return StressTestResult(
            test_key=test_key,
            test_name=template['name'],
            scenario_id=str(scenario.id),
            summary=summary,
            breaches=breaches,
            monthly_comparison=monthly_comparison,
            computed_at=timezone.now().isoformat(),
        )

    def _build_parameters(self, template: dict, inputs: dict) -> dict:
        """Build parameters for the change type."""
        change_type = template['change_type']

        if change_type in [ChangeType.ADJUST_TOTAL_INCOME, ChangeType.ADJUST_TOTAL_EXPENSES]:
            # Support both legacy (monthly_adjustment) and new (amount/mode) schemas
            # The engine handles both, but we prefer the new schema when mode is provided
            if 'mode' in inputs:
                return {
                    'amount': inputs.get('amount', '0'),
                    'mode': inputs.get('mode', 'absolute'),
                    'description': template['description'],
                }
            else:
                return {
                    'monthly_adjustment': inputs.get('monthly_adjustment', inputs.get('amount', '0')),
                    'description': template['description'],
                }
        elif change_type == ChangeType.ADJUST_INTEREST_RATES:
            return {
                'adjustment_percent': inputs.get('adjustment_percent', '0'),
                'applies_to': inputs.get('applies_to', 'all'),
            }
        elif change_type == ChangeType.ADJUST_INVESTMENT_VALUE:
            # percent_change should be in percentage points (e.g., -20 for -20%)
            # Convert from ratio if provided as ratio (between -1 and 1)
            percent_change = inputs.get('percent_change', '0')
            try:
                pct = float(percent_change)
                if -1 <= pct <= 1 and pct != 0:
                    percent_change = str(pct * 100)
            except (ValueError, TypeError):
                pass
            return {
                'percent_change': percent_change,
                'recovery_months': inputs.get('recovery_months', 36),
                'applies_to': inputs.get('applies_to', 'all'),
            }
        elif change_type == ChangeType.OVERRIDE_INFLATION:
            return {
                'rate': inputs.get('inflation_rate', '0.03'),
                'duration_months': inputs.get('duration_months', 12),
            }
        else:
            return inputs

    def _analyze_results(
        self,
        baseline_projections: list,
        stress_projections: list
    ) -> tuple:
        """Analyze stress test results and detect breaches."""
        summary = StressTestSummary(status='passed')
        breaches = []

        min_liquidity = Decimal('999')
        min_dscr = Decimal('999')
        max_drawdown = Decimal('0')

        liquidity_breach_start = None
        liquidity_breach_worst = Decimal('999')

        baseline_nw_max = Decimal('0')

        for i, stress_proj in enumerate(stress_projections):
            month = stress_proj.month_number

            # Track baseline max for drawdown
            if i < len(baseline_projections):
                baseline_nw = baseline_projections[i].net_worth
                baseline_nw_max = max(baseline_nw_max, baseline_nw)

            # Track minimums
            liquidity = stress_proj.liquidity_months
            dscr = stress_proj.dscr

            min_liquidity = min(min_liquidity, liquidity)
            min_dscr = min(min_dscr, dscr)

            # Check cash flow
            if stress_proj.net_cash_flow < 0 and summary.first_negative_cash_flow_month is None:
                summary.first_negative_cash_flow_month = month

            # Check liquidity breach
            threshold = self.thresholds.get('liquidity_months', Decimal('1.0'))
            if liquidity < threshold:
                if summary.first_liquidity_breach_month is None:
                    summary.first_liquidity_breach_month = month
                    liquidity_breach_start = month
                liquidity_breach_worst = min(liquidity_breach_worst, liquidity)

            # Calculate drawdown
            if baseline_nw_max > 0:
                drawdown = ((baseline_nw_max - stress_proj.net_worth) / baseline_nw_max) * Decimal('100')
                max_drawdown = max(max_drawdown, drawdown)

        summary.min_liquidity_months = min_liquidity
        summary.min_dscr = min_dscr
        summary.max_net_worth_drawdown_percent = max_drawdown

        # Record liquidity breach if any
        if liquidity_breach_start:
            # Calculate duration
            duration = len(stress_projections) - liquidity_breach_start + 1
            breaches.append({
                'metric': 'liquidity_months',
                'threshold': float(self.thresholds.get('liquidity_months', 1.0)),
                'first_breach_month': liquidity_breach_start,
                'breach_duration_months': duration,
                'worst_value': float(liquidity_breach_worst),
            })
            summary.breached_thresholds_count += 1

        # Check DSCR breach
        dscr_threshold = self.thresholds.get('dscr', Decimal('1.0'))
        if min_dscr < dscr_threshold:
            summary.breached_thresholds_count += 1

        # Determine overall status
        if summary.first_liquidity_breach_month or min_dscr < Decimal('0.8'):
            summary.status = 'failed'
        elif min_liquidity < Decimal('3') or min_dscr < Decimal('1.2'):
            summary.status = 'warning'
        else:
            summary.status = 'passed'

        return summary, breaches

    def _build_monthly_comparison(
        self,
        baseline_projections: list,
        stress_projections: list
    ) -> dict:
        """Build month-by-month comparison data."""
        months = []
        baseline_liquidity = []
        stressed_liquidity = []
        baseline_net_worth = []
        stressed_net_worth = []

        for i, stress_proj in enumerate(stress_projections):
            months.append(stress_proj.month_number)
            stressed_liquidity.append(float(stress_proj.liquidity_months))
            stressed_net_worth.append(float(stress_proj.net_worth))

            if i < len(baseline_projections):
                baseline_liquidity.append(float(baseline_projections[i].liquidity_months))
                baseline_net_worth.append(float(baseline_projections[i].net_worth))
            else:
                baseline_liquidity.append(None)
                baseline_net_worth.append(None)

        return {
            'months': months,
            'baseline_liquidity': baseline_liquidity,
            'stressed_liquidity': stressed_liquidity,
            'baseline_net_worth': baseline_net_worth,
            'stressed_net_worth': stressed_net_worth,
        }

    def list_available_tests(self) -> list:
        """List all available stress tests."""
        templates = get_stress_test_templates()
        return [
            {
                'key': key,
                'name': t['name'],
                'category': t['category'],
                'description': t['description'],
                'severity': t.get('severity', 'warning'),
            }
            for key, t in templates.items()
        ]
