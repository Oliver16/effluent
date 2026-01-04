# Task 10: Scenario Engine

## Objective
Create the what-if scenario modeling system that allows users to simulate financial decisions and see projected impacts.

## Prerequisites
- Task 2 (Account Models) completed
- Task 3 (Recurring Flows) completed
- Task 5 (Metrics) completed

## Deliverables
1. Scenario model for storing scenarios
2. ScenarioChange model for individual modifications
3. ScenarioProjection model for computed results
4. ScenarioEngine service for projections
5. Time-series projection calculations

---

## Create App Structure

```
backend/apps/scenarios/
├── __init__.py
├── apps.py
├── models.py
├── services.py
├── admin.py
├── serializers.py
├── views.py
└── urls.py
```

---

## apps/scenarios/models.py

```python
import uuid
from decimal import Decimal
from django.db import models
from django.contrib.postgres.fields import ArrayField
from apps.core.models import HouseholdOwnedModel


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


class ScenarioChange(models.Model):
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


class ScenarioProjection(models.Model):
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
```

---

## apps/scenarios/services.py

```python
from dataclasses import dataclass
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import transaction

from apps.core.models import Household
from apps.accounts.models import Account, ASSET_TYPES, LIABILITY_TYPES, LIQUID_TYPES, RETIREMENT_TYPES
from apps.flows.models import RecurringFlow, FlowType, FREQUENCY_TO_MONTHLY
from .models import Scenario, ScenarioChange, ScenarioProjection, ChangeType


@dataclass
class MonthlyState:
    """State at a point in time."""
    date: date
    month: int
    assets: dict  # account_id -> balance
    liabilities: dict  # account_id -> balance
    incomes: list  # active flows
    expenses: list  # active flows
    
    @property
    def total_assets(self) -> Decimal:
        return sum(self.assets.values())
    
    @property
    def total_liabilities(self) -> Decimal:
        return sum(self.liabilities.values())
    
    @property
    def net_worth(self) -> Decimal:
        return self.total_assets - self.total_liabilities
    
    @property
    def total_income(self) -> Decimal:
        return sum(f['monthly'] for f in self.incomes)
    
    @property
    def total_expenses(self) -> Decimal:
        return sum(f['monthly'] for f in self.expenses)
    
    @property
    def net_cash_flow(self) -> Decimal:
        return self.total_income - self.total_expenses


class ScenarioEngine:
    """Projects financial state over time with scenario changes."""
    
    def __init__(self, scenario: Scenario):
        self.scenario = scenario
        self.household = scenario.household
    
    def compute_projection(self) -> list[ScenarioProjection]:
        """Compute full projection and save to database."""
        # Initialize from current state
        state = self._initialize_state()
        
        # Get scenario changes sorted by date
        changes = list(self.scenario.changes.filter(is_enabled=True).order_by('effective_date'))
        
        projections = []
        
        for month in range(self.scenario.projection_months):
            current_date = self.scenario.start_date + relativedelta(months=month)
            
            # Apply any changes that take effect this month
            for change in changes:
                if change.effective_date <= current_date:
                    if not change.end_date or change.end_date >= current_date:
                        state = self._apply_change(state, change, current_date)
            
            # Apply growth rates
            state = self._apply_growth(state, month)
            
            # Compute this month's projection
            proj = self._create_projection(state, current_date, month)
            projections.append(proj)
            
            # Advance state (apply cash flow to liquid assets)
            state = self._advance_month(state)
        
        # Save projections
        with transaction.atomic():
            ScenarioProjection.objects.filter(scenario=self.scenario).delete()
            ScenarioProjection.objects.bulk_create(projections)
        
        return projections
    
    def _initialize_state(self) -> MonthlyState:
        """Initialize state from current household data."""
        assets = {}
        liabilities = {}
        
        for acct in Account.objects.filter(household=self.household, is_active=True):
            snap = acct.latest_snapshot
            if snap:
                if acct.is_asset:
                    assets[str(acct.id)] = snap.market_value or snap.balance
                else:
                    liabilities[str(acct.id)] = abs(snap.balance)
        
        incomes = []
        expenses = []
        
        for flow in RecurringFlow.objects.filter(household=self.household, is_active=True):
            f = {
                'id': str(flow.id),
                'name': flow.name,
                'category': flow.category,
                'amount': flow.amount,
                'frequency': flow.frequency,
                'monthly': flow.monthly_amount,
            }
            if flow.is_income:
                incomes.append(f)
            else:
                expenses.append(f)
        
        return MonthlyState(
            date=self.scenario.start_date,
            month=0,
            assets=assets,
            liabilities=liabilities,
            incomes=incomes,
            expenses=expenses,
        )
    
    def _apply_change(self, state: MonthlyState, change: ScenarioChange, current_date: date) -> MonthlyState:
        """Apply a scenario change to the state."""
        params = change.parameters
        
        if change.change_type == ChangeType.ADD_INCOME:
            state.incomes.append({
                'id': f'scenario_{change.id}',
                'name': change.name,
                'category': params.get('category', 'other_income'),
                'amount': Decimal(str(params.get('amount', 0))),
                'frequency': params.get('frequency', 'monthly'),
                'monthly': self._to_monthly(params.get('amount', 0), params.get('frequency', 'monthly')),
            })
        
        elif change.change_type == ChangeType.REMOVE_INCOME:
            state.incomes = [i for i in state.incomes if i['id'] != str(change.source_flow_id)]
        
        elif change.change_type == ChangeType.ADD_EXPENSE:
            state.expenses.append({
                'id': f'scenario_{change.id}',
                'name': change.name,
                'category': params.get('category', 'miscellaneous'),
                'amount': Decimal(str(params.get('amount', 0))),
                'frequency': params.get('frequency', 'monthly'),
                'monthly': self._to_monthly(params.get('amount', 0), params.get('frequency', 'monthly')),
            })
        
        elif change.change_type == ChangeType.REMOVE_EXPENSE:
            state.expenses = [e for e in state.expenses if e['id'] != str(change.source_flow_id)]
        
        elif change.change_type == ChangeType.ADD_DEBT:
            debt_id = f'scenario_debt_{change.id}'
            state.liabilities[debt_id] = Decimal(str(params.get('principal', 0)))
            # Add payment as expense
            state.expenses.append({
                'id': f'payment_{debt_id}',
                'name': f'{change.name} Payment',
                'category': 'other_debt',
                'amount': Decimal(str(params.get('payment', 0))),
                'frequency': 'monthly',
                'monthly': Decimal(str(params.get('payment', 0))),
            })
        
        elif change.change_type == ChangeType.PAYOFF_DEBT:
            # Add extra payment to existing debt
            debt_id = str(change.source_account_id)
            extra = Decimal(str(params.get('extra_monthly', 0)))
            state.expenses.append({
                'id': f'extra_{debt_id}',
                'name': f'{change.name} Extra Payment',
                'category': 'other_debt',
                'amount': extra,
                'frequency': 'monthly',
                'monthly': extra,
            })
        
        elif change.change_type == ChangeType.LUMP_SUM_INCOME:
            # One-time: add to liquid assets
            if state.assets:
                first_liquid = next((k for k, v in state.assets.items()), None)
                if first_liquid:
                    state.assets[first_liquid] += Decimal(str(params.get('amount', 0)))
        
        elif change.change_type == ChangeType.LUMP_SUM_EXPENSE:
            # One-time: subtract from liquid assets
            if state.assets:
                first_liquid = next((k for k, v in state.assets.items()), None)
                if first_liquid:
                    state.assets[first_liquid] -= Decimal(str(params.get('amount', 0)))
        
        return state
    
    def _apply_growth(self, state: MonthlyState, month: int) -> MonthlyState:
        """Apply annual growth rates (pro-rated monthly)."""
        if month > 0 and month % 12 == 0:
            # Annual salary growth
            growth = 1 + float(self.scenario.salary_growth_rate)
            for inc in state.incomes:
                if inc['category'] in ('salary', 'hourly_wages'):
                    inc['amount'] = inc['amount'] * Decimal(str(growth))
                    inc['monthly'] = inc['monthly'] * Decimal(str(growth))
            
            # Annual inflation on expenses
            inflation = 1 + float(self.scenario.inflation_rate)
            for exp in state.expenses:
                exp['amount'] = exp['amount'] * Decimal(str(inflation))
                exp['monthly'] = exp['monthly'] * Decimal(str(inflation))
        
        # Monthly investment returns
        monthly_return = (1 + float(self.scenario.investment_return_rate)) ** (1/12) - 1
        for aid, balance in list(state.assets.items()):
            # Simple: apply to all assets (should filter to investment accounts)
            state.assets[aid] = balance * Decimal(str(1 + monthly_return))
        
        return state
    
    def _advance_month(self, state: MonthlyState) -> MonthlyState:
        """Apply monthly cash flow to assets/liabilities."""
        net_flow = state.net_cash_flow
        
        # Simplified: add/subtract from first liquid asset
        if state.assets:
            first_key = next(iter(state.assets.keys()))
            state.assets[first_key] = max(Decimal('0'), state.assets[first_key] + net_flow)
        
        # Reduce debt balances by principal portion (simplified)
        for lid in list(state.liabilities.keys()):
            # Very simplified: assume 80% of payment goes to principal
            state.liabilities[lid] = max(Decimal('0'), state.liabilities[lid] - Decimal('100'))
        
        state.month += 1
        state.date = state.date + relativedelta(months=1)
        
        return state
    
    def _create_projection(self, state: MonthlyState, proj_date: date, month: int) -> ScenarioProjection:
        """Create projection record from state."""
        total_exp = state.total_expenses
        debt_service = sum(e['monthly'] for e in state.expenses if 'debt' in e['category'] or 'mortgage' in e['category'] or 'loan' in e['category'])
        
        non_debt_exp = total_exp - debt_service
        operating_income = state.total_income - non_debt_exp
        dscr = operating_income / debt_service if debt_service > 0 else Decimal('999')
        
        savings_rate = state.net_cash_flow / state.total_income if state.total_income > 0 else Decimal('0')
        liquidity = state.total_assets / total_exp if total_exp > 0 else Decimal('999')
        
        return ScenarioProjection(
            scenario=self.scenario,
            projection_date=proj_date,
            month_number=month,
            total_assets=state.total_assets.quantize(Decimal('0.01')),
            total_liabilities=state.total_liabilities.quantize(Decimal('0.01')),
            net_worth=state.net_worth.quantize(Decimal('0.01')),
            liquid_assets=state.total_assets.quantize(Decimal('0.01')),
            retirement_assets=Decimal('0'),
            total_income=state.total_income.quantize(Decimal('0.01')),
            total_expenses=total_exp.quantize(Decimal('0.01')),
            net_cash_flow=state.net_cash_flow.quantize(Decimal('0.01')),
            dscr=dscr.quantize(Decimal('0.001')),
            savings_rate=savings_rate.quantize(Decimal('0.0001')),
            liquidity_months=liquidity.quantize(Decimal('0.01')),
            income_breakdown={i['category']: str(i['monthly']) for i in state.incomes},
            expense_breakdown={e['category']: str(e['monthly']) for e in state.expenses},
            asset_breakdown={},
            liability_breakdown={},
        )
    
    def _to_monthly(self, amount, frequency: str) -> Decimal:
        """Convert amount to monthly."""
        from apps.flows.models import FREQUENCY_TO_MONTHLY
        mult = FREQUENCY_TO_MONTHLY.get(frequency, Decimal('1'))
        return Decimal(str(amount)) * mult
```

---

## apps/scenarios/admin.py

```python
from django.contrib import admin
from .models import Scenario, ScenarioChange, ScenarioProjection

class ScenarioChangeInline(admin.TabularInline):
    model = ScenarioChange
    extra = 1

@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ('name', 'household', 'projection_months', 'is_baseline', 'is_active')
    list_filter = ('is_baseline', 'is_active', 'household')
    inlines = [ScenarioChangeInline]

@admin.register(ScenarioProjection)
class ScenarioProjectionAdmin(admin.ModelAdmin):
    list_display = ('scenario', 'month_number', 'net_worth', 'net_cash_flow', 'dscr')
    list_filter = ('scenario',)
```

---

## Update config/settings/base.py

Add to INSTALLED_APPS:
```python
'apps.scenarios',
```

---

## Verification Steps

1. Run migrations
2. Create a scenario in admin
3. Add changes (add income, add expense, etc.)
4. Run projection:
   ```python
   from apps.scenarios.services import ScenarioEngine
   from apps.scenarios.models import Scenario
   
   scenario = Scenario.objects.first()
   engine = ScenarioEngine(scenario)
   projections = engine.compute_projection()
   
   for p in projections[:12]:
       print(f"Month {p.month_number}: NW=${p.net_worth:,.0f}, Flow=${p.net_cash_flow:,.0f}")
   ```

## Acceptance Criteria
- [ ] Scenarios store assumptions
- [ ] Changes can be added/modified
- [ ] Engine computes projections
- [ ] Projections show month-by-month
- [ ] Net worth trajectory correct
- [ ] Growth rates applied annually
