# Task 5: Financial Metrics and Insights

## Objective
Create financial metrics calculation system including DSCR, liquidity ratios, and automated insight generation.

## Prerequisites
- Task 1-3 completed

## Deliverables
1. MetricSnapshot model
2. MetricThreshold model  
3. Insight model
4. MetricsCalculator service
5. InsightGenerator service

---

## apps/metrics/models.py

```python
import uuid
from decimal import Decimal
from django.db import models
from apps.core.models import HouseholdOwnedModel

class MetricSnapshot(HouseholdOwnedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    as_of_date = models.DateField()
    
    # Tier 1
    net_worth_market = models.DecimalField(max_digits=14, decimal_places=2)
    net_worth_cost = models.DecimalField(max_digits=14, decimal_places=2)
    monthly_surplus = models.DecimalField(max_digits=12, decimal_places=2)
    dscr = models.DecimalField(max_digits=6, decimal_places=3)
    liquidity_months = models.DecimalField(max_digits=5, decimal_places=2)
    savings_rate = models.DecimalField(max_digits=5, decimal_places=4)
    
    # Tier 2
    dti_ratio = models.DecimalField(max_digits=5, decimal_places=4)
    debt_to_asset_market = models.DecimalField(max_digits=5, decimal_places=4)
    debt_to_asset_cost = models.DecimalField(max_digits=5, decimal_places=4)
    weighted_avg_interest_rate = models.DecimalField(max_digits=7, decimal_places=5)
    high_interest_debt_ratio = models.DecimalField(max_digits=5, decimal_places=4)
    housing_ratio = models.DecimalField(max_digits=5, decimal_places=4)
    fixed_expense_ratio = models.DecimalField(max_digits=5, decimal_places=4)
    essential_expense_ratio = models.DecimalField(max_digits=5, decimal_places=4)
    income_concentration = models.DecimalField(max_digits=5, decimal_places=4)
    unrealized_gains = models.DecimalField(max_digits=14, decimal_places=2)
    investment_rate = models.DecimalField(max_digits=5, decimal_places=4)
    
    # Totals
    total_assets_market = models.DecimalField(max_digits=14, decimal_places=2)
    total_assets_cost = models.DecimalField(max_digits=14, decimal_places=2)
    total_liabilities = models.DecimalField(max_digits=14, decimal_places=2)
    total_monthly_income = models.DecimalField(max_digits=12, decimal_places=2)
    total_monthly_expenses = models.DecimalField(max_digits=12, decimal_places=2)
    total_debt_service = models.DecimalField(max_digits=12, decimal_places=2)
    total_liquid_assets = models.DecimalField(max_digits=14, decimal_places=2)
    
    class Meta:
        db_table = 'metric_snapshots'
        unique_together = ['household', 'as_of_date']
        ordering = ['-as_of_date']


class MetricThreshold(HouseholdOwnedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_name = models.CharField(max_length=50)
    warning_threshold = models.DecimalField(max_digits=10, decimal_places=4)
    critical_threshold = models.DecimalField(max_digits=10, decimal_places=4)
    comparison = models.CharField(max_length=10, choices=[('lt', 'Less than'), ('gt', 'Greater than')])
    is_enabled = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'metric_thresholds'
        unique_together = ['household', 'metric_name']


DEFAULT_THRESHOLDS = [
    {'metric_name': 'dscr', 'warning': Decimal('1.5'), 'critical': Decimal('1.0'), 'comparison': 'lt'},
    {'metric_name': 'liquidity_months', 'warning': Decimal('3'), 'critical': Decimal('1'), 'comparison': 'lt'},
    {'metric_name': 'dti_ratio', 'warning': Decimal('0.36'), 'critical': Decimal('0.43'), 'comparison': 'gt'},
    {'metric_name': 'savings_rate', 'warning': Decimal('0.10'), 'critical': Decimal('0'), 'comparison': 'lt'},
    {'metric_name': 'high_interest_debt_ratio', 'warning': Decimal('0.10'), 'critical': Decimal('0.25'), 'comparison': 'gt'},
    {'metric_name': 'housing_ratio', 'warning': Decimal('0.28'), 'critical': Decimal('0.36'), 'comparison': 'gt'},
]


class Insight(HouseholdOwnedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    severity = models.CharField(max_length=20, choices=[
        ('critical', 'Critical'), ('warning', 'Warning'), ('info', 'Info'), ('positive', 'Positive')
    ])
    category = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField()
    recommendation = models.TextField(blank=True)
    metric_name = models.CharField(max_length=50, blank=True)
    metric_value = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    is_dismissed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'insights'
        ordering = ['-created_at']
```

---

## apps/metrics/services.py

Create MetricsCalculator that:
1. Calculates all metrics from accounts and flows
2. DSCR = (Income - NonDebtExpenses) / DebtService
3. Liquidity = LiquidAssets / MonthlyExpenses
4. Saves MetricSnapshot

Create InsightGenerator that:
1. Compares metrics to thresholds
2. Generates Insight objects
3. Supports critical/warning/positive severity

Key formulas:
- DSCR: operating_income / debt_service (>1.5 good, <1.0 critical)
- DTI: debt_service / gross_income (<36% good, >43% critical)
- Liquidity: liquid_assets / monthly_expenses (3-6 months target)
- Savings Rate: surplus / income (>20% excellent)

---

## Acceptance Criteria
- [ ] All metrics calculated correctly
- [ ] DSCR formula accurate
- [ ] Thresholds configurable per household
- [ ] Insights generated based on thresholds
