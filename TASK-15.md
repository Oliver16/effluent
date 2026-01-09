# TASK-15 — Stress Tests + Scenario Comparisons “Why” + Multi-Horizon Projections + Canonical Taxonomy (Improvements #7–#10)

> **Purpose:** This is an AI-agent-ready implementation plan for the final 4 major product upgrades:
>
> 7) **Stress Test Suite (“financial flight simulator”)**
> 8) **Scenario Comparisons that explain “what changed and why”**
> 9) **Multi-horizon projections (monthly near-term + annual long-term)**
> 10) **Canonical taxonomy + category hygiene (eliminate category chaos)**
>
> This spec is designed to be executed by an agentic coding model (Codex / Claude Code) against the existing codebase.
>
> It explicitly calls out:
> - what existing features are being **modified or replaced**
> - what new models/services/endpoints/pages are added
> - how to reuse ScenarioEngine, ScenarioProjection, insights, decision templates from TASK-13 and TASK-14
> - concrete payload shapes and implementation guardrails

---

## 0) Pre-Reqs & Dependencies

TASK-15 assumes:
- TASK-13: Goals + Data Quality + Decision Builder exist.
- TASK-14: Actions + Goal Seek + Taxes always-on exist.
- ScenarioEngine is reliable and projections persist as ScenarioProjection.

**Critical interdependencies:**
- Stress tests build scenarios via the same “decision template” infrastructure (compiler).
- Comparisons depend on projections and on category normalization for correct driver attribution.
- Multi-horizon touches ScenarioProjection schema and ScenarioEngine.
- Canonical taxonomy is foundational to accurate DSCR, savings rate, and “drivers”.

---

# Improvement #7 — Stress Test Suite (Financial Flight Simulator)

## 7.1 What this replaces / modifies

### Replaces
- Ad-hoc what-if scenarios manually created by users.
- No consistent “risk profiling” or resilience evaluation.

### Modifies
- Adds a new `StressTest` flow (templates + runs)
- Adds a UI page: `/stress-tests`
- Adds post-run results pages showing breakpoints and first-failure metrics

---

## 7.2 UX Requirements (Concrete)

### Stress Tests page `/stress-tests`
Grid of stress cards:
- Income drop: -10%, -25%, -50%
- Expense spike: +$500/mo, +$1000/mo
- Rate shock: +2% APR on variable debt
- Inflation spike: +3% inflation for 24 months
- Market drop: -20% / -40% on investments

Each card shows:
- short description
- “Run test” button
- time estimate (don’t show exact compute time; just “runs quickly”)

Click “Run test”:
- creates a scenario under the hood (parent = baseline)
- runs projection
- redirects to results view:
  - baseline vs stressed
  - “month you go negative”
  - min liquidity, min dscr, max drawdown
  - breaches count

---

## 7.3 Backend Implementation

### 7.3.1 Minimal viable: code-defined StressTest templates
Like decision templates and action templates, implement in code for v1.

**Path**
- `backend/apps/stress_tests/templates.py`

Example template:
```py
STRESS_TESTS = {
  "income_drop_25": {
    "name": "Income drop 25%",
    "category": "Income",
    "description": "Reduce total income by 25% starting next month.",
    "compile": lambda household, inputs: DecisionBuilderRequestDTO(
        template_key="adjust_total_income",
        scenario_name="Stress: Income drop 25%",
        inputs={ "amount": "-0.25", "mode": "percent", "start_date": default_start_date() }
    ),
  },
}
```

### 7.3.2 Add stress scenario changes / templates
Add or reuse ChangeTypes:
- `ADJUST_TOTAL_INCOME` supports percent mode (and absolute)
- `ADJUST_TOTAL_EXPENSES` supports absolute increase
- `ADJUST_INTEREST_RATES` (for debt APR shocks)
- `ADJUST_INFLATION_ASSUMPTION` (scenario-level assumption override)
- `ADJUST_INVESTMENT_RETURN` (scenario-level override / market shock)

If Scenario already has assumptions (inflation, return, salary growth), use ScenarioChange to override them:
- new ChangeType: `OVERRIDE_ASSUMPTIONS`
  - parameters: `{ inflation_rate, investment_return_rate, salary_growth_rate, duration_months? }`

### 7.3.3 Stress run service
**Path**
- `backend/apps/stress_tests/services.py`

Functions:
- `run_stress_test(household, key) -> StressTestRunResultDTO`
  - uses `run_decision_template()` from TASK-14 to create scenario
  - compute results:
    - month negative cash flow begins
    - month liquidity falls below 0 or <1
    - min liquidity months
    - min dscr
    - net worth drawdown relative to baseline max
    - count of breached thresholds

### 7.3.4 Optional persistence (recommended)
Model `StressTestRun` (household-owned):
- key
- scenario FK
- computed_at
- results JSON

### 7.3.5 API
Create `backend/apps/stress_tests/views.py`:

- `GET /api/v1/stress-tests/templates/` → list available stress tests
- `POST /api/v1/stress-tests/run/`
  - payload: `{ key }`
  - response: `{ scenario_id, results, redirect_url }`

### 7.3.6 Tests
- run creates scenario and projections
- results compute correctly for known small baseline
- templates list stable

---

## 7.4 Frontend Implementation

### 7.4.1 Routes
- `app/(app)/stress-tests/page.tsx`
- `app/(app)/stress-tests/[scenarioId]/page.tsx` (optional; results can also live in scenario view)

### 7.4.2 UI components
- `components/stress-tests/stress-test-card.tsx`
- `components/stress-tests/stress-test-results.tsx`

Results UI:
- summary cards:
  - “Break month”
  - “Min liquidity”
  - “Worst DSCR”
  - “Max drawdown”
- charts:
  - liquidity months over time
  - net worth over time baseline vs stressed
- list breached thresholds

---

## 7.5 Acceptance criteria (Improvement #7)
- Stress test runs in 1 click.
- Results are interpretable and clearly show resilience.
- Users can immediately create mitigation scenarios using Actions (from TASK-14).

---

# Improvement #8 — Scenario Comparisons that Explain “What Changed and Why”

## 8.1 What this replaces / modifies

### Replaces
- Side-by-side charts without explanation.
- Users cannot tell what caused net worth differences.

### Modifies
- Adds a `ScenarioComparisonService` producing:
  - metric deltas
  - breach analysis
  - **drivers decomposition**
- Adds a comparison page `/scenarios/compare`

---

## 8.2 UX Requirements (Concrete)

### Comparison UI `/scenarios/compare`
User selects:
- baseline (default)
- 1–3 scenarios to compare

UI shows:
1) Metrics grid: end-of-horizon, worst-month, min/max for each scenario
2) Breach heatmap:
   - months on x-axis, scenarios on y-axis
   - colored by severity (good/warn/critical)
3) “Drivers” section:
   - “Net worth +$180k in Scenario B mainly from:
     1) Interest saved: +$72k
     2) Reduced spending: +$54k
     3) Increased contributions: +$32k”
4) “Tradeoffs” section:
   - “Liquidity below 2.0 months for 6 months”
   - “Savings rate dips below target for 4 months”

---

## 8.3 Backend Implementation

### 8.3.1 Comparison service
**Path**
- `backend/apps/scenarios/comparison.py`

Function:
`compare_scenarios(household, scenario_ids: list[str], horizon_months=60) -> ComparisonDTO`

Compute:
- For each scenario:
  - last month values for tier-1 metrics
  - min liquidity months, min dscr, min savings rate
  - months with threshold breaches (count + list)
- For pairs:
  - delta series (scenario - baseline)

### 8.3.2 Drivers decomposition (V1)
Goal: explain net worth difference using simple accounting.

Compute per scenario aggregated totals over horizon:
- total income (net)
- total expenses
- total interest paid
- total debt principal reduction
- total investment contributions
- total investment growth (approx from return rate)
- taxes paid

**Driver attribution**
Net worth delta ≈
- (income_delta - expense_delta) + (interest_saved) + (investment_growth_delta) + (tax_delta)

**Important:** This requires canonical taxonomy and consistent classification (see Improvement #10).

Return:
```json
{
  "drivers": [
    { "label": "Interest saved", "amount": "72000.00" },
    { "label": "Reduced spending", "amount": "54000.00" },
    { "label": "Increased contributions", "amount": "32000.00" }
  ]
}
```

### 8.3.3 API
- `POST /api/v1/scenarios/compare/`
  - payload: `{ scenario_ids: ["baseline_id","scenario_id_1", ...], horizon_months: 60 }`
  - returns ComparisonDTO

---

## 8.4 Frontend Implementation

### 8.4.1 Routes
- `app/(app)/scenarios/compare/page.tsx`
- Query params optional: `?a=baseline&b=scenarioId`

### 8.4.2 Components
- `components/scenarios/comparison/metrics-grid.tsx`
- `components/scenarios/comparison/breach-heatmap.tsx`
- `components/scenarios/comparison/drivers-panel.tsx`
- `components/scenarios/comparison/tradeoffs.tsx`

Heatmap:
- use simple table with Tailwind bg classes; avoid heavy libs.

Drivers panel:
- bar list with amounts and percentages of total delta.

---

## 8.5 Acceptance criteria (Improvement #8)
- User can compare baseline vs scenario and understand why.
- Drivers list is stable and plausible.
- Breaches/tradeoffs are visible.

---

# Improvement #9 — Multi-Horizon Projections (Monthly near-term + Annual long-term)

## 9.1 What this replaces / modifies

### Replaces
- Single 60-month monthly projection, insufficient for retirement horizons.

### Modifies
- ScenarioProjection schema and ScenarioEngine
- Adds UI horizon selector: 5y / 10y / 30y
- Keeps near-term detail monthly while adding long-term annual projections

---

## 9.2 UX Requirements
- Default: 5y monthly
- User can choose:
  - 10y (monthly first 24 months + annual thereafter)
  - 30y (monthly first 24 months + annual thereafter)
- Charts adjust automatically:
  - if annual granularity, show fewer points and clearer trend

---

## 9.3 Backend Implementation

### 9.3.1 Schema changes
Modify `ScenarioProjection`:
- add `granularity` enum: `month`, `year`
- rename `month` field to `period_date` (or add new `period_date`)
- unique constraint: `(scenario, period_date, granularity)`

Migration steps:
1) Add `granularity` default `month`
2) Add `period_date` (copy existing month)
3) Update unique constraint
4) Optionally drop old `month` after update

### 9.3.2 ScenarioEngine changes
Add config:
- `monthly_detail_months = 24`
- `max_years = scenario.projection_years` (new field) OR infer from `projection_months`

Computation:
- Run monthly loop for first N months
- After N months, compute yearly points:
  - roll forward 12 months at a time using same logic but summarized
  - store year-end values
- Persist with granularity

**Important:** Ensure scenario changes with effective dates still apply in long horizon:
- when skipping months, apply changes that occur within that year block at correct time; simplest:
  - still compute all months internally but only persist annual points after month 24
  - acceptable performance for 30y (360 months) is usually ok; keep optimized but simple first.

### 9.3.3 API changes
Scenario detail endpoint should accept:
- `horizon_years` query param
- returns projections for requested horizon
- charts endpoint can request granularity

Example:
`GET /api/v1/scenarios/{id}/projections/?horizon_years=30`

Response includes:
- monthly points (first 24 months)
- annual points thereafter

---

## 9.4 Frontend Implementation

### 9.4.1 Scenario detail UI
Add horizon selector in scenario page:
- dropdown: 5y / 10y / 30y

When user changes horizon:
- refetch projections with horizon_years param
- charts update accordingly

### 9.4.2 Charts
Charts must gracefully handle:
- mixed granularity (monthly+annual)
- use tooltip to show whether a point is month-end or year-end

---

## 9.5 Acceptance criteria (Improvement #9)
- 30-year view works and is performant.
- Monthly near-term remains detailed.
- Annual long-term provides clear retirement planning.

---

# Improvement #10 — Canonical Taxonomy + Category Hygiene (Eliminate Category Chaos)

## 10.1 What this replaces / modifies

### Replaces
- Freeform categories that lead to inconsistent metrics and incorrect drivers.

### Modifies
- Introduces canonical category taxonomy as a first-class concept.
- Adds category mapping rules and a “Fix categories” workflow.
- Updates metrics calculations and drivers decomposition to use canonical groups.

---

## 10.2 UX Requirements

### A) Canonical categories (shipped defaults)
- Income:
  - Salary/Wages
  - Bonus
  - Business Income
  - Investment Income
- Expenses:
  - Housing (essential)
  - Utilities (essential)
  - Food (essential)
  - Transportation (essential)
  - Insurance (essential)
  - Healthcare (essential)
  - Debt Service (debt)
  - Discretionary
  - Savings/Investing (transfer)
- Assets:
  - Liquid Cash
  - Investments
  - Property

Each category has attributes:
- `type`: income/expense/transfer
- `group`: essential/discretionary/debt/savings
- `is_debt_service`: boolean

### B) Category Hygiene page `/categories/fix`
Shows:
- uncategorized flows
- suspicious categories (e.g. “Mortgage” categorized as discretionary)
- bulk apply suggestions
- confidence score per suggestion

---

## 10.3 Backend Implementation

### 10.3.1 New models
Create app `taxonomy`:

**Category**
- `id`
- `key` unique
- `name`
- `kind`: income/expense/transfer/asset
- `group`: essential/discretionary/debt/savings/other
- `is_debt_service` boolean
- `sort_order`
- `is_active`

**CategoryRule**
- `id`
- `pattern` (string)
- `match_type`: contains/regex/prefix
- `category FK`
- `confidence` decimal
- `is_active`
- optional: `applies_to` (income/expense)

### 10.3.2 Migrate existing flows
If recurring flows currently use string `category`:
- Keep existing field but add `category_ref FK Category null=True`
- On save:
  - attempt to map `category` string to canonical category (case-insensitive)
  - if rule matches, set category_ref

### 10.3.3 Category suggestion endpoint
`POST /api/v1/taxonomy/suggest/`
payload: `{ text: "Mortgage payment" }`
returns: `{ category_key: "housing_mortgage", confidence: 0.83 }`

### 10.3.4 Bulk fix endpoint
`POST /api/v1/taxonomy/bulk-assign/`
payload:
```json
{
  "flow_ids": ["..."],
  "category_key": "discretionary"
}
```

### 10.3.5 Update MetricsCalculator and ScenarioEngine classification
Replace string comparisons with canonical grouping:
- DSCR should include only essential + debt service
- Savings rate should use canonical savings transfers
- Drivers decomposition uses totals per group

---

## 10.4 Frontend Implementation

### 10.4.1 Category management UI
- `/settings/categories`:
  - list canonical categories (read-only or admin-only)
  - list rules (optional v1)
- `/categories/fix`:
  - table of flows with missing category_ref
  - suggestions column + apply button
  - bulk apply

### 10.4.2 UX flow
When user creates/edits a recurring flow:
- category picker is canonical (select)
- optional “custom label” field separate from canonical category

---

## 10.5 Acceptance criteria (Improvement #10)
- Metrics and drivers use canonical grouping.
- User can fix uncategorized flows in bulk quickly.
- Category chaos is eliminated without losing flexibility.

---

# 11) Implementation Plan (Agent Execution Checklist)

## Backend order
1) Taxonomy app:
   - models + migrations + seed canonical categories
   - mapping and suggestion rules
   - endpoints
2) Update flows to reference canonical categories.
3) Update metrics and scenario computations to use canonical groups.
4) Add comparison service and endpoint (drivers rely on taxonomy).
5) Add stress test templates and run endpoints.
6) Add multi-horizon projections (schema migration + engine changes).

## Frontend order
1) Categories fix page + canonical picker integration
2) Scenario compare page
3) Stress tests page
4) Scenario horizon selector + charts updates

---

# 12) Definition of Done
- Stress tests run in one click and show breakpoints.
- Scenario comparisons explain “why”.
- 30-year horizon planning works.
- Categories are canonical and metrics are robust.



---

# TASK-15 Addendum (v1.1) — Incorporated Review Feedback (Jan 2026)

This addendum incorporates reviewer feedback into TASK-15. Treat these changes as **required updates** unless explicitly marked optional.

---

## A) Stress test templates must be declarative (no lambdas) + define complete set

### A1) No lambdas / undefined helpers in templates
**Problem:** `compile: lambda ...` cannot be serialized for logging/debugging and referenced `default_start_date()`.

**Update:** Stress tests must declare:
- `template_key`
- `default_inputs` (with tokens like `"next_month"` resolved at runtime)

**Updated structure**
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

**Compilation in service**
```py
def resolve_inputs(default_inputs: dict, household) -> dict:
    out = dict(default_inputs)
    if out.get("start_date") == "next_month":
        out["start_date"] = first_day_of_next_month()
    return out

def compile_stress_test(household, test_key: str):
    tmpl = STRESS_TESTS[test_key]
    inputs = resolve_inputs(tmpl["default_inputs"], household)
    return {
        "template_key": tmpl["template_key"],
        "scenario_name": f"Stress: {tmpl['name']}",
        "inputs": inputs,
    }
```

### A2) Complete Stress Test Template Definitions (V1)
Add the full list (minimum):
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

## B) Specify missing ChangeTypes used by stress tests (engine-level behavior required)

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

**ScenarioEngine handling (V1)**
- Identify debt accounts affected:
  - `applies_to="variable"`: debt accounts flagged as variable-rate (add a boolean on liability details if missing)
  - `applies_to="all"`: all debt accounts
  - `applies_to="specific"`: only `account_ids`
- For each affected debt:
  - `new_rate = base_rate + adjustment_percent/100`
  - Recompute monthly interest accrual and payment schedule if your engine supports amortization.
  - If payment schedule is fixed externally, at minimum increase interest portion and reduce principal reduction accordingly.

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

**ScenarioEngine handling (V1)**
- Apply immediate balance change at `effective_date`:
  - `investment_balance *= (1 + percent_change)`
- **Recovery model**
  - V1 simplest: no recovery (permanent loss)
  - V1.1 recommended: linear recovery over `recovery_months`
    - `recovery_total = abs(drop_amount)`
    - add `recovery_total / recovery_months` per month until recovered
    - cap recovery at baseline trajectory (do not exceed baseline value for that month)

---

## C) Stress test results JSON schema must be defined
Persist and return results with this shape:

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
    {
      "metric": "liquidity_months",
      "threshold": 1.0,
      "first_breach_month": 6,
      "breach_duration_months": 14,
      "worst_value": -1.2
    }
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

## D) StressTestRun model must include baseline + status + key months
If persisting runs, use:

```py
class StressTestRun(models.Model):
    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    test_key = models.CharField(max_length=50)
    scenario = models.ForeignKey("scenarios.Scenario", on_delete=models.CASCADE, related_name="stress_test_runs")
    baseline_scenario = models.ForeignKey("scenarios.Scenario", on_delete=models.SET_NULL, null=True, related_name="stress_test_baselines")
    computed_at = models.DateTimeField(auto_now_add=True)
    results = models.JSONField()
    status = models.CharField(max_length=20, choices=[("passed","Passed"),("warning","Warning"),("failed","Failed")])
    first_breach_month = models.IntegerField(null=True)

    class Meta:
        indexes = [
            models.Index(fields=["household","test_key","computed_at"]),
        ]
```

---

## E) Fix drivers decomposition math (must avoid double-counting)
**Problem:** Prior formula risks double counting interest and ignoring principal/cash mechanics.

### Correct approach (V1)
Compute drivers from **monthly component deltas** and validate:

**Total net worth delta (end)** = `NW_scenario_end - NW_baseline_end`

Compute component deltas per month:
- `income_delta` (net)
- `expense_delta` (non-debt principal; separate interest vs principal if possible)
- `tax_delta`
- `interest_delta` (debt interest portion only)
- `investment_return_delta`
- `asset_value_change_delta` (if applicable)

Aggregate and group into buckets:
- “Higher/Lower income” = Σ income_delta
- “Reduced/Increased spending” = Σ expense_delta (excluding interest + excluding principal transfers if tracked)
- “Interest savings/costs” = Σ interest_delta
- “Tax impact” = Σ tax_delta
- “Investment performance” = Σ investment_return_delta
- “Other asset changes” = Σ asset_value_change_delta

**Validation**
- Ensure Σ(driver_amounts) ≈ net worth delta within 1% (rounding tolerance).
- If it fails, include a final “Unattributed” bucket to reconcile.

> If principal is not tracked separately in the engine today: treat it as a balance-sheet movement and exclude from “spending” drivers.

---

## F) Comparison API constraints (limits + validation)
To control response size and complexity:

- Max 4 scenarios per request (including baseline)
- Max horizon: 360 months (30 years)
- Validate ownership:
  - 404 if any scenario not found or not owned by household
- 400 if:
  - `len(scenario_ids) > 4`
  - `horizon_months > 360`

---

## G) Safe multi-horizon schema migration path (non-breaking)
Renaming `month` is risky. Use a safe staged migration:

### Step 1: Add fields (non-breaking)
- Add `period_date` nullable
- Add `granularity` default `month`

### Step 2: Data migration
- Populate `period_date = month` for all existing records

### Step 3: Make required
- Make `period_date` non-null

### Step 4: Update unique constraint
- Unique: `(scenario, period_date, granularity)`

### Step 5: Deprecate `month` (later release)
- Keep `month` temporarily; remove after all code uses `period_date`.

---

## H) Annual projection computation must be explicit (recommended approach)
Use “full compute, selective persistence”:

```py
def compute_projection(self, monthly_detail_months=24, total_months=360):
    records = []
    for i in range(total_months):
        month_data = self._compute_single_month(i)
        if i < monthly_detail_months:
            records.append({"period_date": month_data.date, "granularity": "month", **month_data.to_dict()})
        elif month_data.date.month == 12:
            records.append({"period_date": month_data.date, "granularity": "year", **month_data.to_dict()})
    return records
```

---

## I) Taxonomy must support household custom categories (system + user scope)
Update `Category` model to support:
- system categories (`household=null`, `is_system=True`)
- user categories (`household=FK`, `is_system=False`)
- optional parent category for hierarchy

Add constraint:
- unique `(household, key)` (system categories are household null)

Update `CategoryRule`:
- household scoped rules + system rules
- priority ordering
- match types expanded (contains/prefix/suffix/regex/exact)
- learning counters (times applied/overridden)

Rule evaluation order:
1) household rules by priority desc
2) system rules by priority desc
3) first match wins

---

## J) Canonical category seed data must be specified
Add `CANONICAL_CATEGORIES` list and seed management command:
- `python manage.py seed_categories`

(Use the seed list from reviewer notes; keep it in `backend/apps/taxonomy/seeds.py`.)

---

## K) Revised implementation order (backend + frontend)
### Backend order (revised)
1) Taxonomy app (models + seed + suggest/bulk-assign)
2) Update flows to reference canonical categories
3) Update metrics/scenario computations to use canonical groups
4) Multi-horizon projections (schema + engine)
5) Comparison service (depends on 1–4)
6) Stress test templates + run service

### Frontend order (revised)
1) Categories fix page + canonical picker integration
2) Horizon selector + charts updates
3) Scenario compare page
4) Stress tests page

---

## L) Expanded test specifications (required)
### Stress tests
- income drop reduces net income correctly
- market drop applies immediate balance reduction
- rate shock increases debt service
- breach detection finds correct first breach month
- results JSON schema matches spec

### Comparisons
- drivers sum ≈ net worth delta within 1%
- 404 for missing/foreign scenarios
- 400 for >4 scenarios or horizon > 360

### Multi-horizon
- 5y: 60 monthly
- 10y: 24 monthly + 8 annual
- 30y: 24 monthly + 28 annual
- annual points at year-end dates
- scenario changes apply correctly in annual portions

### Taxonomy
- seed categories created
- suggest returns match with confidence
- bulk assign updates flows
- DSCR uses debt_service group
- savings rate uses savings group
- custom categories do not overwrite system categories

---
