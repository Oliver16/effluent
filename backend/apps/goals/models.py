import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Q
from apps.core.models import HouseholdOwnedModel, TimestampedModel


class GoalType(models.TextChoices):
    """Types of financial goals."""
    EMERGENCY_FUND_MONTHS = 'emergency_fund_months', 'Emergency Fund (Months)'
    MIN_DSCR = 'min_dscr', 'Minimum DSCR'
    MIN_SAVINGS_RATE = 'min_savings_rate', 'Minimum Savings Rate'
    NET_WORTH_TARGET = 'net_worth_target', 'Net Worth Target'
    RETIREMENT_AGE = 'retirement_age', 'Retirement Age'
    DEBT_FREE_DATE = 'debt_free_date', 'Debt-Free Date'
    CUSTOM = 'custom', 'Custom Goal'


class GoalStatus(models.TextChoices):
    """Status of goal achievement."""
    ON_TRACK = 'on_track', 'On Track'
    WARNING = 'warning', 'Warning'
    CRITICAL = 'critical', 'Critical'
    ACHIEVED = 'achieved', 'Achieved'


class Goal(HouseholdOwnedModel):
    """
    A financial goal for a household.

    Goals define targets for metrics like emergency fund, DSCR, savings rate, etc.
    The target_value is always numeric; interpretation depends on goal_type and target_unit.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # User-facing name
    name = models.CharField(max_length=120, blank=True, default='')

    # Goal type and target
    goal_type = models.CharField(max_length=30, choices=GoalType.choices)
    target_value = models.DecimalField(max_digits=12, decimal_places=2)

    # Unit for interpretation (months, ratio, percent, usd, age)
    target_unit = models.CharField(max_length=24, default='', blank=True)

    # Optional deadline for time-bound goals
    target_date = models.DateField(null=True, blank=True)

    # Optional typed configuration
    target_meta = models.JSONField(default=dict, blank=True)
    # Example meta:
    # emergency_fund_months: {"months_to_goal": 24}
    # net_worth_target: {"milestone_name": "First million"}

    # Priority and status
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Computed status (updated by evaluation service)
    current_status = models.CharField(
        max_length=20,
        choices=GoalStatus.choices,
        default=GoalStatus.WARNING
    )
    current_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    last_evaluated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'goals'
        ordering = ['-is_primary', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['household'],
                condition=Q(is_primary=True, is_active=True),
                name='unique_primary_goal_per_household'
            )
        ]

    def __str__(self):
        name = self.name or self.get_goal_type_display()
        return f"{self.household.name} - {name}"

    @property
    def display_name(self):
        """Return display name, falling back to goal type label."""
        return self.name or self.get_goal_type_display()


class GoalSolution(TimestampedModel):
    """
    A computed solution plan for achieving a goal.

    Created by the goal seek solver, contains the plan (list of changes)
    needed to achieve the goal within specified constraints.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='solutions')

    # Solver options used
    options = models.JSONField(default=dict)
    # Example options:
    # {
    #   "allowed_interventions": ["reduce_expenses", "increase_income"],
    #   "bounds": {"max_reduce_expenses_monthly": "1200.00"},
    #   "start_date": "2026-02-01",
    #   "projection_months": 60
    # }

    # Solution plan (list of changes)
    plan = models.JSONField(default=list)
    # Example plan:
    # [
    #   {"change_type": "ADJUST_TOTAL_EXPENSES", "parameters": {"monthly_adjustment": "-650.00"}},
    #   {"change_type": "ADJUST_TOTAL_INCOME", "parameters": {"monthly_adjustment": "400.00"}}
    # ]

    # Result summary
    result = models.JSONField(default=dict)
    # Example result:
    # {
    #   "baseline_value": "2.40",
    #   "final_value": "6.10",
    #   "worst_month_value": "5.95"
    # }

    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)

    computed_at = models.DateTimeField(auto_now_add=True)

    # Link to scenario if solution was applied
    applied_scenario = models.ForeignKey(
        'scenarios.Scenario',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='goal_solutions'
    )
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'goal_solutions'
        ordering = ['-computed_at']

    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.goal} - {status} ({self.computed_at})"

    @property
    def household(self):
        """Get household from goal."""
        return self.goal.household
