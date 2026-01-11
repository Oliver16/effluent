from decimal import Decimal
from datetime import date
from typing import Optional
from django.db.models import Sum, Q

from apps.core.models import Household
from apps.accounts.models import Account, LIQUID_TYPES, LIABILITY_TYPES, ASSET_TYPES
from apps.flows.models import RecurringFlow, FlowType, DEBT_PAYMENT_CATEGORIES, HOUSING_CATEGORIES, ESSENTIAL_CATEGORIES, FIXED_CATEGORIES
from .models import MetricSnapshot, MetricThreshold, Insight, DEFAULT_THRESHOLDS


class MetricsCalculator:
    def __init__(self, household: Household, as_of_date: Optional[date] = None):
        self.household = household
        self.as_of_date = as_of_date or date.today()

    def calculate_all_metrics(self) -> MetricSnapshot:
        """Calculate all financial metrics and create a snapshot."""
        # Get totals from accounts
        total_assets_market, total_assets_cost, total_liquid_assets = self._calculate_asset_totals()
        total_liabilities = self._calculate_liability_totals()

        # Get totals from recurring flows
        total_monthly_income, total_monthly_expenses, total_debt_service = self._calculate_flow_totals()

        # Calculate derived metrics
        net_worth_market = total_assets_market - total_liabilities
        net_worth_cost = total_assets_cost - total_liabilities
        monthly_surplus = total_monthly_income - total_monthly_expenses
        unrealized_gains = total_assets_market - total_assets_cost

        # Calculate key ratios
        dscr = self._calculate_dscr(total_monthly_income, total_monthly_expenses, total_debt_service)
        liquidity_months = self._calculate_liquidity_months(total_liquid_assets, total_monthly_expenses)
        days_cash_on_hand = self._calculate_days_cash_on_hand(total_liquid_assets, total_monthly_expenses)
        savings_rate = self._calculate_savings_rate(monthly_surplus, total_monthly_income)
        dti_ratio = self._calculate_dti_ratio(total_debt_service, total_monthly_income)
        debt_to_asset_market = self._calculate_debt_to_asset(total_liabilities, total_assets_market)
        debt_to_asset_cost = self._calculate_debt_to_asset(total_liabilities, total_assets_cost)

        # Calculate advanced metrics
        weighted_avg_interest_rate = self._calculate_weighted_avg_interest_rate()
        high_interest_debt_ratio = self._calculate_high_interest_debt_ratio(total_liabilities)
        housing_ratio = self._calculate_housing_ratio(total_monthly_income)
        fixed_expense_ratio = self._calculate_fixed_expense_ratio(total_monthly_income)
        essential_expense_ratio = self._calculate_essential_expense_ratio(total_monthly_income)
        income_concentration = self._calculate_income_concentration()
        investment_rate = self._calculate_investment_rate(total_monthly_income)

        # Create and save snapshot
        snapshot, _ = MetricSnapshot.objects.update_or_create(
            household=self.household,
            as_of_date=self.as_of_date,
            defaults={
                'net_worth_market': net_worth_market,
                'net_worth_cost': net_worth_cost,
                'monthly_surplus': monthly_surplus,
                'dscr': dscr,
                'liquidity_months': liquidity_months,
                'days_cash_on_hand': days_cash_on_hand,
                'savings_rate': savings_rate,
                'dti_ratio': dti_ratio,
                'debt_to_asset_market': debt_to_asset_market,
                'debt_to_asset_cost': debt_to_asset_cost,
                'weighted_avg_interest_rate': weighted_avg_interest_rate,
                'high_interest_debt_ratio': high_interest_debt_ratio,
                'housing_ratio': housing_ratio,
                'fixed_expense_ratio': fixed_expense_ratio,
                'essential_expense_ratio': essential_expense_ratio,
                'income_concentration': income_concentration,
                'unrealized_gains': unrealized_gains,
                'investment_rate': investment_rate,
                'total_assets_market': total_assets_market,
                'total_assets_cost': total_assets_cost,
                'total_liabilities': total_liabilities,
                'total_monthly_income': total_monthly_income,
                'total_monthly_expenses': total_monthly_expenses,
                'total_debt_service': total_debt_service,
                'total_liquid_assets': total_liquid_assets,
            }
        )
        return snapshot

    def _calculate_asset_totals(self) -> tuple[Decimal, Decimal, Decimal]:
        """Calculate total assets (market and cost basis) and liquid assets."""
        total_market = Decimal('0')
        total_cost = Decimal('0')
        total_liquid = Decimal('0')

        asset_accounts = Account.objects.filter(
            household=self.household,
            account_type__in=ASSET_TYPES,
            is_active=True
        )

        for account in asset_accounts:
            snapshot = account.latest_snapshot
            if snapshot:
                market_value = snapshot.market_value or snapshot.balance or Decimal('0')
                cost_basis = snapshot.cost_basis or snapshot.balance or Decimal('0')

                total_market += market_value
                total_cost += cost_basis

                if account.account_type in LIQUID_TYPES:
                    total_liquid += market_value

        return total_market, total_cost, total_liquid

    def _calculate_liability_totals(self) -> Decimal:
        """Calculate total liabilities."""
        total = Decimal('0')
        liability_accounts = Account.objects.filter(
            household=self.household,
            account_type__in=LIABILITY_TYPES,
            is_active=True
        )

        for account in liability_accounts:
            snapshot = account.latest_snapshot
            if snapshot:
                total += abs(snapshot.balance)

        return total

    def _calculate_flow_totals(self) -> tuple[Decimal, Decimal, Decimal]:
        """Calculate total monthly income, expenses, and debt service.

        Income is calculated exclusively from RecurringFlow objects, which includes:
        - System-generated flows from IncomeSource objects (gross income flows)
        - Manual income entries added directly as flows

        This avoids double-counting that would occur if we also summed IncomeSource
        objects directly, since they already generate corresponding RecurringFlow entries.
        """
        total_income = Decimal('0')
        total_expenses = Decimal('0')
        total_debt_service = Decimal('0')

        # Calculate all totals from RecurringFlow objects
        # This includes system-generated flows from IncomeSource as well as manual entries
        active_flows = RecurringFlow.objects.filter(
            household=self.household,
            is_active=True
        )

        for flow in active_flows:
            if flow.is_active_on(self.as_of_date):
                monthly_amount = flow.monthly_amount

                if flow.flow_type == FlowType.INCOME:
                    total_income += monthly_amount
                elif flow.flow_type == FlowType.EXPENSE:
                    total_expenses += monthly_amount

                    if flow.is_debt_payment:
                        total_debt_service += monthly_amount

        return total_income, total_expenses, total_debt_service

    def _calculate_dscr(self, income: Decimal, expenses: Decimal, debt_service: Decimal) -> Decimal:
        """
        Debt Service Coverage Ratio = (Income - Non-Debt Expenses) / Debt Service
        >1.5 = good, <1.0 = critical
        """
        if debt_service == 0:
            return Decimal('999.999')  # No debt = infinite coverage

        non_debt_expenses = expenses - debt_service
        operating_income = income - non_debt_expenses

        return operating_income / debt_service

    def _calculate_liquidity_months(self, liquid_assets: Decimal, monthly_expenses: Decimal) -> Decimal:
        """Number of months liquid assets can cover expenses. Target: 3-6 months."""
        if monthly_expenses == 0:
            return Decimal('99.99')

        return liquid_assets / monthly_expenses

    def _calculate_days_cash_on_hand(self, liquid_assets: Decimal, monthly_expenses: Decimal) -> Decimal:
        """
        Number of days liquid assets can cover expenses.
        Target: >180 days = good, 90-180 days = warning, <90 days = critical.
        """
        if monthly_expenses == 0:
            return Decimal('999.9')

        return (liquid_assets * Decimal('30')) / monthly_expenses

    def _calculate_savings_rate(self, surplus: Decimal, income: Decimal) -> Decimal:
        """Savings rate = Surplus / Income. >20% = excellent."""
        if income == 0:
            return Decimal('0')

        return surplus / income

    def _calculate_dti_ratio(self, debt_service: Decimal, income: Decimal) -> Decimal:
        """Debt-to-Income ratio. <36% = good, >43% = critical."""
        if income == 0:
            return Decimal('0')

        return debt_service / income

    def _calculate_debt_to_asset(self, liabilities: Decimal, assets: Decimal) -> Decimal:
        """Debt to Asset ratio."""
        if assets == 0:
            return Decimal('0')

        return liabilities / assets

    def _calculate_weighted_avg_interest_rate(self) -> Decimal:
        """Calculate weighted average interest rate on all debts."""
        total_debt = Decimal('0')
        weighted_sum = Decimal('0')

        liability_accounts = Account.objects.filter(
            household=self.household,
            account_type__in=LIABILITY_TYPES,
            is_active=True
        ).select_related('liability_details')

        for account in liability_accounts:
            snapshot = account.latest_snapshot
            if snapshot and hasattr(account, 'liability_details') and account.liability_details:
                balance = abs(snapshot.balance)
                rate = account.liability_details.interest_rate or Decimal('0')

                total_debt += balance
                weighted_sum += balance * rate

        if total_debt == 0:
            return Decimal('0')

        return weighted_sum / total_debt

    def _calculate_high_interest_debt_ratio(self, total_liabilities: Decimal) -> Decimal:
        """Ratio of high interest debt (>7%) to total debt."""
        if total_liabilities == 0:
            return Decimal('0')

        high_interest_debt = Decimal('0')
        HIGH_INTEREST_THRESHOLD = Decimal('0.07')

        liability_accounts = Account.objects.filter(
            household=self.household,
            account_type__in=LIABILITY_TYPES,
            is_active=True
        ).select_related('liability_details')

        for account in liability_accounts:
            snapshot = account.latest_snapshot
            if snapshot and hasattr(account, 'liability_details') and account.liability_details:
                rate = account.liability_details.interest_rate or Decimal('0')
                if rate > HIGH_INTEREST_THRESHOLD:
                    high_interest_debt += abs(snapshot.balance)

        return high_interest_debt / total_liabilities

    def _calculate_housing_ratio(self, income: Decimal) -> Decimal:
        """Housing costs / Income. <28% = good, >36% = critical."""
        if income == 0:
            return Decimal('0')

        housing_flows = RecurringFlow.objects.filter(
            household=self.household,
            flow_type=FlowType.EXPENSE,
            expense_category__in=HOUSING_CATEGORIES,
            is_active=True
        )

        housing_costs = sum(
            flow.monthly_amount
            for flow in housing_flows
            if flow.is_active_on(self.as_of_date)
        ) or Decimal('0')

        return housing_costs / income

    def _calculate_fixed_expense_ratio(self, income: Decimal) -> Decimal:
        """Fixed expenses / Income."""
        if income == 0:
            return Decimal('0')

        fixed_flows = RecurringFlow.objects.filter(
            household=self.household,
            flow_type=FlowType.EXPENSE,
            expense_category__in=FIXED_CATEGORIES,
            is_active=True
        )

        fixed_costs = sum(
            flow.monthly_amount
            for flow in fixed_flows
            if flow.is_active_on(self.as_of_date)
        ) or Decimal('0')

        return fixed_costs / income

    def _calculate_essential_expense_ratio(self, income: Decimal) -> Decimal:
        """Essential expenses / Income."""
        if income == 0:
            return Decimal('0')

        essential_flows = RecurringFlow.objects.filter(
            household=self.household,
            flow_type=FlowType.EXPENSE,
            expense_category__in=ESSENTIAL_CATEGORIES,
            is_active=True
        )

        essential_costs = sum(
            flow.monthly_amount
            for flow in essential_flows
            if flow.is_active_on(self.as_of_date)
        ) or Decimal('0')

        return essential_costs / income

    def _calculate_income_concentration(self) -> Decimal:
        """
        Ratio of largest income source to total income.
        Higher value = more concentrated (risky).
        """
        from apps.taxes.models import IncomeSource

        income_sources = IncomeSource.objects.filter(
            household=self.household,
            is_active=True
        )

        if not income_sources.exists():
            return Decimal('0')

        total_income = Decimal('0')
        max_income = Decimal('0')

        for source in income_sources:
            # Check if source is active on the as_of_date
            if source.is_active:
                # Skip if hasn't started yet
                if source.start_date and source.start_date > self.as_of_date:
                    continue
                # Skip if already ended
                if source.end_date and source.end_date < self.as_of_date:
                    continue

                annual_income = source.gross_annual
                total_income += annual_income
                max_income = max(max_income, annual_income)

        if total_income == 0:
            return Decimal('0')

        return max_income / total_income

    def _calculate_investment_rate(self, income: Decimal) -> Decimal:
        """Ratio of investment contributions to income."""
        from apps.taxes.models import PreTaxDeduction

        if income == 0:
            return Decimal('0')

        # Get all retirement/investment pre-tax deductions
        RETIREMENT_TYPES = {
            'traditional_401k', 'roth_401k', 'traditional_403b',
            'roth_403b', 'traditional_tsp', 'roth_tsp', 'hsa'
        }

        deductions = PreTaxDeduction.objects.filter(
            income_source__household=self.household,
            income_source__is_active=True,
            deduction_type__in=RETIREMENT_TYPES
        )

        total_monthly_investment = Decimal('0')

        for deduction in deductions:
            if deduction.income_source.gross_annual:
                # Use the model's helper to calculate amount per period
                gross_per_period = deduction.income_source.gross_per_period
                amount_per_period = deduction.calculate_per_period(gross_per_period)

                # Convert to monthly based on pay frequency
                pay_frequency = deduction.income_source.pay_frequency
                if pay_frequency == 'weekly':
                    total_monthly_investment += amount_per_period * Decimal('52') / Decimal('12')
                elif pay_frequency == 'biweekly':
                    total_monthly_investment += amount_per_period * Decimal('26') / Decimal('12')
                elif pay_frequency == 'semimonthly':
                    total_monthly_investment += amount_per_period * Decimal('24') / Decimal('12')
                else:  # monthly
                    total_monthly_investment += amount_per_period

        return total_monthly_investment / income


class InsightGenerator:
    def __init__(self, household: Household):
        self.household = household

    def generate_insights(self, snapshot: MetricSnapshot) -> list[Insight]:
        """Generate insights based on metric thresholds and goals."""
        insights = []

        # Ensure default thresholds exist
        self._ensure_default_thresholds()

        # Get all enabled thresholds
        thresholds = MetricThreshold.objects.filter(
            household=self.household,
            is_enabled=True
        )

        for threshold in thresholds:
            insight = self._check_threshold(snapshot, threshold)
            if insight:
                insights.append(insight)

        # Generate positive insights
        insights.extend(self._generate_positive_insights(snapshot))

        # Generate goal-based insights
        insights.extend(self._generate_goal_insights(snapshot))

        return insights

    def _generate_goal_insights(self, snapshot: MetricSnapshot) -> list[Insight]:
        """Generate insights based on goal status."""
        from apps.goals.models import Goal
        from apps.goals.services import GoalEvaluator

        insights = []

        # Get active goals
        goals = Goal.objects.filter(
            household=self.household,
            is_active=True
        )

        if not goals.exists():
            return insights

        # Evaluate goals
        evaluator = GoalEvaluator(self.household)
        goal_statuses = evaluator.evaluate_goals()

        for status in goal_statuses:
            if status.status == 'critical':
                insights.append(Insight.objects.create(
                    household=self.household,
                    severity='critical',
                    category='Goals',
                    title=f'Goal at Risk: {status.goal_name}',
                    description=f'Your {status.goal_name} goal is significantly off track. Current: {status.current_value}, Target: {status.target_value} {status.target_unit}.',
                    recommendation=status.recommendation,
                    metric_name=f'goal_{status.goal_type}',
                    metric_value=Decimal(status.current_value) if status.current_value.replace('.', '').replace('-', '').isdigit() else Decimal('0'),
                ))
            elif status.status == 'warning':
                insights.append(Insight.objects.create(
                    household=self.household,
                    severity='warning',
                    category='Goals',
                    title=f'Goal Needs Attention: {status.goal_name}',
                    description=f'Your {status.goal_name} goal needs attention. Current: {status.current_value}, Target: {status.target_value} {status.target_unit}.',
                    recommendation=status.recommendation,
                    metric_name=f'goal_{status.goal_type}',
                    metric_value=Decimal(status.current_value) if status.current_value.replace('.', '').replace('-', '').isdigit() else Decimal('0'),
                ))
            elif status.status == 'good' and status.percentage_complete and Decimal(status.percentage_complete) >= Decimal('100'):
                # Goal achieved - positive insight
                insights.append(Insight.objects.create(
                    household=self.household,
                    severity='positive',
                    category='Goals',
                    title=f'Goal Achieved: {status.goal_name}',
                    description=f'Congratulations! You have achieved your {status.goal_name} goal.',
                    recommendation=status.recommendation,
                    metric_name=f'goal_{status.goal_type}',
                    metric_value=Decimal(status.current_value) if status.current_value.replace('.', '').replace('-', '').isdigit() else Decimal('0'),
                ))

        return insights

    def _ensure_default_thresholds(self):
        """Create default thresholds if they don't exist."""
        for default in DEFAULT_THRESHOLDS:
            MetricThreshold.objects.get_or_create(
                household=self.household,
                metric_name=default['metric_name'],
                defaults={
                    'warning_threshold': default['warning'],
                    'critical_threshold': default['critical'],
                    'comparison': default['comparison'],
                    'is_enabled': True,
                }
            )

    def _check_threshold(self, snapshot: MetricSnapshot, threshold: MetricThreshold) -> Optional[Insight]:
        """Check if a metric violates a threshold and create insight if needed."""
        metric_value = getattr(snapshot, threshold.metric_name, None)
        if metric_value is None:
            return None

        # Check if threshold is violated
        severity = None
        is_critical = False
        is_warning = False

        if threshold.comparison == 'lt':
            if metric_value < threshold.critical_threshold:
                severity = 'critical'
                is_critical = True
            elif metric_value < threshold.warning_threshold:
                severity = 'warning'
                is_warning = True
        else:  # 'gt'
            if metric_value > threshold.critical_threshold:
                severity = 'critical'
                is_critical = True
            elif metric_value > threshold.warning_threshold:
                severity = 'warning'
                is_warning = True

        if not severity:
            return None

        # Generate insight based on metric
        title, description, recommendation, category = self._generate_insight_content(
            threshold.metric_name, metric_value, is_critical
        )

        # Create insight
        insight = Insight.objects.create(
            household=self.household,
            severity=severity,
            category=category,
            title=title,
            description=description,
            recommendation=recommendation,
            metric_name=threshold.metric_name,
            metric_value=metric_value,
        )

        return insight

    def _generate_insight_content(self, metric_name: str, value: Decimal, is_critical: bool) -> tuple[str, str, str, str]:
        """Generate title, description, recommendation, and category for an insight."""
        severity_word = "Critical" if is_critical else "Warning"

        if metric_name == 'dscr':
            return (
                f"{severity_word}: Low Debt Service Coverage",
                f"Your Debt Service Coverage Ratio is {value:.2f}, which means you have {'barely enough' if is_critical else 'limited'} income to cover debt payments after other expenses.",
                "Consider reducing discretionary expenses, increasing income, or consolidating high-interest debt. A DSCR above 1.5 is recommended for financial stability.",
                "Debt Management"
            )
        elif metric_name == 'liquidity_months':
            return (
                f"{severity_word}: Low Emergency Fund",
                f"Your liquid assets can only cover {value:.1f} months of expenses. Financial experts recommend 3-6 months.",
                "Build your emergency fund by setting aside a portion of each paycheck into a high-yield savings account. Start with a goal of 1 month, then gradually increase to 6 months.",
                "Emergency Fund"
            )
        elif metric_name == 'days_cash_on_hand':
            return (
                f"{severity_word}: Low Cash Reserves",
                f"Your cash on hand can only cover {value:.0f} days of expenses. {'This is critically low.' if is_critical else 'Recommended minimum is 180 days (6 months).'}",
                "Increase your liquid cash reserves by building an emergency fund. Aim for at least 90 days (3 months) of expenses as a minimum, with 180+ days being ideal for financial security.",
                "Cash Management"
            )
        elif metric_name == 'dti_ratio':
            value_pct = value * 100
            return (
                f"{severity_word}: High Debt-to-Income Ratio",
                f"Your debt payments consume {value_pct:.1f}% of your income. Lenders typically prefer to see this below 36%.",
                "Focus on paying down high-interest debt first, avoid taking on new debt, and consider ways to increase your income.",
                "Debt Management"
            )
        elif metric_name == 'savings_rate':
            value_pct = value * 100
            return (
                f"{severity_word}: Low Savings Rate",
                f"You're saving {value_pct:.1f}% of your income. A savings rate of 10-20% is recommended for long-term financial health.",
                "Review your budget for areas to cut expenses. Automate savings by setting up direct deposit to savings accounts. Consider the 50/30/20 budget rule.",
                "Savings"
            )
        elif metric_name == 'high_interest_debt_ratio':
            value_pct = value * 100
            return (
                f"{severity_word}: High-Interest Debt",
                f"{value_pct:.1f}% of your debt has interest rates above 7%, costing you significantly in interest charges.",
                "Prioritize paying off high-interest debt using the avalanche method. Consider balance transfers or debt consolidation loans if you qualify for lower rates.",
                "Debt Management"
            )
        elif metric_name == 'housing_ratio':
            value_pct = value * 100
            return (
                f"{severity_word}: High Housing Costs",
                f"Your housing costs are {value_pct:.1f}% of your income. The recommended maximum is 28%.",
                "Consider ways to reduce housing costs: refinance your mortgage, rent out a room, or look for more affordable housing when your lease/mortgage allows.",
                "Housing"
            )
        else:
            return (
                f"{severity_word}: {metric_name}",
                f"Metric {metric_name} is at {value}",
                "Review this metric and take appropriate action.",
                "General"
            )

    def _generate_positive_insights(self, snapshot: MetricSnapshot) -> list[Insight]:
        """Generate positive insights for good financial metrics."""
        insights = []

        # High DSCR
        if snapshot.dscr >= Decimal('2.0'):
            insights.append(Insight.objects.create(
                household=self.household,
                severity='positive',
                category='Debt Management',
                title='Strong Debt Coverage',
                description=f'Your Debt Service Coverage Ratio of {snapshot.dscr:.2f} shows excellent financial flexibility.',
                recommendation='Consider using your strong cash flow position to accelerate debt payoff or increase retirement savings.',
                metric_name='dscr',
                metric_value=snapshot.dscr,
            ))

        # Good emergency fund
        if snapshot.liquidity_months >= Decimal('6.0'):
            insights.append(Insight.objects.create(
                household=self.household,
                severity='positive',
                category='Emergency Fund',
                title='Well-Funded Emergency Reserve',
                description=f'Your emergency fund can cover {snapshot.liquidity_months:.1f} months of expenses - exceeding the 6-month recommendation.',
                recommendation='With a strong emergency fund in place, consider directing additional savings toward retirement or other long-term goals.',
                metric_name='liquidity_months',
                metric_value=snapshot.liquidity_months,
            ))

        # Strong cash reserves
        if snapshot.days_cash_on_hand >= Decimal('180'):
            insights.append(Insight.objects.create(
                household=self.household,
                severity='positive',
                category='Cash Management',
                title='Strong Cash Position',
                description=f'Your cash reserves can cover {snapshot.days_cash_on_hand:.0f} days of expenses - well above the 180-day target.',
                recommendation='Your strong cash position provides excellent financial security. Consider whether excess cash could be better deployed in higher-yield investments.',
                metric_name='days_cash_on_hand',
                metric_value=snapshot.days_cash_on_hand,
            ))

        # Excellent savings rate
        if snapshot.savings_rate >= Decimal('0.20'):
            value_pct = snapshot.savings_rate * 100
            insights.append(Insight.objects.create(
                household=self.household,
                severity='positive',
                category='Savings',
                title='Outstanding Savings Rate',
                description=f'You are saving {value_pct:.1f}% of your income - well above the recommended 10-20% range.',
                recommendation='Keep up the excellent work! Ensure your savings are optimally allocated between emergency funds, retirement, and other goals.',
                metric_name='savings_rate',
                metric_value=snapshot.savings_rate,
            ))

        # Low DTI
        if snapshot.dti_ratio <= Decimal('0.20'):
            value_pct = snapshot.dti_ratio * 100
            insights.append(Insight.objects.create(
                household=self.household,
                severity='positive',
                category='Debt Management',
                title='Low Debt Burden',
                description=f'Your debt payments are only {value_pct:.1f}% of income, giving you excellent financial flexibility.',
                recommendation='Your low debt burden positions you well for financial opportunities. Maintain this by avoiding unnecessary debt.',
                metric_name='dti_ratio',
                metric_value=snapshot.dti_ratio,
            ))

        return insights
