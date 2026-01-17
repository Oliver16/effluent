import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Q
from django.contrib.postgres.fields import ArrayField
from apps.core.models import HouseholdOwnedModel, TimestampedModel


class BaselineMode(models.TextChoices):
    LIVE = 'live', 'Live'
    PINNED = 'pinned', 'Pinned'


class Scenario(HouseholdOwnedModel):
    """A what-if scenario for financial modeling."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    is_baseline = models.BooleanField(default=False)
    parent_scenario = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )

    # Baseline-specific fields
    baseline_mode = models.CharField(
        max_length=20,
        choices=BaselineMode.choices,
        default=BaselineMode.LIVE
    )
    baseline_pinned_at = models.DateTimeField(null=True, blank=True)
    baseline_pinned_as_of_date = models.DateField(null=True, blank=True)
    baseline_metric_snapshot = models.ForeignKey(
        'metrics.MetricSnapshot',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='baseline_scenarios'
    )
    last_projected_at = models.DateTimeField(null=True, blank=True)

    # Projection settings
    projection_months = models.PositiveIntegerField(
        default=120,  # 10 years
        validators=[models.validators.MaxValueValidator(360)]  # Max 30 years
    )
    start_date = models.DateField()

    # Assumptions
    inflation_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.03'))
    investment_return_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.07'))
    salary_growth_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.03'))

    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    is_stress_test = models.BooleanField(default=False)

    class Meta:
        db_table = 'scenarios'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['household'],
                condition=Q(is_baseline=True),
                name='unique_baseline_per_household'
            )
        ]

    def __str__(self):
        return f"{self.household.name} - {self.name}"


class ChangeType(models.TextChoices):
    # Income changes
    ADD_INCOME = 'add_income', 'Add Income Source'
    MODIFY_INCOME = 'modify_income', 'Modify Income'
    REMOVE_INCOME = 'remove_income', 'Remove Income'

    # Expense changes
    ADD_EXPENSE = 'add_expense', 'Add Expense'
    MODIFY_EXPENSE = 'modify_expense', 'Modify Expense'
    REMOVE_EXPENSE = 'remove_expense', 'Remove Expense'

    # Asset changes
    ADD_ASSET = 'add_asset', 'Add Asset'
    MODIFY_ASSET = 'modify_asset', 'Modify Asset Value'
    SELL_ASSET = 'sell_asset', 'Sell Asset'

    # Liability changes
    ADD_DEBT = 'add_debt', 'Add Debt'
    MODIFY_DEBT = 'modify_debt', 'Modify Debt'
    PAYOFF_DEBT = 'payoff_debt', 'Pay Off Debt'
    REFINANCE = 'refinance', 'Refinance'

    # One-time events
    LUMP_SUM_INCOME = 'lump_sum_income', 'One-time Income'
    LUMP_SUM_EXPENSE = 'lump_sum_expense', 'One-time Expense'

    # Contribution changes
    MODIFY_401K = 'modify_401k', 'Change 401(k) Contribution'
    MODIFY_HSA = 'modify_hsa', 'Change HSA Contribution'

    # TASK-14: Overlay adjustments (do not persist as recurring flows)
    ADJUST_TOTAL_EXPENSES = 'adjust_total_expenses', 'Adjust Total Expenses'
    ADJUST_TOTAL_INCOME = 'adjust_total_income', 'Adjust Total Income'
    SET_SAVINGS_TRANSFER = 'set_savings_transfer', 'Set Savings Transfer'

    # TASK-14: Tax strategy changes
    MODIFY_WITHHOLDING = 'modify_withholding', 'Modify Tax Withholding'
    MODIFY_DEDUCTIONS = 'modify_deductions', 'Modify Tax Deductions'
    SWITCH_EMPLOYMENT_TYPE = 'switch_employment_type', 'Switch Employment Type'
    SET_QUARTERLY_ESTIMATES = 'set_quarterly_estimates', 'Set Quarterly Tax Estimates'

    # TASK-14: Assumption overrides
    OVERRIDE_ASSUMPTIONS = 'override_assumptions', 'Override Scenario Assumptions'

    # TASK-15: Stress test change types
    ADJUST_INTEREST_RATES = 'adjust_interest_rates', 'Adjust Interest Rates'
    ADJUST_INVESTMENT_VALUE = 'adjust_investment_value', 'Adjust Investment Value'
    OVERRIDE_INFLATION = 'override_inflation', 'Override Inflation Rate'
    OVERRIDE_INVESTMENT_RETURN = 'override_investment_return', 'Override Investment Return'
    OVERRIDE_SALARY_GROWTH = 'override_salary_growth', 'Override Salary Growth'


class ScenarioChange(TimestampedModel):
    """A single change within a scenario."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='changes')

    change_type = models.CharField(max_length=30, choices=ChangeType.choices)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Timing
    effective_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    # Reference to existing objects (optional)
    source_account_id = models.UUIDField(null=True, blank=True)
    # CharField to store flow identifiers like "income_source_<uuid>" or plain UUIDs
    source_flow_id = models.CharField(max_length=100, null=True, blank=True)

    # Change parameters stored as JSON
    parameters = models.JSONField(default=dict)
    # Example parameters:
    # ADD_INCOME: {amount: 5000, frequency: 'monthly', category: 'salary'}
    # MODIFY_EXPENSE: {new_amount: 1500, category: 'rent'}
    # ADD_DEBT: {principal: 25000, rate: 0.065, term_months: 60, payment: 490}
    # REFINANCE: {new_rate: 0.055, new_term_months: 360, closing_costs: 5000}
    # PAYOFF_DEBT: {extra_monthly: 500}

    display_order = models.PositiveIntegerField(default=0)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'scenario_changes'
        ordering = ['effective_date', 'display_order']

    def clean(self):
        """Validate parameters match the schema for this change type."""
        from .validators import validate_scenario_change_parameters
        validate_scenario_change_parameters(
            self.change_type,
            self.parameters,
            self.source_flow_id,
            self.source_account_id
        )

    def save(self, *args, **kwargs):
        """Override save to run validation."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.scenario.name} - {self.name}"


class ScenarioProjection(TimestampedModel):
    """Computed projection results for a scenario."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='projections')

    projection_date = models.DateField()
    month_number = models.PositiveIntegerField()

    # Balances
    total_assets = models.DecimalField(max_digits=14, decimal_places=2)
    total_liabilities = models.DecimalField(max_digits=14, decimal_places=2)
    net_worth = models.DecimalField(max_digits=14, decimal_places=2)
    liquid_assets = models.DecimalField(max_digits=14, decimal_places=2)
    retirement_assets = models.DecimalField(max_digits=14, decimal_places=2)

    # Cash flow
    total_income = models.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2)
    net_cash_flow = models.DecimalField(max_digits=12, decimal_places=2)

    # Metrics
    dscr = models.DecimalField(max_digits=6, decimal_places=3)
    savings_rate = models.DecimalField(max_digits=5, decimal_places=4)
    liquidity_months = models.DecimalField(max_digits=5, decimal_places=2)
    days_cash_on_hand = models.DecimalField(max_digits=6, decimal_places=1)

    # Breakdown by category (JSON)
    income_breakdown = models.JSONField(default=dict)
    expense_breakdown = models.JSONField(default=dict)
    asset_breakdown = models.JSONField(default=dict)
    liability_breakdown = models.JSONField(default=dict)

    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'scenario_projections'
        unique_together = ['scenario', 'month_number']
        ordering = ['month_number']


class ScenarioComparison(HouseholdOwnedModel):
    """Saved comparison between scenarios."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    scenarios = models.ManyToManyField(Scenario, related_name='comparisons')

    class Meta:
        db_table = 'scenario_comparisons'


class LifeEventCategory(models.TextChoices):
    """Categories for life event templates."""
    CAREER = 'career', 'Career & Employment'
    HOUSING = 'housing', 'Housing & Living'
    FAMILY = 'family', 'Family & Relationships'
    EDUCATION = 'education', 'Education'
    HEALTH = 'health', 'Health & Insurance'
    FINANCIAL = 'financial', 'Financial Milestones'
    RETIREMENT = 'retirement', 'Retirement Planning'


class LifeEventTemplate(models.Model):
    """Template for common life events with suggested changes."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=LifeEventCategory.choices)
    icon = models.CharField(max_length=50, default='calendar')  # Icon name for UI

    # Suggested changes as JSON array
    # Each item: {change_type, name, description, parameters_template, is_required}
    suggested_changes = models.JSONField(default=list)

    # Order for display
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'life_event_templates'
        ordering = ['category', 'display_order', 'name']

    def __str__(self):
        return f"{self.category}: {self.name}"

    @classmethod
    def get_default_templates(cls):
        """Return default templates for common life events."""
        return [
            # Career Events
            {
                'name': 'Get a New Job',
                'description': 'Change jobs with new salary, benefits, and commute considerations.',
                'category': LifeEventCategory.CAREER,
                'icon': 'briefcase',
                'display_order': 1,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.REMOVE_INCOME,
                        'name': 'Leave Current Job',
                        'description': 'Select the income source from your current job to remove',
                        'parameters_template': {},
                        'is_required': True,
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': 'New Job Salary',
                        'description': 'Enter your new salary amount',
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'salary'},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.MODIFY_401K,
                        'name': 'New 401(k) Contribution',
                        'description': 'Adjust 401(k) contribution rate (employer match may differ)',
                        'parameters_template': {'percentage': 6},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.MODIFY_EXPENSE,
                        'name': 'Healthcare Premium Change',
                        'description': 'Update health insurance premiums for new employer',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'healthcare'},
                        'is_required': False,
                        'requires_source_flow': True,
                        'source_flow_type': 'expense',
                    },
                    {
                        'change_type': ChangeType.MODIFY_EXPENSE,
                        'name': 'Commute Cost Change',
                        'description': 'Adjust transportation/commuting expenses',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'transportation'},
                        'is_required': False,
                        'requires_source_flow': True,
                        'source_flow_type': 'expense',
                    },
                    {
                        'change_type': ChangeType.LUMP_SUM_INCOME,
                        'name': 'Signing Bonus',
                        'description': 'One-time signing bonus (if applicable)',
                        'parameters_template': {'amount': 0},
                        'is_required': False,
                    },
                ],
            },
            {
                'name': 'Get a Raise',
                'description': 'Salary increase at current job.',
                'category': LifeEventCategory.CAREER,
                'icon': 'trending-up',
                'display_order': 2,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.MODIFY_INCOME,
                        'name': 'Salary Increase',
                        'description': 'Select which income source to update and enter the new amount',
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'salary'},
                        'is_required': True,
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                ],
            },
            {
                'name': 'Lose Job / Unemployment',
                'description': 'Account for job loss and unemployment period.',
                'category': LifeEventCategory.CAREER,
                'icon': 'user-minus',
                'display_order': 3,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.REMOVE_INCOME,
                        'name': 'Remove Salary',
                        'description': 'Select the income source from your job to remove',
                        'parameters_template': {},
                        'is_required': True,
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': 'Unemployment Benefits',
                        'description': 'Add unemployment income (typically 40-60% of salary)',
                        'parameters_template': {'amount': 0, 'frequency': 'weekly', 'category': 'unemployment'},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'COBRA Health Insurance',
                        'description': 'Health insurance continuation (typically 2-3x employer rate)',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'healthcare'},
                        'is_required': False,
                    },
                ],
            },
            # Housing Events
            {
                'name': 'Move / Relocate',
                'description': 'Move to a new location with housing and cost of living changes.',
                'category': LifeEventCategory.HOUSING,
                'icon': 'home',
                'display_order': 1,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.MODIFY_EXPENSE,
                        'name': 'New Rent/Mortgage',
                        'description': 'Select your current housing payment to update for new location',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'rent'},
                        'is_required': True,
                        'requires_source_flow': True,
                        'source_flow_type': 'expense',
                    },
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Moving Costs',
                        'description': 'One-time moving expenses',
                        'parameters_template': {'amount': 5000},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.MODIFY_EXPENSE,
                        'name': 'Utilities Change',
                        'description': 'Select your current utility expense to adjust for new location',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'utilities'},
                        'is_required': False,
                        'requires_source_flow': True,
                        'source_flow_type': 'expense',
                    },
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Security Deposit',
                        'description': 'Security deposit for rental (if applicable)',
                        'parameters_template': {'amount': 0},
                        'is_required': False,
                    },
                ],
            },
            {
                'name': 'Buy a Home',
                'description': 'Purchase a home with down payment and mortgage.',
                'category': LifeEventCategory.HOUSING,
                'icon': 'key',
                'display_order': 2,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_ASSET,
                        'name': 'New Home',
                        'description': 'Add home as an asset (purchase price)',
                        'parameters_template': {'value': 0, 'account_type': 'primary_residence'},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.ADD_DEBT,
                        'name': 'Mortgage',
                        'description': 'Add mortgage loan',
                        'parameters_template': {'principal': 0, 'rate': 0.07, 'term_months': 360, 'payment': 0},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Down Payment & Closing Costs',
                        'description': 'Down payment and closing costs',
                        'parameters_template': {'amount': 0},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.REMOVE_EXPENSE,
                        'name': 'Remove Rent',
                        'description': 'Select your current rent payment to remove',
                        'parameters_template': {},
                        'is_required': False,
                        'requires_source_flow': True,
                        'source_flow_type': 'expense',
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Property Tax',
                        'description': 'Add annual property tax',
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'property_tax'},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Home Insurance',
                        'description': 'Add homeowners insurance',
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'insurance'},
                        'is_required': False,
                    },
                ],
            },
            {
                'name': 'Sell a Home',
                'description': 'Sell your home and pay off mortgage.',
                'category': LifeEventCategory.HOUSING,
                'icon': 'log-out',
                'display_order': 3,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.SELL_ASSET,
                        'name': 'Sell Home',
                        'description': 'Sell home at current market value (minus selling costs)',
                        'parameters_template': {'sale_price': 0, 'selling_costs': 0},
                        'is_required': True,
                        'requires_source_account': True,
                        'source_account_type': 'asset',
                    },
                    {
                        'change_type': ChangeType.PAYOFF_DEBT,
                        'name': 'Pay Off Mortgage',
                        'description': 'Use sale proceeds to pay off mortgage',
                        'parameters_template': {},
                        'is_required': False,
                        'requires_source_account': True,
                        'source_account_type': 'debt',
                    },
                ],
            },
            # Family Events
            {
                'name': 'Have a Baby',
                'description': 'Add a child with associated expenses.',
                'category': LifeEventCategory.FAMILY,
                'icon': 'baby',
                'display_order': 1,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Birth/Delivery Costs',
                        'description': 'Medical costs for birth (after insurance)',
                        'parameters_template': {'amount': 3000},
                        'is_required': False,
                    },
                    # Choice group: user must select either childcare OR employment reduction
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Childcare',
                        'description': 'Daycare/childcare expenses (if both parents continue working)',
                        'parameters_template': {'amount': 1500, 'frequency': 'monthly', 'category': 'childcare'},
                        'is_required': False,
                        'choice_group': 'primary_care',
                    },
                    {
                        'change_type': ChangeType.MODIFY_INCOME,
                        'name': 'Reduce Employment',
                        'description': 'Reduce work hours/income to care for child (select which income to reduce)',
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'salary'},
                        'is_required': False,
                        'choice_group': 'primary_care',
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                    {
                        'change_type': ChangeType.REMOVE_INCOME,
                        'name': 'Leave Employment',
                        'description': 'Stop working to care for child full-time (select which income to remove)',
                        'parameters_template': {},
                        'is_required': False,
                        'choice_group': 'primary_care',
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                    {
                        'change_type': ChangeType.MODIFY_EXPENSE,
                        'name': 'Health Insurance Increase',
                        'description': 'Add child to health insurance plan',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'healthcare'},
                        'is_required': False,
                        'requires_source_flow': True,
                        'source_flow_type': 'expense',
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Diapers & Baby Supplies',
                        'description': 'Monthly baby supplies',
                        'parameters_template': {'amount': 200, 'frequency': 'monthly', 'category': 'baby_supplies'},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': '529 College Savings',
                        'description': 'Start college savings contributions',
                        'parameters_template': {'amount': 200, 'frequency': 'monthly', 'category': 'education_savings'},
                        'is_required': False,
                    },
                ],
            },
            {
                'name': 'Get Married',
                'description': 'Combine finances and plan for wedding.',
                'category': LifeEventCategory.FAMILY,
                'icon': 'heart',
                'display_order': 2,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Wedding Expenses',
                        'description': 'Wedding and honeymoon costs',
                        'parameters_template': {'amount': 20000},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': "Spouse's Income",
                        'description': "Add spouse's income (if combining finances)",
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'salary'},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.MODIFY_EXPENSE,
                        'name': 'Combined Health Insurance',
                        'description': 'Update to family health insurance plan',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'healthcare'},
                        'is_required': False,
                        'requires_source_flow': True,
                        'source_flow_type': 'expense',
                    },
                ],
            },
            {
                'name': 'Get Divorced',
                'description': 'Separate finances and account for legal costs.',
                'category': LifeEventCategory.FAMILY,
                'icon': 'user-x',
                'display_order': 3,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Legal Fees',
                        'description': 'Divorce legal costs',
                        'parameters_template': {'amount': 15000},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.REMOVE_INCOME,
                        'name': "Remove Spouse's Income",
                        'description': "Select spouse's income source to remove from household",
                        'parameters_template': {},
                        'is_required': False,
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Alimony/Child Support',
                        'description': 'Monthly support payments (if applicable)',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'alimony'},
                        'is_required': False,
                    },
                ],
            },
            # Education Events
            {
                'name': 'Go Back to School',
                'description': 'Pursue additional education with tuition and reduced income.',
                'category': LifeEventCategory.EDUCATION,
                'icon': 'graduation-cap',
                'display_order': 1,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Tuition',
                        'description': 'Annual tuition costs',
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'education'},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.ADD_DEBT,
                        'name': 'Student Loans',
                        'description': 'New student loan debt',
                        'parameters_template': {'principal': 0, 'rate': 0.06, 'term_months': 120, 'payment': 0},
                        'is_required': False,
                    },
                    # Choice group: how will education affect employment?
                    {
                        'change_type': ChangeType.MODIFY_INCOME,
                        'name': 'Continue Working Full-Time',
                        'description': 'No change to income (attend school part-time or evenings)',
                        'parameters_template': {},
                        'is_required': False,
                        'choice_group': 'work_status',
                    },
                    {
                        'change_type': ChangeType.MODIFY_INCOME,
                        'name': 'Reduce Work Hours',
                        'description': 'Reduce income to work part-time while studying',
                        'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'salary'},
                        'is_required': False,
                        'choice_group': 'work_status',
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                    {
                        'change_type': ChangeType.REMOVE_INCOME,
                        'name': 'Stop Working',
                        'description': 'Stop working to study full-time',
                        'parameters_template': {},
                        'is_required': False,
                        'choice_group': 'work_status',
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                ],
            },
            {
                'name': 'Pay Off Student Loans',
                'description': 'Accelerate student loan payoff.',
                'category': LifeEventCategory.EDUCATION,
                'icon': 'check-circle',
                'display_order': 2,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.PAYOFF_DEBT,
                        'name': 'Extra Loan Payments',
                        'description': 'Add extra monthly payment toward student loans',
                        'parameters_template': {'extra_monthly': 500},
                        'is_required': True,
                        'requires_source_account': True,
                        'source_account_type': 'debt',
                    },
                ],
            },
            # Retirement Events
            {
                'name': 'Retire',
                'description': 'Transition from employment to retirement.',
                'category': LifeEventCategory.RETIREMENT,
                'icon': 'sunset',
                'display_order': 1,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.REMOVE_INCOME,
                        'name': 'Remove Salary',
                        'description': 'Select the income source from your job to remove',
                        'parameters_template': {},
                        'is_required': True,
                        'requires_source_flow': True,
                        'source_flow_type': 'income',
                    },
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': 'Social Security',
                        'description': 'Add Social Security income',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'social_security'},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': 'Pension Income',
                        'description': 'Add pension income (if applicable)',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'pension'},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': '401(k) Withdrawals',
                        'description': 'Monthly withdrawals from retirement accounts',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'retirement_withdrawal'},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Medicare Premiums',
                        'description': 'Medicare Part B and supplemental insurance',
                        'parameters_template': {'amount': 300, 'frequency': 'monthly', 'category': 'healthcare'},
                        'is_required': False,
                    },
                ],
            },
            {
                'name': 'Increase 401(k) Contribution',
                'description': 'Boost retirement savings.',
                'category': LifeEventCategory.RETIREMENT,
                'icon': 'piggy-bank',
                'display_order': 2,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.MODIFY_401K,
                        'name': 'Increase 401(k) Rate',
                        'description': 'Increase 401(k) contribution percentage',
                        'parameters_template': {'percentage': 15},
                        'is_required': True,
                    },
                ],
            },
            # Financial Events
            {
                'name': 'Buy a Car',
                'description': 'Purchase a vehicle.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'car',
                'display_order': 1,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_ASSET,
                        'name': 'New Vehicle',
                        'description': 'Add vehicle as asset',
                        'parameters_template': {'value': 0, 'account_type': 'vehicle'},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.ADD_DEBT,
                        'name': 'Auto Loan',
                        'description': 'Car loan (if financing)',
                        'parameters_template': {'principal': 0, 'rate': 0.06, 'term_months': 60, 'payment': 0},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Car Insurance',
                        'description': 'Monthly auto insurance',
                        'parameters_template': {'amount': 150, 'frequency': 'monthly', 'category': 'insurance'},
                        'is_required': False,
                    },
                ],
            },
            {
                'name': 'Start a Side Business',
                'description': 'Launch a side business or freelance work.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'rocket',
                'display_order': 2,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': 'Business Income',
                        'description': 'Expected business/freelance income',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'business_income'},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Startup Costs',
                        'description': 'Initial business setup costs',
                        'parameters_template': {'amount': 0},
                        'is_required': False,
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Business Expenses',
                        'description': 'Ongoing business expenses',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'business_expense'},
                        'is_required': False,
                    },
                ],
            },
            {
                'name': 'Receive Inheritance',
                'description': 'Receive an inheritance or windfall.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'gift',
                'display_order': 3,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_INCOME,
                        'name': 'Inheritance',
                        'description': 'One-time inheritance amount',
                        'parameters_template': {'amount': 0},
                        'is_required': True,
                    },
                ],
            },
            # Health Events
            {
                'name': 'Major Medical Event',
                'description': 'Account for significant medical expenses.',
                'category': LifeEventCategory.HEALTH,
                'icon': 'activity',
                'display_order': 1,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Medical Bills',
                        'description': 'Out-of-pocket medical expenses',
                        'parameters_template': {'amount': 0},
                        'is_required': True,
                    },
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'Ongoing Treatment',
                        'description': 'Ongoing medical costs (medications, therapy)',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'healthcare'},
                        'is_required': False,
                    },
                ],
            },
            # Simple Financial Changes (migrated from Decisions)
            {
                'name': 'Add New Income',
                'description': 'Add a new income source like a side job, freelance work, or passive income.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'trending-up',
                'display_order': 10,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': 'New Income',
                        'description': 'Enter the details of your new income source',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'other_income'},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Add New Expense',
                'description': 'Add a new recurring expense like a subscription, insurance, or regular payment.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'credit-card',
                'display_order': 11,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'New Expense',
                        'description': 'Enter the details of your new recurring expense',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'miscellaneous'},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Large Purchase',
                'description': 'Model a one-time large purchase or expense.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'shopping-cart',
                'display_order': 12,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'One-Time Purchase',
                        'description': 'Enter the purchase amount',
                        'parameters_template': {'amount': 0},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Accelerate Debt Payoff',
                'description': 'Make extra monthly payments to pay off debt faster.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'trending-up',
                'display_order': 13,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.PAYOFF_DEBT,
                        'name': 'Extra Debt Payment',
                        'description': 'Add extra monthly payments toward debt',
                        'parameters_template': {'extra_monthly': 0},
                        'is_required': True,
                        'requires_source_account': True,
                        'source_account_type': 'liability',
                    },
                ],
            },
            {
                'name': 'Pay Off Debt (Lump Sum)',
                'description': 'Make a one-time lump sum payment to pay off a debt completely.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'check-circle',
                'display_order': 14,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name': 'Lump Sum Debt Payment',
                        'description': 'One-time payment to pay off debt (enter the remaining balance)',
                        'parameters_template': {'amount': 0},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Refinance Loan',
                'description': 'Refinance an existing loan to get a better rate or term.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'refresh-cw',
                'display_order': 15,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.REFINANCE,
                        'name': 'Refinance',
                        'description': 'Enter new loan terms after refinancing',
                        'parameters_template': {'rate': 0.05, 'term_months': 360, 'closing_costs': 0},
                        'is_required': True,
                        'requires_source_account': True,
                        'source_account_type': 'liability',
                    },
                ],
            },
            {
                'name': 'Take Out Loan',
                'description': 'Model a new loan or line of credit.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'file-text',
                'display_order': 16,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_DEBT,
                        'name': 'New Loan',
                        'description': 'Enter loan details',
                        'parameters_template': {'principal': 0, 'rate': 0.07, 'term_months': 60, 'payment': 0},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Start Savings Goal',
                'description': 'Set up recurring transfers to a savings or investment goal.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'piggy-bank',
                'display_order': 17,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.SET_SAVINGS_TRANSFER,
                        'name': 'Monthly Savings',
                        'description': 'Set up automatic savings transfers',
                        'parameters_template': {'amount': 0},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Adjust HSA Contribution',
                'description': 'Change your Health Savings Account contribution rate.',
                'category': LifeEventCategory.HEALTH,
                'icon': 'heart-pulse',
                'display_order': 2,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.MODIFY_HSA,
                        'name': 'HSA Contribution Change',
                        'description': 'Enter new HSA contribution percentage',
                        'parameters_template': {'percentage': 0},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Set Quarterly Tax Estimates',
                'description': 'Set up quarterly estimated tax payments for self-employment or investment income.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'calendar',
                'display_order': 17,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.SET_QUARTERLY_ESTIMATES,
                        'name': 'Quarterly Tax Payments',
                        'description': 'Enter quarterly estimated tax payment amount',
                        'parameters_template': {'quarterly_amount': 0},
                        'is_required': True,
                    },
                ],
            },
            # Generic single-change templates
            {
                'name': 'Add Income Source',
                'description': 'Add a new source of income.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'plus-circle',
                'display_order': 18,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name': 'New Income',
                        'description': 'Enter income details',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'income_type': 'other', 'income_category': 'other_income'},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Add Expense',
                'description': 'Add a new recurring expense.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'plus-circle',
                'display_order': 19,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name': 'New Expense',
                        'description': 'Enter expense details',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly', 'expense_category': 'miscellaneous'},
                        'is_required': True,
                    },
                ],
            },
            {
                'name': 'Modify Existing Income',
                'description': 'Change the amount or frequency of an existing income source.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'edit',
                'display_order': 20,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.MODIFY_INCOME,
                        'name': 'Income Change',
                        'description': 'Enter new income amount',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly'},
                        'is_required': True,
                        'requires_source_flow': True,
                    },
                ],
            },
            {
                'name': 'Modify Existing Expense',
                'description': 'Change the amount or frequency of an existing expense.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'edit',
                'display_order': 21,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.MODIFY_EXPENSE,
                        'name': 'Expense Change',
                        'description': 'Enter new expense amount',
                        'parameters_template': {'amount': 0, 'frequency': 'monthly'},
                        'is_required': True,
                        'requires_source_flow': True,
                    },
                ],
            },
            {
                'name': 'Remove Income',
                'description': 'Stop receiving an income source.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'minus-circle',
                'display_order': 22,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.REMOVE_INCOME,
                        'name': 'Remove Income',
                        'description': 'Select the income source to remove',
                        'parameters_template': {},
                        'is_required': True,
                        'requires_source_flow': True,
                    },
                ],
            },
            {
                'name': 'Remove Expense',
                'description': 'Stop paying a recurring expense.',
                'category': LifeEventCategory.FINANCIAL,
                'icon': 'minus-circle',
                'display_order': 23,
                'suggested_changes': [
                    {
                        'change_type': ChangeType.REMOVE_EXPENSE,
                        'name': 'Remove Expense',
                        'description': 'Select the expense to remove',
                        'parameters_template': {},
                        'is_required': True,
                        'requires_source_flow': True,
                    },
                ],
            },
        ]


class RealityChangeEventType(models.TextChoices):
    ACCOUNTS_CHANGED = 'accounts_changed', 'Accounts Changed'
    FLOWS_CHANGED = 'flows_changed', 'Flows Changed'
    TAXES_CHANGED = 'taxes_changed', 'Taxes Changed'
    ONBOARDING_COMPLETED = 'onboarding_completed', 'Onboarding Completed'
    MANUAL_REFRESH = 'manual_refresh', 'Manual Refresh'


class RealityChangeEventStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSED = 'processed', 'Processed'
    FAILED = 'failed', 'Failed'


class RealityChangeEvent(HouseholdOwnedModel):
    """
    Lightweight event log to trigger baseline recompute.
    Acts as a queue for processing baseline updates when reality changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(
        max_length=30,
        choices=RealityChangeEventType.choices
    )
    payload = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=RealityChangeEventStatus.choices,
        default=RealityChangeEventStatus.PENDING
    )
    error = models.TextField(blank=True)

    class Meta:
        db_table = 'reality_change_events'
        ordering = ['created_at']
        indexes = [
            models.Index(
                fields=['household', 'status', 'created_at'],
                name='reality_event_household_status'
            )
        ]

    def __str__(self):
        return f"{self.household.name} - {self.event_type} ({self.status})"
