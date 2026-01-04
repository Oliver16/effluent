# Task 2: Account Models

## Objective
Create comprehensive account models for tracking assets and liabilities with dual-basis valuation (cost vs. market).

## Prerequisites
- Task 1 (Backend Setup) completed

## Deliverables
1. Account model with comprehensive account types
2. BalanceSnapshot model for point-in-time tracking
3. AssetGroup for grouping related accounts
4. LiabilityDetails for loan information
5. AssetDetails for property/vehicle information
6. Working migrations

---

## Create App Structure

```
backend/apps/accounts/
├── __init__.py
├── apps.py
├── models.py
├── admin.py
├── serializers.py
├── views.py
└── urls.py
```

---

## apps/accounts/models.py

```python
import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import HouseholdOwnedModel


class AccountType(models.TextChoices):
    # Cash & Equivalents
    CHECKING = 'checking', 'Checking Account'
    SAVINGS = 'savings', 'Savings Account'
    MONEY_MARKET = 'money_market', 'Money Market Account'
    CD = 'cd', 'Certificate of Deposit'
    CASH = 'cash', 'Cash on Hand'
    
    # Investment Accounts
    BROKERAGE = 'brokerage', 'Brokerage Account'
    CRYPTO = 'crypto', 'Cryptocurrency'
    
    # Retirement Accounts
    TRADITIONAL_401K = 'traditional_401k', '401(k) - Traditional'
    ROTH_401K = 'roth_401k', '401(k) - Roth'
    TRADITIONAL_IRA = 'traditional_ira', 'IRA - Traditional'
    ROTH_IRA = 'roth_ira', 'IRA - Roth'
    SEP_IRA = 'sep_ira', 'SEP IRA'
    SIMPLE_IRA = 'simple_ira', 'SIMPLE IRA'
    TSP = 'tsp', 'TSP (Federal)'
    PENSION = 'pension', 'Pension'
    ANNUITY = 'annuity', 'Annuity'
    HSA = 'hsa', 'Health Savings Account'
    
    # Real Property
    PRIMARY_RESIDENCE = 'primary_residence', 'Primary Residence'
    RENTAL_PROPERTY = 'rental_property', 'Rental Property'
    VACATION_PROPERTY = 'vacation_property', 'Vacation Property'
    LAND = 'land', 'Land'
    COMMERCIAL_PROPERTY = 'commercial_property', 'Commercial Property'
    
    # Personal Property
    VEHICLE = 'vehicle', 'Vehicle'
    BOAT = 'boat', 'Boat/RV'
    JEWELRY = 'jewelry', 'Jewelry/Collectibles'
    OTHER_ASSET = 'other_asset', 'Other Asset'
    
    # Receivables
    ACCOUNTS_RECEIVABLE = 'accounts_receivable', 'Accounts Receivable'
    LOANS_RECEIVABLE = 'loans_receivable', 'Loans to Others'
    TAX_REFUND = 'tax_refund', 'Expected Tax Refund'
    
    # Credit Cards (Revolving)
    CREDIT_CARD = 'credit_card', 'Credit Card'
    STORE_CARD = 'store_card', 'Store Credit Card'
    
    # Lines of Credit (Revolving)
    HELOC = 'heloc', 'Home Equity Line of Credit'
    PERSONAL_LOC = 'personal_loc', 'Personal Line of Credit'
    BUSINESS_LOC = 'business_loc', 'Business Line of Credit'
    
    # Mortgages
    PRIMARY_MORTGAGE = 'primary_mortgage', 'Primary Residence Mortgage'
    RENTAL_MORTGAGE = 'rental_mortgage', 'Rental Property Mortgage'
    SECOND_MORTGAGE = 'second_mortgage', 'Second Mortgage'
    
    # Installment Loans
    AUTO_LOAN = 'auto_loan', 'Auto Loan'
    PERSONAL_LOAN = 'personal_loan', 'Personal Loan'
    STUDENT_LOAN_FEDERAL = 'student_loan_federal', 'Federal Student Loan'
    STUDENT_LOAN_PRIVATE = 'student_loan_private', 'Private Student Loan'
    BOAT_LOAN = 'boat_loan', 'Boat/RV Loan'
    
    # Other Liabilities
    MEDICAL_DEBT = 'medical_debt', 'Medical Debt'
    TAX_DEBT = 'tax_debt', 'Tax Debt Owed'
    FAMILY_LOAN = 'family_loan', 'Loan from Family/Friends'
    OTHER_LIABILITY = 'other_liability', 'Other Liability'


# Type Sets for calculations
CASH_TYPES = {
    AccountType.CHECKING, AccountType.SAVINGS, AccountType.MONEY_MARKET,
    AccountType.CD, AccountType.CASH
}

INVESTMENT_TYPES = {AccountType.BROKERAGE, AccountType.CRYPTO}

RETIREMENT_TYPES = {
    AccountType.TRADITIONAL_401K, AccountType.ROTH_401K,
    AccountType.TRADITIONAL_IRA, AccountType.ROTH_IRA,
    AccountType.SEP_IRA, AccountType.SIMPLE_IRA,
    AccountType.TSP, AccountType.PENSION, AccountType.ANNUITY, AccountType.HSA
}

PROPERTY_TYPES = {
    AccountType.PRIMARY_RESIDENCE, AccountType.RENTAL_PROPERTY,
    AccountType.VACATION_PROPERTY, AccountType.LAND, AccountType.COMMERCIAL_PROPERTY
}

PERSONAL_PROPERTY_TYPES = {
    AccountType.VEHICLE, AccountType.BOAT, AccountType.JEWELRY, AccountType.OTHER_ASSET
}

RECEIVABLE_TYPES = {
    AccountType.ACCOUNTS_RECEIVABLE, AccountType.LOANS_RECEIVABLE, AccountType.TAX_REFUND
}

ASSET_TYPES = CASH_TYPES | INVESTMENT_TYPES | RETIREMENT_TYPES | PROPERTY_TYPES | PERSONAL_PROPERTY_TYPES | RECEIVABLE_TYPES

REVOLVING_DEBT_TYPES = {
    AccountType.CREDIT_CARD, AccountType.STORE_CARD,
    AccountType.HELOC, AccountType.PERSONAL_LOC, AccountType.BUSINESS_LOC
}

MORTGAGE_TYPES = {
    AccountType.PRIMARY_MORTGAGE, AccountType.RENTAL_MORTGAGE, AccountType.SECOND_MORTGAGE
}

INSTALLMENT_DEBT_TYPES = {
    AccountType.AUTO_LOAN, AccountType.PERSONAL_LOAN,
    AccountType.STUDENT_LOAN_FEDERAL, AccountType.STUDENT_LOAN_PRIVATE,
    AccountType.BOAT_LOAN, AccountType.MEDICAL_DEBT, AccountType.TAX_DEBT,
    AccountType.FAMILY_LOAN, AccountType.OTHER_LIABILITY
} | MORTGAGE_TYPES

LIABILITY_TYPES = REVOLVING_DEBT_TYPES | INSTALLMENT_DEBT_TYPES

LIQUID_TYPES = CASH_TYPES | INVESTMENT_TYPES

TAX_ADVANTAGED_TYPES = RETIREMENT_TYPES | {AccountType.HSA}


class AssetGroup(HouseholdOwnedModel):
    """Groups related assets and liabilities (e.g., house + mortgage)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'asset_groups'
    
    def __str__(self):
        return f"{self.household.name} - {self.name}"
    
    @property
    def total_cost_basis(self) -> Decimal:
        total = Decimal('0')
        for account in self.accounts.filter(account_type__in=ASSET_TYPES):
            snapshot = account.latest_snapshot
            if snapshot and snapshot.cost_basis:
                total += snapshot.cost_basis
        return total
    
    @property
    def total_market_value(self) -> Decimal:
        total = Decimal('0')
        for account in self.accounts.filter(account_type__in=ASSET_TYPES):
            snapshot = account.latest_snapshot
            if snapshot and snapshot.market_value:
                total += snapshot.market_value
        return total
    
    @property
    def total_debt(self) -> Decimal:
        total = Decimal('0')
        for account in self.accounts.filter(account_type__in=LIABILITY_TYPES):
            snapshot = account.latest_snapshot
            if snapshot:
                total += abs(snapshot.balance)
        return total
    
    @property
    def equity_at_market(self) -> Decimal:
        return self.total_market_value - self.total_debt
    
    @property
    def ltv_at_market(self) -> Decimal | None:
        market = self.total_market_value
        return self.total_debt / market if market > 0 else None


class Account(HouseholdOwnedModel):
    """A financial account - asset or liability."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=30, choices=AccountType.choices)
    institution = models.CharField(max_length=200, blank=True)
    account_number_last4 = models.CharField(max_length=4, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    
    asset_group = models.ForeignKey(
        AssetGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='accounts'
    )
    owner = models.ForeignKey(
        'core.HouseholdMember', on_delete=models.SET_NULL, null=True, blank=True, related_name='accounts'
    )
    employer_name = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'accounts'
        ordering = ['display_order', 'name']
    
    def __str__(self):
        return f"{self.household.name} - {self.name}"
    
    @property
    def is_asset(self) -> bool:
        return self.account_type in ASSET_TYPES
    
    @property
    def is_liability(self) -> bool:
        return self.account_type in LIABILITY_TYPES
    
    @property
    def is_liquid(self) -> bool:
        return self.account_type in LIQUID_TYPES
    
    @property
    def latest_snapshot(self):
        return self.snapshots.order_by('-as_of_date', '-recorded_at').first()
    
    @property
    def current_balance(self) -> Decimal:
        snapshot = self.latest_snapshot
        return snapshot.balance if snapshot else Decimal('0')


class BalanceSnapshot(models.Model):
    """Point-in-time balance record with dual-basis tracking."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='snapshots')
    as_of_date = models.DateField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    balance = models.DecimalField(max_digits=14, decimal_places=2)
    cost_basis = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    market_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'balance_snapshots'
        ordering = ['-as_of_date', '-recorded_at']
        indexes = [models.Index(fields=['account', '-as_of_date'])]
    
    def __str__(self):
        return f"{self.account.name} @ {self.as_of_date}: {self.balance}"
    
    @property
    def unrealized_gain(self) -> Decimal | None:
        if self.cost_basis is not None and self.market_value is not None:
            return self.market_value - self.cost_basis
        return None
    
    def save(self, *args, **kwargs):
        if self.account.is_asset:
            if self.market_value is not None and self.balance is None:
                self.balance = self.market_value
            elif self.balance is not None and self.market_value is None:
                self.market_value = self.balance
        super().save(*args, **kwargs)


class LiabilityDetails(models.Model):
    """Extended details for liability accounts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='liability_details')
    
    interest_rate = models.DecimalField(
        max_digits=7, decimal_places=5,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="As decimal: 0.065 = 6.5%"
    )
    rate_type = models.CharField(max_length=20, choices=[('fixed', 'Fixed'), ('variable', 'Variable')], default='fixed')
    
    original_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    origination_date = models.DateField(null=True, blank=True)
    maturity_date = models.DateField(null=True, blank=True)
    term_months = models.PositiveIntegerField(null=True, blank=True)
    
    minimum_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_day_of_month = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(31)]
    )
    is_interest_only = models.BooleanField(default=False)
    includes_escrow = models.BooleanField(default=False)
    escrow_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    credit_limit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    
    # Variable rate fields
    rate_index = models.CharField(max_length=50, blank=True)
    rate_margin = models.DecimalField(max_digits=7, decimal_places=5, null=True, blank=True)
    rate_floor = models.DecimalField(max_digits=7, decimal_places=5, null=True, blank=True)
    rate_ceiling = models.DecimalField(max_digits=7, decimal_places=5, null=True, blank=True)
    
    # Student loan specific
    servicer = models.CharField(max_length=200, blank=True)
    is_income_driven = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'liability_details'
    
    @property
    def interest_rate_display(self) -> str:
        return f"{self.interest_rate * 100:.2f}%"


class AssetDetails(models.Model):
    """Extended details for asset accounts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='asset_details')
    
    acquisition_date = models.DateField(null=True, blank=True)
    acquisition_cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    
    # Real property
    property_type = models.CharField(max_length=50, blank=True)
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    square_footage = models.PositiveIntegerField(null=True, blank=True)
    lot_size_acres = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    year_built = models.PositiveIntegerField(null=True, blank=True)
    
    annual_property_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_insurance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_hoa = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    monthly_rent_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Vehicles
    vin = models.CharField(max_length=17, blank=True)
    make = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    mileage = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'asset_details'
    
    @property
    def monthly_carrying_cost(self) -> Decimal:
        total = Decimal('0')
        if self.annual_property_tax:
            total += self.annual_property_tax / 12
        if self.annual_insurance:
            total += self.annual_insurance / 12
        if self.annual_hoa:
            total += self.annual_hoa / 12
        return total
```

---

## apps/accounts/admin.py

```python
from django.contrib import admin
from .models import Account, BalanceSnapshot, AssetGroup, LiabilityDetails, AssetDetails

class BalanceSnapshotInline(admin.TabularInline):
    model = BalanceSnapshot
    extra = 1
    readonly_fields = ('recorded_at',)

class LiabilityDetailsInline(admin.StackedInline):
    model = LiabilityDetails
    extra = 0

class AssetDetailsInline(admin.StackedInline):
    model = AssetDetails
    extra = 0

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'household', 'account_type', 'is_active', 'current_balance')
    list_filter = ('account_type', 'is_active', 'household')
    search_fields = ('name', 'institution')
    inlines = [BalanceSnapshotInline, LiabilityDetailsInline, AssetDetailsInline]
    
    def current_balance(self, obj):
        return obj.current_balance
    current_balance.short_description = 'Balance'

@admin.register(AssetGroup)
class AssetGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'household', 'total_market_value', 'total_debt', 'equity_at_market')
    list_filter = ('household',)

@admin.register(BalanceSnapshot)
class BalanceSnapshotAdmin(admin.ModelAdmin):
    list_display = ('account', 'as_of_date', 'balance', 'market_value', 'cost_basis')
    list_filter = ('as_of_date', 'account__household')
    date_hierarchy = 'as_of_date'
```

---

## Update config/settings/base.py

Add to INSTALLED_APPS:
```python
'apps.accounts',
```

---

## Verification Steps

1. Make and run migrations:
   ```bash
   docker-compose exec backend python manage.py makemigrations accounts
   docker-compose exec backend python manage.py migrate
   ```

2. Verify in admin:
   - Create an Account
   - Add BalanceSnapshot
   - Add LiabilityDetails for a debt account
   - Add AssetDetails for a property

3. Test type sets:
   ```python
   from apps.accounts.models import AccountType, ASSET_TYPES, LIABILITY_TYPES
   assert AccountType.CHECKING in ASSET_TYPES
   assert AccountType.CREDIT_CARD in LIABILITY_TYPES
   ```

## Acceptance Criteria
- [ ] All account types defined
- [ ] Type sets correctly categorize accounts
- [ ] BalanceSnapshot tracks dual-basis (cost + market)
- [ ] LiabilityDetails captures loan info
- [ ] AssetDetails captures property/vehicle info
- [ ] AssetGroup aggregates related accounts
- [ ] Admin interface works
- [ ] Migrations run without errors
