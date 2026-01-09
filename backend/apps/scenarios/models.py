import uuid
from decimal import Decimal
from django.db import models
from django.contrib.postgres.fields import ArrayField
from apps.core.models import HouseholdOwnedModel, TimestampedModel


class Scenario(HouseholdOwnedModel):
    """A what-if scenario for financial modeling."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    is_baseline = models.BooleanField(default=False)
    parent_scenario = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )

    # Projection settings
    projection_months = models.PositiveIntegerField(default=60)  # 5 years
    start_date = models.DateField()

    # Assumptions
    inflation_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.03'))
    investment_return_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.07'))
    salary_growth_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.03'))

    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = 'scenarios'
        ordering = ['-created_at']

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
    source_flow_id = models.UUIDField(null=True, blank=True)

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
