import uuid
from decimal import Decimal

from django.db import models
from django.db.models import Q

from apps.core.models import HouseholdOwnedModel


class GoalType(models.TextChoices):
    """Types of financial goals users can set."""
    EMERGENCY_FUND_MONTHS = 'emergency_fund_months', 'Emergency Fund (Months)'
    MIN_DSCR = 'min_dscr', 'Minimum DSCR'
    MIN_SAVINGS_RATE = 'min_savings_rate', 'Minimum Savings Rate'
    NET_WORTH_TARGET_BY_DATE = 'net_worth_target_by_date', 'Net Worth Target by Date'
    RETIREMENT_AGE = 'retirement_age', 'Retirement Age'


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
        help_text='Target date for time-bound goals like net_worth_target_by_date'
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
                condition=Q(is_primary=True),
                name='unique_primary_goal_per_household'
            )
        ]

    def __str__(self):
        name = self.name or self.get_goal_type_display()
        return f"{name} ({self.target_value} {self.target_unit})"

    def save(self, *args, **kwargs):
        # Auto-set target_unit based on goal_type if not provided
        if not self.target_unit:
            unit_map = {
                GoalType.EMERGENCY_FUND_MONTHS: 'months',
                GoalType.MIN_DSCR: 'ratio',
                GoalType.MIN_SAVINGS_RATE: 'percent',
                GoalType.NET_WORTH_TARGET_BY_DATE: 'usd',
                GoalType.RETIREMENT_AGE: 'age',
            }
            self.target_unit = unit_map.get(self.goal_type, '')

        # Auto-set name based on goal_type if not provided
        if not self.name:
            name_map = {
                GoalType.EMERGENCY_FUND_MONTHS: 'Emergency Fund',
                GoalType.MIN_DSCR: 'Debt Safety Ratio',
                GoalType.MIN_SAVINGS_RATE: 'Savings Rate',
                GoalType.NET_WORTH_TARGET_BY_DATE: 'Net Worth Target',
                GoalType.RETIREMENT_AGE: 'Retirement Age',
            }
            self.name = name_map.get(self.goal_type, 'Goal')

        super().save(*args, **kwargs)
