# Model Schema Review: Unimplemented & Unused Fields/Functionality

This document identifies fields, models, and functionality that are defined in the schema but not yet implemented or are unused.

---

## Summary

| Category | Count |
|----------|-------|
| Completely Unused Fields | 18 |
| Partially Implemented Fields | 12 |
| Unimplemented Models/Features | 8 |
| Missing Service Integrations | 6 |

---

## 1. Core Models (`backend/apps/core/models.py`)

### User Model
| Field | Status | Notes |
|-------|--------|-------|
| `date_of_birth` | **UNUSED** | Defined but never used in serializers, views, or calculations |

### Household Model
| Field | Status | Notes |
|-------|--------|-------|
| `stripe_customer_id` | **UNIMPLEMENTED** | Subscription field defined but Stripe integration not implemented |
| `subscription_status` | **UNIMPLEMENTED** | Field exists but no subscription management logic |
| `trial_ends_at` | **UNIMPLEMENTED** | Never referenced in any business logic |
| `plan` | **PARTIALLY USED** | Defaults to 'free', no plan-based feature gating |
| `fiscal_year_start_month` | **UNUSED** | Defined but not used in any calculations or reporting |

### HouseholdMembership Model
| Field | Status | Notes |
|-------|--------|-------|
| `invited_by` | **UNIMPLEMENTED** | FK exists but invitation system not implemented |

**Missing Functionality:**
- [ ] Stripe subscription integration (customer creation, subscription management, webhooks)
- [ ] Invitation system for household members
- [ ] Fiscal year-based reporting and calculations
- [ ] Plan-based feature restrictions

---

## 2. Accounts Models (`backend/apps/accounts/models.py`)

### Account Model
| Field | Status | Notes |
|-------|--------|-------|
| `display_order` | **UNUSED** | Defined but no reordering UI or logic |
| `employer_name` | **PARTIALLY USED** | Collected but not displayed prominently |

### AssetGroup Model
| Property | Status | Notes |
|----------|--------|-------|
| `total_cost_basis` | **NOT EXPOSED** | Computed property not in serializer |
| `ltv_at_market` | **NOT EXPOSED** | Computed property not in serializer |

### BalanceSnapshot Model
| Field | Status | Notes |
|-------|--------|-------|
| `notes` | **UNUSED** | Field exists but not exposed in any UI/API |

### LiabilityDetails Model - Variable Rate Fields
| Field | Status | Notes |
|-------|--------|-------|
| `rate_index` | **UNUSED** | Defined but never used in calculations |
| `rate_margin` | **UNUSED** | No variable rate adjustment logic |
| `rate_floor` | **UNUSED** | No rate bounds checking |
| `rate_ceiling` | **UNUSED** | No rate bounds checking |
| `is_interest_only` | **UNUSED** | Not used in payment calculations |
| `includes_escrow` | **UNUSED** | No escrow tracking |
| `escrow_amount` | **UNUSED** | Not used in monthly payment calculations |
| `payment_day_of_month` | **UNUSED** | Not used for cash flow timing |

### AssetDetails Model - Real Property Fields
| Field | Status | Notes |
|-------|--------|-------|
| `property_type` | **UNUSED** | No UI to collect |
| `address_line1/2` | **UNUSED** | No UI to collect |
| `city`, `state`, `zip_code` | **UNUSED** | No UI to collect |
| `square_footage` | **UNUSED** | No UI to collect |
| `lot_size_acres` | **UNUSED** | No UI to collect |
| `year_built` | **UNUSED** | No UI to collect |
| `annual_property_tax` | **DISCONNECTED** | Not linked to RecurringFlow expenses |
| `annual_insurance` | **DISCONNECTED** | Not linked to RecurringFlow expenses |
| `annual_hoa` | **DISCONNECTED** | Not linked to RecurringFlow expenses |
| `monthly_rent_income` | **DISCONNECTED** | Not linked to income flows |

### AssetDetails Model - Vehicle Fields
| Field | Status | Notes |
|-------|--------|-------|
| `vin` | **UNUSED** | No UI to collect |
| `make`, `model`, `year` | **UNUSED** | No UI to collect |
| `mileage` | **UNUSED** | No UI to collect |

**Missing Functionality:**
- [ ] Asset detail collection UI (real estate, vehicles)
- [ ] Variable rate debt recalculation service
- [ ] Link AssetDetails carrying costs to RecurringFlow
- [ ] Account reordering functionality
- [ ] Cash flow timing based on payment dates

---

## 3. Flows Models (`backend/apps/flows/models.py`)

### RecurringFlow Model
| Field | Status | Notes |
|-------|--------|-------|
| `is_baseline` | **UNUSED** | Defined but not used in scenario differentiation |
| `income_source` | **UNUSED** | FK defined but not used to sync income amounts |
| `linked_account` | **PARTIALLY USED** | FK exists but not enforced or validated |

### FlowType Enum
| Value | Status | Notes |
|-------|--------|-------|
| `TRANSFER` | **UNIMPLEMENTED** | Flow type defined but no transfer functionality |

**Missing Functionality:**
- [ ] Transfer flow type implementation (between accounts)
- [ ] Automatic sync of RecurringFlow from IncomeSource.gross_annual
- [ ] Baseline vs scenario flow differentiation

---

## 4. Taxes Models (`backend/apps/taxes/models.py`)

### PostTaxDeduction Model
| Status | **COMPLETELY UNIMPLEMENTED** |
|--------|------------------------------|
| Notes | Model defined but no serializer, views, or API endpoints |

The `PostTaxDeduction` model includes:
- Roth IRA contributions
- Life insurance (post-tax)
- Union dues
- Wage garnishments
- Child support
- 401(k) loan repayment
- Charitable contributions

### SelfEmploymentTax Model
| Status | **COMPLETELY UNIMPLEMENTED** |
|--------|------------------------------|
| Notes | Model defined but no serializer, views, or service integration |

The `SelfEmploymentTax` model includes:
- Quarterly estimated payments (Q1-Q4)
- Estimated annual expenses
- Retirement contribution percentage

### IncomeSource Model
| Field | Status | Notes |
|-------|--------|-------|
| `start_date` | **UNUSED** | Defined but not used in calculations |
| `end_date` | **UNUSED** | Defined but not used in calculations |

### W2Withholding Model
| Field | Status | Notes |
|-------|--------|-------|
| `state_allowances` | **UNUSED** | Not used in state tax calculations (flat rate used instead) |

### PreTaxDeduction Model
| Field | Status | Notes |
|-------|--------|-------|
| `target_account` | **UNUSED** | FK defined but not used to link contributions to accounts |

**Missing Functionality:**
- [ ] PostTaxDeduction serializer, views, and API endpoints
- [ ] SelfEmploymentTax serializer, views, and calculator
- [ ] Self-employment tax calculations (SE tax rate, QBI deduction)
- [ ] State-specific tax calculations (currently uses flat rates)
- [ ] Income source date range filtering in calculations
- [ ] Link pre-tax deductions to target retirement accounts

---

## 5. Metrics Models (`backend/apps/metrics/models.py`)

All fields are actively used, but missing functionality:

**Missing Functionality:**
- [ ] Scheduled automatic metric recalculation (daily/weekly cron job)
- [ ] Historical trend analysis (week-over-week, month-over-month)
- [ ] Metric alerts/notifications when thresholds crossed
- [ ] Metric forecasting based on scenario projections

---

## 6. Scenarios Models (`backend/apps/scenarios/models.py`)

### Scenario Model
| Field | Status | Notes |
|-------|--------|-------|
| `parent_scenario` | **UNIMPLEMENTED** | Self-referential FK for inheritance not used |

### ScenarioProjection Model
| Field | Status | Notes |
|-------|--------|-------|
| `retirement_assets` | **ALWAYS ZERO** | Set to `Decimal('0')`, not calculated |
| `asset_breakdown` | **ALWAYS EMPTY** | Set to `{}`, not populated |
| `liability_breakdown` | **ALWAYS EMPTY** | Set to `{}`, not populated |

### ChangeType Enum - Unimplemented Types
| Change Type | Status |
|-------------|--------|
| `MODIFY_INCOME` | **UNIMPLEMENTED** in ScenarioEngine |
| `MODIFY_EXPENSE` | **UNIMPLEMENTED** in ScenarioEngine |
| `MODIFY_ASSET` | **UNIMPLEMENTED** in ScenarioEngine |
| `MODIFY_DEBT` | **UNIMPLEMENTED** in ScenarioEngine |
| `SELL_ASSET` | **UNIMPLEMENTED** in ScenarioEngine |
| `REFINANCE` | **UNIMPLEMENTED** in ScenarioEngine |
| `MODIFY_401K` | **UNIMPLEMENTED** in ScenarioEngine |
| `MODIFY_HSA` | **UNIMPLEMENTED** in ScenarioEngine |

### ScenarioComparison Model
| Status | **PARTIALLY IMPLEMENTED** |
|--------|--------------------------|
| Notes | Model exists, API exists, but limited functionality |

**Missing Functionality:**
- [ ] Scenario inheritance from parent_scenario
- [ ] Full implementation of all ChangeType variations
- [ ] Proper retirement_assets calculation
- [ ] Asset/liability breakdown population
- [ ] Advanced comparison analytics

---

## 7. Frontend Type Mismatches (`frontend/lib/types.ts`)

### Account Interface
| Field | Status | Notes |
|-------|--------|-------|
| `currentMarketValue` | **NOT RETURNED** | Defined in types but not in API response |
| `currentCostBasis` | **NOT RETURNED** | Defined in types but not in API response |

### Missing Frontend Types
- `PostTaxDeduction` - No frontend interface
- `SelfEmploymentTax` - No frontend interface
- `AssetDetails` - No frontend interface
- `LiabilityDetails` - No frontend interface

---

## 8. Missing Service Integrations

| Integration | Status | Model Fields Exist |
|-------------|--------|-------------------|
| **Stripe Subscriptions** | Not Implemented | `stripe_customer_id`, `subscription_status`, `plan`, `trial_ends_at` |
| **Plaid/Bank Sync** | Not Implemented | Account structure supports it |
| **Tax Filing APIs** | Not Implemented | Tax models defined |
| **Investment Data APIs** | Not Implemented | `market_value`, `cost_basis` fields exist |

---

## 9. Scenario Engine Gaps (`backend/apps/scenarios/services.py`)

The `ScenarioEngine._apply_change()` method only handles:
- `ADD_INCOME` ✓
- `REMOVE_INCOME` ✓
- `ADD_EXPENSE` ✓
- `REMOVE_EXPENSE` ✓
- `ADD_DEBT` ✓
- `PAYOFF_DEBT` ✓
- `LUMP_SUM_INCOME` ✓
- `LUMP_SUM_EXPENSE` ✓

**Not Implemented:**
- `MODIFY_INCOME` - Change income amount
- `MODIFY_EXPENSE` - Change expense amount
- `MODIFY_ASSET` - Adjust asset value
- `MODIFY_DEBT` - Change debt parameters
- `SELL_ASSET` - Asset sale with capital gains
- `REFINANCE` - Debt refinancing with new terms
- `MODIFY_401K` - Adjust contribution rate
- `MODIFY_HSA` - Adjust contribution rate

---

## 10. Recommendations - Priority Order

### High Priority (Core Functionality Gaps)
1. **Implement PostTaxDeduction API** - Needed for accurate net pay calculations
2. **Implement remaining ChangeTypes** - Critical for scenario modeling
3. **Add retirement_assets calculation** - Users need retirement projections
4. **Fix currentMarketValue/currentCostBasis API response** - Type mismatch causes frontend issues

### Medium Priority (Feature Completeness)
5. **Add AssetDetails UI collection** - Property/vehicle details unused
6. **Implement SelfEmploymentTax calculations** - Many users are self-employed
7. **Link income_source FK to RecurringFlow** - Keep income in sync
8. **Add transfer flow type** - Track internal transfers

### Lower Priority (Enhancement)
9. **Stripe integration** - Monetization
10. **Scheduled metric snapshots** - Automation
11. **Variable rate debt adjustments** - Accuracy for ARM mortgages
12. **Fiscal year reporting** - Business users

---

## Appendix: Field-by-File Reference

### Files with Most Unused Fields
1. `backend/apps/accounts/models.py` - 18 unused/disconnected fields
2. `backend/apps/taxes/models.py` - 8 unused fields + 2 unimplemented models
3. `backend/apps/scenarios/models.py` - 4 unused fields + 8 unimplemented change types
4. `backend/apps/core/models.py` - 6 unused fields

### Models Requiring Full Implementation
1. `PostTaxDeduction` - Serializer, views, frontend, calculator integration
2. `SelfEmploymentTax` - Serializer, views, frontend, calculator
3. `AssetDetails` - UI collection, linking to expenses
4. `LiabilityDetails` (variable rate fields) - Rate adjustment service
