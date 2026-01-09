# Tax Reduction Features Plan

## Overview

This plan addresses missing tax reduction simulation features that allow users to model strategies for lowering their tax liability.

## Current State

### Already Implemented
- Federal tax brackets (10-37%)
- Standard deductions by filing status
- FICA (Social Security 6.2% + Medicare 1.45%/2.35%)
- State tax withholding (flat rate approximations)
- Pre-tax 401k/403b/TSP contributions
- HSA/FSA contributions
- Pre-tax health/dental/vision insurance
- Self-employment estimated expenses
- W-4 deductions field (backend only)

### Missing Features
1. Traditional IRA contributions
2. Itemized deduction UI and logic
3. Depreciation (Section 179 and MACRS)
4. Business profit/loss pass-through

---

## Feature 1: Traditional IRA Contributions

### Problem
Traditional IRA reduces AGI but is currently not in `PreTaxDeduction` types (only Roth IRA exists as post-tax).

### Solution

**Backend Changes:**

1. Add `TRADITIONAL_IRA = 'traditional_ira', 'Traditional IRA'` to `PreTaxDeduction.DeductionType`

2. Update `PaycheckCalculator` to handle IRA differently:
   - IRA contributions are NOT payroll deductions (unlike 401k)
   - They reduce AGI at tax time, not per-paycheck withholding
   - Need a separate model or flag to distinguish "payroll deduction" vs "tax-time deduction"

3. Add new model `TaxTimeDeduction`:
```python
class TaxTimeDeduction(HouseholdOwnedModel):
    """Deductions that reduce AGI at tax time (not payroll)."""

    class DeductionType(models.TextChoices):
        TRADITIONAL_IRA = 'traditional_ira', 'Traditional IRA'
        STUDENT_LOAN_INTEREST = 'student_loan_interest', 'Student Loan Interest'
        EDUCATOR_EXPENSES = 'educator_expenses', 'Educator Expenses'
        SELF_EMPLOYED_HEALTH = 'se_health_insurance', 'Self-Employed Health Insurance'

    income_source = models.ForeignKey(IncomeSource, ...)  # or Household
    deduction_type = models.CharField(...)
    annual_amount = models.DecimalField(...)
    is_active = models.BooleanField(default=True)
```

**Frontend Changes:**
- Add "Tax-Time Deductions" section to Settings
- Include Traditional IRA with contribution limit validation ($7,500 + $1,000 catch-up)

**Tax Calculation Impact:**
- Reduces federal taxable income when calculating annual tax liability
- Does NOT affect per-paycheck withholding calculations
- Creates a difference between "withholding" and "actual tax owed"

---

## Feature 2: Itemized vs Standard Deduction

### Problem
`W2Withholding.deductions` field exists but:
- No UI to expose it
- No guidance on what itemized deductions include
- No comparison tool to help users decide

### Solution

**Backend Changes:**

1. Add `ItemizedDeduction` model:
```python
class ItemizedDeduction(HouseholdOwnedModel):
    """Individual itemized deduction items."""

    class DeductionType(models.TextChoices):
        MORTGAGE_INTEREST = 'mortgage_interest', 'Mortgage Interest'
        PROPERTY_TAX = 'property_tax', 'Property Tax'
        STATE_LOCAL_TAX = 'salt', 'State & Local Tax (SALT)'
        CHARITABLE = 'charitable', 'Charitable Contributions'
        MEDICAL = 'medical', 'Medical Expenses (>7.5% AGI)'
        CASUALTY_LOSS = 'casualty', 'Casualty/Theft Loss'
        OTHER = 'other', 'Other'

    deduction_type = models.CharField(...)
    description = models.CharField(max_length=200, blank=True)
    annual_amount = models.DecimalField(...)

    # For recurring items
    is_recurring = models.BooleanField(default=True)
```

2. Add household-level tax preference:
```python
# In Household model or new TaxPreferences model
deduction_method = models.CharField(
    choices=[('standard', 'Standard'), ('itemized', 'Itemized')],
    default='standard'
)
```

**Frontend Changes:**

1. Add "Deduction Method" toggle in Tax Settings:
   - Show standard deduction amount based on filing status
   - Allow switching to itemized
   - Show itemized total vs standard comparison

2. Itemized deductions form:
   - Mortgage interest (pull from linked accounts if available)
   - Property taxes
   - SALT (capped at $10,000)
   - Charitable contributions
   - Medical expenses with 7.5% AGI threshold calculation

**Tax Calculation Impact:**
- Replace standard deduction with itemized total when itemized > standard
- Update `W2Withholding.deductions` field automatically
- Recalculate effective tax rate

---

## Feature 3: Depreciation (Section 179 & MACRS)

### Problem
Depreciation reduces taxable income but is NOT a cash flow event. Currently no way to model this for:
- Self-employed with business equipment
- Rental property owners
- Vehicle depreciation for business use

### Key Insight
Depreciation affects tax liability calculations but should NOT appear as a cash flow. It's a "phantom" deduction.

### Solution

**Backend Changes:**

1. Add `DepreciableAsset` model:
```python
class DepreciableAsset(HouseholdOwnedModel):
    """Assets that can be depreciated for tax purposes."""

    class AssetType(models.TextChoices):
        EQUIPMENT = 'equipment', 'Business Equipment'
        VEHICLE = 'vehicle', 'Vehicle'
        REAL_PROPERTY = 'real_property', 'Real Property'
        FURNITURE = 'furniture', 'Furniture/Fixtures'
        COMPUTER = 'computer', 'Computer/Software'
        OTHER = 'other', 'Other'

    class DepreciationMethod(models.TextChoices):
        SECTION_179 = 'section_179', 'Section 179 (Full Year 1)'
        MACRS_5 = 'macrs_5', 'MACRS 5-Year'
        MACRS_7 = 'macrs_7', 'MACRS 7-Year'
        MACRS_27_5 = 'macrs_27_5', 'MACRS 27.5-Year (Residential)'
        MACRS_39 = 'macrs_39', 'MACRS 39-Year (Commercial)'
        STRAIGHT_LINE = 'straight_line', 'Straight Line'

    # Link to income source (for self-employment/rental)
    income_source = models.ForeignKey(
        IncomeSource, on_delete=models.CASCADE,
        related_name='depreciable_assets',
        null=True, blank=True
    )

    name = models.CharField(max_length=200)
    asset_type = models.CharField(...)

    # Cost basis
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_date = models.DateField()

    # Depreciation settings
    depreciation_method = models.CharField(...)
    useful_life_years = models.PositiveSmallIntegerField(null=True, blank=True)
    salvage_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Business use percentage (for mixed-use assets like vehicles)
    business_use_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100.00')
    )

    # Tracking
    accumulated_depreciation = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    is_active = models.BooleanField(default=True)
    disposed_date = models.DateField(null=True, blank=True)
```

2. Add depreciation calculation service:
```python
class DepreciationCalculator:
    """Calculate annual depreciation for tax purposes."""

    MACRS_RATES = {
        'macrs_5': [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576],
        'macrs_7': [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
        # ... etc
    }

    def calculate_annual_depreciation(self, asset, tax_year):
        """Returns depreciation amount for the given tax year."""
        # Section 179: full deduction in year 1 (up to limit)
        # MACRS: use rate tables
        # Straight line: (cost - salvage) / useful_life
```

**Frontend Changes:**

1. Add "Business Assets" section for self-employed income sources
2. Asset entry form with:
   - Asset details
   - Depreciation method selector with explanations
   - Business use percentage slider
   - Depreciation schedule preview

3. Show depreciation impact:
   - "This reduces your taxable income by $X but does not affect cash flow"
   - Warning about depreciation recapture on sale

**Tax Calculation Impact:**

1. Annual depreciation reduces self-employment/rental income for tax purposes
2. Does NOT create expense flows (not a cash event)
3. Track accumulated depreciation for basis calculations
4. Consider depreciation recapture when modeling asset sales

**Important Notes:**
- Section 179 limit for 2026: ~$1,220,000 (phase-out above ~$3,050,000)
- Bonus depreciation: 40% in 2026, phasing down
- Vehicle depreciation limits apply
- Depreciation recapture taxed at 25% for real property

---

## Feature 4: Business Pass-Through Losses

### Problem
Self-employment losses (Schedule C) can offset W-2 income, reducing overall tax liability. Currently no way to model:
- Business losses offsetting other income
- Excess business loss limitations
- Net Operating Loss (NOL) carryforward

### Solution

**Backend Changes:**

1. Allow negative `estimated_annual_expenses` to exceed income on `SelfEmploymentTax`:
```python
# Already have estimated_annual_expenses
# Add explicit net income calculation
@property
def net_business_income(self):
    gross = self.income_source.gross_annual
    expenses = self.estimated_annual_expenses
    depreciation = sum(a.current_year_depreciation for a in self.income_source.depreciable_assets.all())
    return gross - expenses - depreciation  # Can be negative
```

2. Add household-level AGI calculation that combines all income sources:
```python
class HouseholdTaxCalculator:
    """Calculate household-level tax liability across all income sources."""

    def calculate_agi(self):
        total = Decimal('0')
        for source in self.household.income_sources.filter(is_active=True):
            if source.income_type == 'self_employed':
                total += source.se_tax_config.net_business_income
            else:
                total += source.gross_annual
        # Apply above-the-line deductions
        total -= self.get_tax_time_deductions()
        return total

    def calculate_total_tax_liability(self):
        agi = self.calculate_agi()
        # Apply deductions (standard or itemized)
        # Calculate federal tax
        # Add self-employment tax on SE income
        # Add state taxes
        # Subtract credits
```

3. Add excess business loss tracking:
```python
# 2026 excess business loss threshold: ~$305,000 single, ~$610,000 married
# Losses above this become NOL carryforward
```

**Frontend Changes:**

1. "Business Profit/Loss" view for self-employed sources:
   - Revenue
   - Expenses by category
   - Depreciation (non-cash)
   - Net profit/loss

2. Household-level tax summary showing:
   - All income sources
   - How losses offset gains
   - Final AGI
   - Effective tax rate across all income

3. Scenario comparison:
   - "What if I increase business expenses?"
   - "What if I take Section 179 depreciation?"

---

## Implementation Priority

### Phase 1: Quick Wins
1. **Itemized deduction UI** - Backend field exists, just need frontend
2. **Traditional IRA** - Simple addition to deduction types

### Phase 2: Core Tax Reduction
3. **Tax-time deductions model** - Foundation for IRA and other above-the-line deductions
4. **Household-level tax calculator** - Combine all income sources

### Phase 3: Advanced Features
5. **Depreciation model and calculator** - Complex but high value for self-employed
6. **Business pass-through losses** - Requires household-level calculations

### Phase 4: Refinements
7. **Excess business loss limitations**
8. **NOL carryforward tracking**
9. **Depreciation recapture on asset sales**

---

## Database Migrations Required

1. Add `traditional_ira` to `PreTaxDeduction.DeductionType` choices
2. Create `TaxTimeDeduction` model
3. Create `ItemizedDeduction` model
4. Add `deduction_method` to Household or new TaxPreferences
5. Create `DepreciableAsset` model
6. Add `net_business_income` property/field to SelfEmploymentTax

---

## API Endpoints Needed

```
# Tax-time deductions
POST   /api/tax-deductions/
GET    /api/tax-deductions/
PUT    /api/tax-deductions/{id}/
DELETE /api/tax-deductions/{id}/

# Itemized deductions
POST   /api/itemized-deductions/
GET    /api/itemized-deductions/
PUT    /api/itemized-deductions/{id}/
DELETE /api/itemized-deductions/{id}/
GET    /api/itemized-deductions/summary/  # total vs standard comparison

# Depreciable assets
POST   /api/depreciable-assets/
GET    /api/depreciable-assets/
PUT    /api/depreciable-assets/{id}/
DELETE /api/depreciable-assets/{id}/
GET    /api/depreciable-assets/{id}/schedule/  # depreciation schedule

# Household tax summary
GET    /api/household/tax-summary/  # combined AGI, deductions, liability
```

---

## UI Mockup Concepts

### Settings > Tax Preferences
```
┌─────────────────────────────────────────────────────┐
│ Deduction Method                                    │
│ ○ Standard Deduction ($15,700)                      │
│ ● Itemized Deductions ($18,450)                     │
│   └─ You save $687 with itemized deductions         │
├─────────────────────────────────────────────────────┤
│ Itemized Deductions                      [+ Add]    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Mortgage Interest              $12,000/yr       │ │
│ │ Property Tax                    $4,500/yr       │ │
│ │ Charitable                      $1,950/yr       │ │
│ │ SALT (capped)                  $10,000/yr       │ │
│ └─────────────────────────────────────────────────┘ │
│ Total: $18,450 (exceeds standard by $2,750)         │
└─────────────────────────────────────────────────────┘
```

### Self-Employment > Business Assets
```
┌─────────────────────────────────────────────────────┐
│ Business Assets & Depreciation                      │
├─────────────────────────────────────────────────────┤
│ MacBook Pro (Computer)                              │
│   Cost: $3,000 │ Method: Section 179                │
│   2026 Depreciation: $3,000                         │
│   ⚠️ This reduces taxable income, not cash flow    │
├─────────────────────────────────────────────────────┤
│ Work Vehicle (Vehicle)                              │
│   Cost: $45,000 │ Method: MACRS 5-Year              │
│   Business Use: 60%                                 │
│   2026 Depreciation: $5,400                         │
├─────────────────────────────────────────────────────┤
│ Total 2026 Depreciation: $8,400                     │
│ Tax Savings (est.): $2,016                          │
└─────────────────────────────────────────────────────┘
```
