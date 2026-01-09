# TASK-15 — Stress Tests + Scenario Comparisons “Why” + Multi-Horizon Projections + Canonical Taxonomy (Improvements #7–#10)

> **Revision Notice (v1.2 — Jan 2026):** This document was revised end-to-end to resolve spec bugs and compatibility issues:
> - Stress test templates are declarative (no lambdas/undefined helpers) and the full template set is specified.
> - Stress test ChangeTypes (`ADJUST_INTEREST_RATES`, `ADJUST_INVESTMENT_VALUE`) have explicit parameter schemas and engine handling.
> - Stress test run results JSON schema is defined.
> - Driver decomposition math was corrected to avoid double counting and reconcile to net worth delta.
> - Comparison API includes hard limits (max scenarios/horizon) and ownership validation.
> - Multi-horizon schema migration is staged (non-breaking).
> - Taxonomy supports system + household custom categories and includes seed data requirements.
> - Implementation order revised to align dependencies.

---


## Cross-task Consistency Notes (NEW)
- This task uses the **unified template architecture** defined in TASK-13 (`backend/apps/templates/*`).
- This task must call the shared `run_decision_template()` from `backend/apps/scenarios/decision_builder.py`.
- This task must **NOT** define new ChangeTypes; implement handlers for ChangeTypes defined in TASK-13.


# Improvement #7 — Stress Test Suite (Financial Flight Simulator)

## 7.1 UX
`/stress-tests` shows stress cards and runs in 1 click, returning a scenario + results.

## 7.2 Backend: Declarative templates
**Path**
- `backend/apps/stress_tests/templates.py`

```py
STRESS_TESTS = {
  "income_drop_25": {
    "name": "Income drop 25%",
    "category": "Income",
    "description": "Reduce total income by 25% starting next month.",
    "template_key": "adjust_total_income",
    "default_inputs": { "amount": "-0.25", "mode": "percent", "start_date": "next_month" }
  }
}
```

**Runtime compilation**
- `resolve_inputs()` converts `"next_month"` to first day of next month.
- `run_stress_test()` calls shared `run_decision_template()`.

### Complete V1 template set
| Key | Template Key | Default Inputs |
|---|---|---|
| income_drop_10 | adjust_total_income | {amount:"-0.10", mode:"percent", start_date:"next_month"} |
| income_drop_25 | adjust_total_income | {amount:"-0.25", mode:"percent", start_date:"next_month"} |
| income_drop_50 | adjust_total_income | {amount:"-0.50", mode:"percent", start_date:"next_month"} |
| expense_spike_500 | adjust_total_expenses | {amount:"500.00", mode:"absolute", start_date:"next_month"} |
| expense_spike_1000 | adjust_total_expenses | {amount:"1000.00", mode:"absolute", start_date:"next_month"} |
| rate_shock_2 | adjust_interest_rates | {adjustment_percent:"2.0", applies_to:"variable", start_date:"next_month"} |
| inflation_spike | override_assumptions | {inflation_rate:"0.06", duration_months:24, start_date:"next_month"} |
| market_drop_20 | adjust_investment_value | {percent_change:"-0.20", recovery_months:36, start_date:"next_month"} |
| market_drop_40 | adjust_investment_value | {percent_change:"-0.40", recovery_months:48, start_date:"next_month"} |

---


### 7.2.1 Template Key Resolution (IMPORTANT)

Stress test `template_key` values must be resolved as follows:

| Stress Test template_key | Decision Template Key (via registry) | ChangeType Used |
|---|---|---|
| adjust_total_income | adjust_total_income | ADJUST_TOTAL_INCOME |
| adjust_total_expenses | adjust_total_expenses | ADJUST_TOTAL_EXPENSES |
| adjust_interest_rates | (direct) | ADJUST_INTEREST_RATES |
| adjust_investment_value | (direct) | ADJUST_INVESTMENT_VALUE |
| override_assumptions | (direct) | OVERRIDE_INFLATION / OVERRIDE_INVESTMENT_RETURN / OVERRIDE_SALARY_GROWTH |

Rules:
- If Decision Template exists (income/expense adjustments), call `run_decision_template()`.
- If stress-test-specific (interest rates, investment shocks, assumption overrides), compile directly to ScenarioChange specs and then call the shared projection engine.


## 7.3 Stress test ChangeTypes (explicit)

### ChangeType: `ADJUST_INTEREST_RATES`
**Parameters**
```json
{
  "adjustment_percent": "2.0",
  "applies_to": "variable",
  "account_ids": [],
  "effective_date": "2026-02-01"
}
```

**Engine handling**
- Identify affected debts.
- Increase APR by adjustment.
- Recompute interest accrual; if amortization supported, recalc payments.

### ChangeType: `ADJUST_INVESTMENT_VALUE`
**Parameters**
```json
{
  "percent_change": "-0.20",
  "recovery_months": 36,
  "applies_to": "all",
  "account_ids": [],
  "effective_date": "2026-02-01"
}
```

**Engine handling**
- Apply immediate drop at effective_date.
- Recovery (recommended):
  - linear recovery over recovery_months
  - cap at baseline trajectory for that month

---

## 7.4 Stress test results schema (required)
```json
{
  "summary": {
    "status": "failed",
    "first_negative_cash_flow_month": 8,
    "first_liquidity_breach_month": 6,
    "min_liquidity_months": -1.2,
    "min_dscr": 0.72,
    "max_net_worth_drawdown_percent": 18.4,
    "breached_thresholds_count": 3
  },
  "breaches": [
    { "metric": "liquidity_months", "threshold": 1.0, "first_breach_month": 6, "breach_duration_months": 14, "worst_value": -1.2 }
  ],
  "monthly_comparison": {
    "months": [1,2,3],
    "baseline_liquidity": [4.2,4.3,4.1],
    "stressed_liquidity": [4.2,3.8,3.2],
    "baseline_net_worth": [100000,100800,101500],
    "stressed_net_worth": [100000,95000,92000]
  }
}
```

---

# Improvement #8 — Scenario Comparisons that Explain “What Changed and Why”

## 8.1 API constraints (required)
- Max 4 scenarios (including baseline)
- Max horizon 360 months
- Ownership validation

## 8.2 Driver decomposition (correct math)
Compute drivers via monthly component deltas and reconcile:

- `NW_delta_end = NW_scenario_end - NW_baseline_end`
- Sum component deltas:
  - income (net)
  - spending (excluding principal if tracked)
  - interest (debt interest portion)
  - taxes
  - investment returns
  - other asset value changes
- Ensure Σ(drivers) ≈ NW_delta_end (<=1% tolerance); else add “Unattributed”.

Return drivers as buckets:
- Higher/Lower income
- Reduced/Increased spending
- Interest savings/costs
- Tax impact
- Investment performance
- Other asset changes
- Unattributed

---

# Improvement #9 — Multi-Horizon Projections (Monthly near-term + Annual long-term)

## 9.1 Safe staged schema migration (non-breaking)
1) Add fields:
- `period_date` nullable
- `granularity` default `"month"`
2) Populate `period_date = month`
3) Make `period_date` non-null
4) Add unique constraint: `(scenario, period_date, granularity)`
5) Deprecate `month` later

## 9.2 Computation approach (recommended)
Compute all months internally; persist:
- first 24 months as monthly
- year-end months thereafter as annual

---

# Improvement #10 — Canonical Taxonomy + Category Hygiene

## 10.1 Category model must support system + household custom
`Category.household` nullable:
- null = system category
- FK = user category
- `is_system` boolean
- `parent` optional for hierarchy
Unique `(household, key)`.

`CategoryRule` enhancements:
- household scoped + system rules
- match types: contains/prefix/suffix/regex/exact
- priority ordering
- learning counters

## 10.2 Seed data required
Provide `CANONICAL_CATEGORIES` and management command:
- `python manage.py seed_categories`

---

# Implementation order (revised)

## Backend
1) taxonomy app + seeds + endpoints
2) update flows to reference canonical categories
3) update metrics/scenario computations to use canonical groups
4) multi-horizon projections (schema + engine)
5) comparison service + endpoint
6) stress tests templates + run service

## Frontend
1) categories fix page + canonical picker
2) horizon selector + charts updates
3) scenario compare page
4) stress tests page

---

# Tests (expanded)
- Stress tests: income drop, market drop, rate shock, breach detection, results schema
- Comparisons: drivers sum ≈ NW delta, limits validation
- Multi-horizon: 5y monthly, 10y mixed, 30y mixed
- Taxonomy: seed, suggest, bulk assign, DSCR/savings rate uses canonical groups

