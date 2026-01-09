import uuid
from decimal import Decimal

from django.db import models
from django.db.models import Q

from apps.core.models import HouseholdOwnedModel, TimestampedModel


class GoalType(models.TextChoices):
    """Types of financial goals users can set."""
    EMERGENCY_FUND_MONTHS = 'emergency_fund_months', 'Emergency Fund (Months)'
    MIN_DSCR = 'min_dscr', 'Minimum DSCR'
    MIN_SAVINGS_RATE = 'min_savings_rate', 'Minimum Savings Rate'
    NET_WORTH_TARGET = 'net_worth_target', 'Net Worth Target'
    RETIREMENT_AGE = 'retirement_age', 'Retirement Age'
    DEBT_FREE_DATE = 'debt_free_date', 'Debt-Free Date'
    CUSTOM = 'custom', 'Custom Goal'


class GoalStatus(models.TextChoices):
    """Status of goal achievement."""
    GOOD = 'good', 'On Track'
    WARNING = 'warning', 'Warning'
    CRITICAL = 'critical', 'Critical'


class Goal(HouseholdOwnedModel):
    """
    User-defined financial goal with target values and status tracking.

    Goals are evaluated against current metrics or scenario projections
    to determine status (good/warning/critical) and generate recommendations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(
        max_length=120,
        default='',
        blank=True,
        help_text='User-facing display name for this goal'
    )

    goal_type = models.CharField(
        max_length=50,
        choices=GoalType.choices,
        db_index=True,
        help_text='Type of goal which determines how target_value is interpreted'
    )

    target_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Numeric target value; interpretation depends on goal_type and target_unit'
    )

    target_unit = models.CharField(
        max_length=24,
        default='',
        blank=True,
        help_text='Unit of measurement: months, ratio, percent, usd, age'
    )

    target_date = models.DateField(
        null=True,
        blank=True,
        help_text='Target date for time-bound goals like net_worth_target'
    )

    target_meta = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional typed configuration (e.g., {"months_to_goal": 24})'
    )

    is_primary = models.BooleanField(
        default=False,
        help_text='Whether this is the primary goal for the household'
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text='Inactive goals are excluded from evaluation'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
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
        return f"{name} ({self.target_value} {self.target_unit})"

    @property
    def display_name(self):
        """Return display name, falling back to goal type label."""
        return self.name or self.get_goal_type_display()

    def save(self, *args, **kwargs):
        # Auto-set target_unit based on goal_type if not provided
        if not self.target_unit:
            unit_map = {
                GoalType.EMERGENCY_FUND_MONTHS: 'months',
                GoalType.MIN_DSCR: 'ratio',
                GoalType.MIN_SAVINGS_RATE: 'percent',
                GoalType.NET_WORTH_TARGET: 'usd',
                GoalType.RETIREMENT_AGE: 'age',
                GoalType.DEBT_FREE_DATE: 'date',
            }
            self.target_unit = unit_map.get(self.goal_type, '')

        # Auto-set name based on goal_type if not provided
        if not self.name:
            name_map = {
                GoalType.EMERGENCY_FUND_MONTHS: 'Emergency Fund',
                GoalType.MIN_DSCR: 'Debt Safety Ratio',
                GoalType.MIN_SAVINGS_RATE: 'Savings Rate',
                GoalType.NET_WORTH_TARGET: 'Net Worth Target',
                GoalType.RETIREMENT_AGE: 'Retirement Age',
                GoalType.DEBT_FREE_DATE: 'Debt Free Date',
            }
            self.name = name_map.get(self.goal_type, 'Goal')

        super().save(*args, **kwargs)


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

    # Solution plan (list of changes)
    plan = models.JSONField(default=list)

    # Result summary
    result = models.JSONField(default=dict)

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
