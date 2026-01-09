# TASK-14 — Actionable Insights + Goal Seek (Reverse Solving) + Taxes Always-On (Improvements #4–#6)

> **Purpose:** This is an AI-agent-ready implementation plan for the next 3 major product upgrades:
>
> 4) **Actionable Insights → Next Best Actions → One-click scenarios**
> 5) **Goal Seek / Reverse Solving (constraints → required change → scenario)**
> 6) **Taxes Always-On + Tax Strategy Switches**
>
> This spec is designed to be executed by an agentic coding model against the existing codebase, and it explicitly calls out:
> - what existing features are being **modified or replaced**
> - new models/services/endpoints/UI routes
> - concrete payload shapes and code skeletons
> - how to reuse ScenarioEngine + projections + insights + templates from TASK-13


---

# TASK-14 Addendum (v1.1) — Incorporated Review Feedback (Jan 2026)

This addendum updates TASK-14 to address reviewer feedback where it improves correctness, consistency, and implementation speed. Treat these changes as **part of the spec**.

## A) Action template `applies_when` must be rule-keyed (no lambdas, no undefined helpers)
**Problem:** examples used inline lambdas and referenced an undefined `goal_target()`.

**Update:**
- `applies_when` must be a **string rule key**.
- Implement a central rule registry and helper `get_goal_target()`.

### Action template shape (updated)
```py
ACTION_TEMPLATES = {
  "increase_liquidity": {
    "name": "Increase liquidity",
    "severity": "critical",
    "applies_when": "liquidity_below_target",
    "inputs_schema": {...},
    "suggest": suggest_increase_liquidity,
    "compile": compile_increase_liquidity,
  }
}
```

### Rule registry (required)
```py
def get_goal_target(goals, goal_type: str, default: float) -> float:
    for g in goals:
        if g["goal_type"] == goal_type:
            return float(g["target_value"])
    return default

APPLIES_WHEN_RULES = {
    "liquidity_below_target": lambda snapshot, goals: (
        snapshot.liquidity_months < get_goal_target(goals, "emergency_fund_months", 6.0)
    ),
    "dscr_below_target": lambda snapshot, goals: (
        snapshot.dscr < get_goal_target(goals, "min_dscr", 1.25)
    ),
}
```

## B) Explicit action → decision template mapping table (remove ambiguity)
Action templates must compile to a **single default** decision template (no branching in V1). If you want branching, do it in `suggest()` by returning multiple candidate actions.

| Action Template | Default Decision Template | Primary ChangeType(s) |
|---|---|---|
| increase_liquidity | adjust_total_expenses | ADJUST_TOTAL_EXPENSES |
| improve_dscr | payoff_debt | PAYOFF_DEBT |
| increase_savings_rate | modify_401k | MODIFY_401K |
| build_emergency_fund | set_savings_transfer | SET_SAVINGS_TRANSFER |

> If you still want “increase_liquidity” to also offer “add_income”, implement **two separate actions**:
> - `increase_liquidity_reduce_expenses`
> - `increase_liquidity_increase_income`

## C) New ChangeTypes must have concrete parameter schemas + ScenarioEngine handling
Do not add ChangeTypes without explicit schemas and implementation guidance.

### ChangeType: `ADJUST_TOTAL_EXPENSES`
**Parameters**
```json
{
  "monthly_adjustment": "-600.00",
  "category": "adjustment",
  "description": "Expense reduction target"
}
```

**ScenarioEngine handling**
- Add a synthetic recurring expense flow for the monthly adjustment.
- It should affect:
  - total monthly expenses
  - monthly surplus
  - liquidity months (via surplus/cash)
- It should NOT be split into existing categories unless you explicitly choose to.

### ChangeType: `ADJUST_TOTAL_INCOME`
**Parameters**
```json
{
  "monthly_adjustment": "400.00",
  "description": "Income increase target",
  "tax_treatment": "w2"
}
```

**ScenarioEngine handling**
- Add synthetic income (net-of-tax using existing tax pipeline).
- Update monthly surplus and liquidity accordingly.

### ChangeType: `SET_SAVINGS_TRANSFER`
**Parameters**
```json
{
  "amount": "500.00",
  "source_account_id": "uuid",
  "target_account_id": "uuid",
  "frequency": "monthly"
}
```

**ScenarioEngine handling**
- Decrease source (cash) balance by `amount`.
- Increase target (investment) balance by `amount`.
- **Net worth unchanged**, but **liquidity months may decrease** because cash is reduced.
- Represent this as an internal transfer; do not treat as an expense.

### ChangeType: `OVERRIDE_ASSUMPTIONS` (optional but recommended)
**Parameters**
```json
{
  "inflation_rate": "0.035",
  "investment_return_rate": "0.05",
  "salary_growth_rate": "0.02",
  "duration_months": 24
}
```
**Handling**
- Overrides scenario assumption values for specified duration.

## D) Goal Seek section must be complete and solver API must be unambiguous
### Choose one in-memory projection method signature (required)
Implement:
```py
def compute_projection_to_memory(
    self,
    months: int = 60,
    changes: list = None,
) -> list:
    """Compute projections without persisting to DB. Used by solver + previews."""
```

Rules:
- `changes` may be unsaved ScenarioChange-like objects.
- Method must not write ScenarioProjection rows.
- It must minimize DB reads:
  - load base accounts/flows once
  - avoid per-iteration DB queries

### Solver performance requirements (V1)
- Single solve request should complete in **<10 seconds** for typical households.
- Limit solver horizon to **24 months** by default.
- Binary search strategy:
  - coarse: 5 iterations
  - fine: 5 iterations
  - max 10 iterations per variable
- Do not compute 60-month projections during solve unless user explicitly requests it.

## E) GoalSolution model refinement
`GoalSolution` does NOT need a household FK (derive from goal.household). Add `applied_scenario` pointer.

```py
class GoalSolution(models.Model):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name="solutions")
    options = models.JSONField()
    plan = models.JSONField()
    success = models.BooleanField()
    computed_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)
    applied_scenario = models.ForeignKey(
        "scenarios.Scenario", null=True, on_delete=models.SET_NULL, related_name="goal_solutions"
    )
```

## F) Standardize API response shapes for scenario-creating endpoints
The following endpoints MUST return the same shape:
- `POST /api/v1/actions/apply/`
- `POST /api/v1/goals/{id}/apply-solution/`
- `POST /api/v1/scenarios/decision-builder/`

**Standard response**
```json
{
  "scenario": { "id": "uuid", "name": "...", "created_at": "..." },
  "changes": [ ... ],
  "summary": {
    "baseline": { ... },
    "scenario": { ... },
    "goal_status": { "baseline": [ ... ], "scenario": [ ... ] },
    "takeaways": [ ... ]
  },
  "redirect_url": "/scenarios/{id}"
}
```

## G) Error handling contract (required)
### Actions errors
- 404: action key not found
- 400: invalid inputs
- 422: action not applicable (conditions not met)

Example 422:
```json
{ "error": "not_applicable", "message": "Liquidity already meets target" }
```

### Solver errors
- 404: goal not found
- 400: invalid bounds/options
- 422 unsolvable:
```json
{
  "error": "unsolvable",
  "message": "Cannot achieve goal within specified bounds",
  "best_attempt": { "plan": {...}, "result": {...} }
}
```

### Tax errors
- 400: invalid income source
- 422: incompatible employment type switch

## H) Tax prerequisites checklist (add before implementing tax strategy changes)
Before implementing new tax strategy ChangeTypes, verify existence of:
- household `TaxConfig` (filing_status, state, additional_withholding, etc.)
- `TaxService` methods:
  - federal + state + FICA
  - self-employment tax handling (1099)

**Self-employment handling (V1)**
- SE tax ≈ 15.3% on 92.35% of net SE income
- Half SE tax deductible for income tax
- Track quarterly estimates as cash outflows if enabled

## I) Action dismissal persistence (optional V1.1)
If you implement dismissal:
- Model: `DismissedAction(household, action_key, dismissed_at, expires_at)`
- Auto-expire after 30 days
- `get_action_candidates()` filters out active dismissals

Otherwise: remove dismiss endpoint entirely (preferred for V1).

## J) Frontend types (required)
Add types to `frontend/lib/types.ts`:
- `ActionCandidate`
- `GoalSolverOptions`
- `GoalSolutionDTO`

(See suggested interfaces in reviewer notes.)

## K) Expanded tests (backend)
Add tests for:
- actions list empty when all goals met
- apply action invalid inputs → 400
- apply action not applicable → 422
- solver does not create DB rows during iteration
- solver completes <10 seconds (use small horizon + iteration caps)
- apply solution links scenario to GoalSolution.applied_scenario
- tax summary endpoint uses scenario projections when scenario_id provided

---

---

## 0) Pre-Req: TASK-13 must be completed first

TASK-14 assumes the following exist:
- Goals app + `/api/v1/goals/status/`
- Data quality endpoint `/api/v1/metrics/data-quality/`
- Decision Builder + `/api/v1/scenarios/decision-templates/`
- `/api/v1/scenarios/decision-builder/` creates scenario + changes + projections + summary

**Key dependency:** We will reuse the decision template compilation logic and ScenarioChange application pathways.

---

# Improvement #4 — Make Insights Useful: Next Best Actions + “Apply as Scenario” (One Click)

## 4.1 What this replaces / modifies

### Replaces
- Passive Insights list: “you have low liquidity” (descriptive only).
- User must manually figure out:
  - what action to take
  - how big the change must be
  - how to model it in scenarios

### Modifies
- Metrics insights generation and/or dashboard right sidebar
- Adds a new **Actions** layer that:
  - converts insights into **actionable interventions**
  - can be applied with one click to create a scenario (via Decision Builder)

**Important:** This is where Effluent becomes a decision platform.

---

## 4.2 UX Requirements (Concrete)

### A) On Dashboard Sidebar (or dedicated /actions page)
Show “Next best actions” cards *above* the Insights list.

Each action card includes:
- Title: “Increase liquidity”
- Why: “Liquidity is 2.4 months (target 6.0)”
- Suggested move: “Reduce expenses by $600/mo or increase income by $900/mo”
- Primary button: **Model this**
- Secondary: “Dismiss” (optional)

Clicking **Model this**:
- opens a small modal collecting one required input (e.g. amount/month)
- then POST to action apply endpoint which creates a scenario
- redirect to decision-builder result view or scenario page with summary

### B) Action Modal Patterns
- Minimal friction: 1–3 fields max
- Defaults:
  - start_date = first of next month
  - amount = suggested amount
- After “Apply”, show toast: “Scenario created: Improve liquidity” and redirect.

---

## 4.3 Backend Implementation (Action System)

### 4.3.1 Add `actions` module (no DB config needed for V1)
Create:
- `backend/apps/actions/` (recommended)
or `backend/apps/metrics/actions.py` (acceptable but less clean)

#### V1 approach: code-defined Action Templates
Similar to decision templates in TASK-13:
- Define a small set of action templates keyed by insight type.

**Path**
- `backend/apps/actions/action_templates.py`

**Action template spec**
```py
ACTION_TEMPLATES = {
  "increase_liquidity": {
    "name": "Increase liquidity",
    "applies_when": lambda snapshot, goals: snapshot.liquidity_months < goal_target("emergency_fund_months"),
    "inputs_schema": {...},
    "suggest": fn(household, snapshot, goals) -> SuggestedInputsDTO,
    "compile": fn(household, inputs) -> DecisionBuilderRequestDTO
  },
  ...
}
```

**Return shape for list endpoint**
```json
[
  {
    "key": "increase_liquidity",
    "title": "Increase liquidity",
    "severity": "critical",
    "why": "Liquidity is 2.4 months (target 6.0).",
    "suggested_inputs": { "reduce_expenses_monthly": "600.00" },
    "inputs_schema": {
      "fields": [
        { "key": "reduce_expenses_monthly", "type": "currency", "label": "Reduce expenses per month", "required": true }
      ]
    }
  }
]
```

---

### 4.3.2 Action generation service
**Path**
- `backend/apps/actions/services.py`

Functions:
- `get_action_candidates(household) -> list[ActionCandidateDTO]`
  - loads latest MetricSnapshot (or forces recalculation if none)
  - loads goals + goal status
  - evaluates which templates apply
  - attaches suggested inputs + why text + severity
  - sorts by severity and impact

- `apply_action(household, action_key, inputs) -> Scenario`
  - action compile returns a DecisionBuilder request
  - call internal “decision builder” compile function to create scenario + changes + projection
  - return scenario

**Important design choice**
- Do NOT duplicate scenario creation logic.
- Reuse the same internal function used by `/api/v1/scenarios/decision-builder/`.

Refactor TASK-13 decision builder endpoint to call a shared function:
- `backend/apps/scenarios/decision_builder.py`
  - `run_decision_template(household, template_key, scenario_name, inputs) -> result_payload`

Then:
- actions call `run_decision_template(...)` with the appropriate template_key and inputs.

---

### 4.3.3 V1 action templates (minimum set)
Implement at least:
1) `increase_liquidity`
   - suggests reducing expenses or adding income
   - compiles to decision template: `add_expense` negative? (better: `modify_expense_total` template) OR simply `add_income` template
   - For V1: model as `ADD_INCOME` with amount/month OR `ADD_EXPENSE` with negative amount/month
   - **Preferred:** Add a new ChangeType: `MODIFY_TOTAL_EXPENSES` (see below)
2) `improve_dscr`
   - suggests debt payoff extra monthly or refinance
   - compiles to decision template: `payoff_debt` or `refinance`
3) `increase_savings_rate`
   - suggests reducing discretionary spending OR increasing 401k (depending on user preference)
4) `build_emergency_fund`
   - suggests creating a monthly transfer into cash/investment (ChangeType: `SET_SAVINGS_TRANSFER`)

---

### 4.3.4 Add new ChangeTypes to support “clean action modeling” (recommended)
Your current ChangeTypes cover many, but “reduce expenses by $X/mo” is not clean unless you create an artificial negative recurring flow.

Add ChangeTypes:
- `ADJUST_TOTAL_EXPENSES` (a scalar adjustment to monthly expenses across time)
- `ADJUST_TOTAL_INCOME` (scalar)
- `SET_SAVINGS_TRANSFER` (moves surplus into a target account; affects liquidity vs investment)

**Implementation inside ScenarioEngine**
When applying:
- `ADJUST_TOTAL_EXPENSES`: add a synthetic recurring flow category “Adjustment” with amount
- `ADJUST_TOTAL_INCOME`: add a synthetic income source flow
- `SET_SAVINGS_TRANSFER`: add a transfer from cash to investment accounts (affects asset composition but not net worth)

This makes actions and goal seek far easier and avoids messy per-category edits.

---

### 4.3.5 API endpoints

Create `backend/apps/actions/views.py`:

- `GET /api/v1/actions/next/`
  - returns top actions

- `POST /api/v1/actions/apply/`
  - payload: `{ action_key: string, inputs: object }`
  - returns:
    - created scenario id
    - redirect url
    - summary (baseline vs scenario) identical to decision builder response

Optional:
- `POST /api/v1/actions/dismiss/`
  - store dismissed action keys per household (persist later)

---

### 4.3.6 Tests (backend)
- actions list returns relevant actions based on snapshot
- apply action creates scenario + changes + projections
- action uses shared decision builder engine

---

## 4.4 Frontend Implementation

### 4.4.1 API client
**Path**
- `frontend/lib/api.ts`
Add:
```ts
export const actions = {
  next: () => api.get('/api/v1/actions/next/'),
  apply: (data: any) => api.post('/api/v1/actions/apply/', data),
};
```

Types:
- `ActionCandidate`

### 4.4.2 Dashboard Integration
Modify dashboard sidebar:
- Replace placeholder ActionPanel from TASK-13 with real actions list:
  - `useQuery(['actions','next'], actions.next)`
- Render each action as a Card with:
  - title, why, suggestion
  - Model button

### 4.4.3 Action Apply Modal
Component:
- `components/actions/action-apply-dialog.tsx`
- Accepts `ActionCandidate`
- Renders inputs_schema fields
- On submit: POST apply → redirect to scenario

---

## 4.5 Acceptance criteria (Improvement #4)
- Dashboard shows 1–3 recommended actions when metrics are unhealthy.
- User can apply an action with 1 click + minimal inputs.
- Action creates a scenario and returns to a clear result view.

---

# Improvement #5 — Goal Seek / Reverse Solving (Constraints → Required Change)

## 5.1 What this replaces / modifies

### Replaces
- Users manually guessing “how much do I need to save” and building trial scenarios.

### Modifies
- Adds a **Goal Solve Wizard**
- Adds a solver engine that generates a plan (ScenarioChange bundle) to satisfy constraints.

This feature makes Effluent feel like:
> “Tell me your target. I’ll figure out the required changes.”

---

## 5.2 UX Requirements

### A) Goals page gains a “Solve” button
On `/settings/goals`, each goal row has:
- `Solve` button → opens Goal Solve modal:
  - Choose “interventions” allowed:
    - Reduce expenses
    - Increase income
    - Payoff debt
    - Refinance
    - Increase retirement contributions
  - Choose “max pain” constraints:
    - Max expense reduction allowed
    - Max income increase assumed
    - Max extra debt payment
  - then “Solve”

### B) Solver output screen
Shows:
- Did we find a solution? (Yes/No)
- Recommended plan (changes)
- Predicted metric outcomes
- Tradeoffs (e.g. reduces discretionary spending)
Buttons:
- “Apply as scenario”
- “Refine inputs”
- “View assumptions”

---

## 5.3 Backend Implementation

### 5.3.1 Add `goal_seek` module
**Path**
- `backend/apps/goals/goal_seek.py`

Core function:
`solve_goal(household, goal_id, options) -> GoalSolutionDTO`

Input options:
```json
{
  "allowed_interventions": ["reduce_expenses", "increase_income", "payoff_debt"],
  "bounds": {
    "max_reduce_expenses_monthly": "1200.00",
    "max_increase_income_monthly": "1500.00",
    "max_extra_debt_payment_monthly": "800.00"
  },
  "start_date": "2026-02-01",
  "projection_months": 60
}
```

Output:
```json
{
  "success": true,
  "plan": [
    { "change_type": "ADJUST_TOTAL_EXPENSES", "parameters": { "amount": "-650.00" } },
    { "change_type": "ADJUST_TOTAL_INCOME", "parameters": { "amount": "400.00" } }
  ],
  "result": {
    "goal": { ... },
    "baseline_value": "2.40",
    "final_value": "6.10",
    "worst_month_value": "5.95"
  },
  "scenario_preview": {
    "net_worth_end": "...",
    "liquidity_min": "...",
    "dscr_min": "..."
  }
}
```

---

### 5.3.2 Solver strategy (V1)
Implement a pragmatic approach:
- Support solving for:
  - liquidity months
  - DSCR
  - savings rate

**Approach**
- Reduce to one key variable where possible:
  - liquidity months goal ≈ requires higher cash balance relative to expenses
  - easiest intervention is: increase monthly surplus OR reduce expenses
- For V1, implement a **binary search** on:
  - expense adjustment amount (negative means reduce)
  - income adjustment amount
- Evaluate objective by running a “temporary scenario projection” using ScenarioEngine.

**IMPORTANT PERFORMANCE REQUIREMENT**
Do not persist every trial scenario to DB.
Create in-memory Scenario + changes and run a compute method that returns projections without saving.
Options:
1) Add `ScenarioEngine.compute_projection_to_memory(months=...)` returning list[ProjectionDTO] without DB writes
2) Or add `ScenarioEngine.compute_projection_to_memory()` separate method

**Do NOT modify persisted baseline during solver.**

**Stop conditions**
- success if all months meet goal constraint (or worst-month meets)
- fail if required adjustment exceeds bounds
- max iterations: 20 per variable

**Intervention order**
Try simplest first:
1) expense reduction only
2) income increase only
3) combined expense+income (split)
Later add debt payoff/refinance interventions.

---

### 5.3.3 Add GoalSolution persistence (optional but recommended)
Model:
- `GoalSolution`
  - goal FK
  - household FK
  - options JSON
  - plan JSON
  - success bool
  - computed_at
  - error text

This gives reproducibility and UX of “last solution”.

---

### 5.3.4 API endpoints

In `backend/apps/goals/views.py`:

- `POST /api/v1/goals/{id}/solve/`
  - payload: options
  - response: GoalSolutionDTO

- `POST /api/v1/goals/{id}/apply-solution/`
  - payload: `{ plan, scenario_name? }`
  - creates a scenario with these changes (using shared decision builder infrastructure)
  - returns scenario + summary

---

### 5.3.5 Tests (backend)
- solver returns success for solvable liquidity goal with bounds
- solver returns failure when bounds too tight
- apply solution creates scenario + projections

---

## 5.4 Frontend Implementation

### 5.4.1 Goals settings page enhancement
`/settings/goals`
- add “Solve” button per goal
- add solve modal:
  - allowed interventions checkboxes
  - bounds inputs
  - start date
  - run solve

### 5.4.2 Solver results UI
Display:
- plan steps in a list
- computed outcomes vs baseline
- apply scenario button

### 5.4.3 API client
Add to `frontend/lib/api.ts`:
```ts
export const goals = {
  ...,
  solve: (id: string, options: any) => api.post(`/api/v1/goals/${id}/solve/`, options),
  applySolution: (id: string, data: any) => api.post(`/api/v1/goals/${id}/apply-solution/`, data),
};
```

---

## 5.5 Acceptance criteria (Improvement #5)
- User can pick a goal and get a computed plan in <10 seconds.
- Solution is explainable and can be applied to create a scenario.
- Solver avoids DB bloat and runs in-memory.

---

# Improvement #6 — Taxes Always-On + Strategy Switches

## 6.1 What this replaces / modifies

### Replaces
- Tax modeling that exists but is not always integrated or user-friendly.
- Users seeing gross income in some places and net in others.

### Modifies
- ScenarioEngine should always produce **net cash flow**.
- Decision templates and actions should incorporate tax impacts automatically.
- Adds tax strategy templates (e.g. withholding changes).

---

## 6.2 UX Requirements

### Everywhere:
- Display income as **net** by default with “show gross” toggle.
- Dashboard surplus and projections are net-of-tax.

### Tax Strategy Panel (on dashboard or settings)
- simple summary:
  - “Effective tax rate”
  - “Estimated annual tax”
  - “Withholding coverage”
- buttons:
  - “Adjust withholding”
  - “Model 1099”
  - “Increase pretax deductions”

Each button opens Decision Builder template preselected.

---

## 6.3 Backend Implementation

### 6.3.1 Ensure ScenarioEngine uses TaxService for all income calculations
Audit ScenarioEngine:
- When computing monthly cash flow:
  - salary/bonus/other income must be run through TaxService to compute net
- Ensure deduction changes (401k/HSA) affect taxable income.

If ScenarioEngine already nets salary using IncomeSource + withholding/deductions, confirm:
- Scenario changes like `MODIFY_401K` propagate into tax computations
- Scenario changes like `ADD_INCOME` include a tax-treatment parameter (W2 vs 1099)

---

### 6.3.2 Add new scenario change types for tax strategies
Add ChangeTypes:
- `MODIFY_WITHHOLDING`
- `MODIFY_DEDUCTIONS`
- `SWITCH_EMPLOYMENT_TYPE` (W2 ↔ self_employed)
- `SET_QUARTERLY_ESTIMATES`

Add to ScenarioEngine change application:
- These update the tax config used during projection.

---

### 6.3.3 Add Tax Strategy decision templates (extends TASK-13 decision templates)
Implement templates in `decision_templates.py`:
1) `adjust_withholding`
   - inputs: income_source_id, extra_withholding_monthly
   - compiles to `MODIFY_WITHHOLDING`
2) `increase_pretax_deductions`
   - inputs: income_source_id, 401k_percent and/or hsa_monthly
   - compiles to `MODIFY_401K` and/or `MODIFY_HSA`
3) `switch_to_1099`
   - inputs: income_source_id, self_employment_tax_rate, business_expenses_monthly
   - compiles to `SWITCH_EMPLOYMENT_TYPE`

---

### 6.3.4 Add Tax summary endpoint
Create:
- `GET /api/v1/taxes/summary/`
  - query: `scenario_id` optional
  - returns:
    - effective tax rate
    - monthly tax estimate
    - withholding vs liability
    - top deductions

This endpoint will be used by dashboard panel.

---

### 6.3.5 Tests (backend)
- Adding income changes net surplus appropriately
- Modify 401k reduces taxable income and increases net surplus
- Adjust withholding changes take-home but not liability estimate
- Switch to 1099 changes tax model correctly (basic)

---

## 6.4 Frontend Implementation

### 6.4.1 Tax summary panel
Component:
- `components/dashboard/tax-summary-card.tsx`
- fetches `/api/v1/taxes/summary/`
- shows:
  - “Estimated monthly tax”
  - “Effective rate”
  - “Withholding coverage”
- buttons:
  - “Adjust withholding” → decision builder with template preselected
  - “Increase 401k” → decision builder preselected

### 6.4.2 Decision builder templates list update
Add new tax templates into template cards under category “Tax”.

---

## 6.5 Acceptance criteria (Improvement #6)
- All cash flow and surplus values are net-of-tax.
- Tax strategy templates exist and are usable via decision builder.
- Dashboard includes a tax panel that feels integrated and actionable.

---

# 7) Implementation Plan (Agent Execution Checklist)

## Backend execution order
1) Refactor decision builder logic into shared `run_decision_template()` function.
2) Implement Actions system:
   - templates + list/apply endpoints
   - new change types (recommended)
3) Implement Goal Seek solver:
   - in-memory projections support
   - solve/apply endpoints
4) Integrate taxes always-on:
   - audit ScenarioEngine income netting
   - add tax change types + templates
   - tax summary endpoint

## Frontend execution order
1) Add actions panel + apply modal on dashboard.
2) Enhance goals settings page with solver UI + results + apply scenario.
3) Add tax summary card and tax decision entrypoints.

---

# 8) Definition of Done
- The dashboard offers **recommended actions** and can model them immediately.
- Users can set a goal and click **Solve**, then apply the solution as a scenario.
- Taxes are integrated everywhere, and tax strategies can be modeled via decision templates.



---

# TASK-14 Addendum (v1.2) — Branching Actions, Overlay Adjustments, and “Adopt Scenario as Baseline” (Jan 2026)

This addendum incorporates new product decisions from review:
1) **Branching is allowed in V1** (multiple levers per problem).
2) `ADJUST_TOTAL_EXPENSES/INCOME` should be implemented as an **engine overlay**, not as persisted synthetic recurring flows.
3) Users must be able to **apply (“adopt”) a scenario’s changes to reality**, so the scenario can become their new baseline trajectory via actual data updates.

Treat these as **required updates** to TASK-14.

---

## A) Branching in V1: represent as multiple action candidates (preferred)

Instead of a single action key that conditionally compiles to different templates, the actions endpoint should return **multiple action candidates** that all address the same underlying issue (liquidity, dscr, savings rate), each with a distinct lever.

### Example: liquidity below target
`GET /api/v1/actions/next/` returns:
```json
[
  {
    "key": "liquidity_reduce_expenses",
    "title": "Increase liquidity by reducing expenses",
    "severity": "critical",
    "why": "Liquidity is 2.4 months (target 6.0).",
    "template_key": "adjust_total_expenses",
    "suggested_inputs": { "monthly_adjustment": "-600.00", "start_date": "2026-02-01" },
    "inputs_schema": { "fields": [ { "key": "monthly_adjustment", "type": "currency", "required": true }, { "key": "start_date", "type": "date", "required": true } ] }
  },
  {
    "key": "liquidity_increase_income",
    "title": "Increase liquidity by increasing income",
    "severity": "critical",
    "why": "Liquidity is 2.4 months (target 6.0).",
    "template_key": "adjust_total_income",
    "suggested_inputs": { "monthly_adjustment": "900.00", "start_date": "2026-02-01", "tax_treatment": "w2" },
    "inputs_schema": { "fields": [ { "key": "monthly_adjustment", "type": "currency", "required": true }, { "key": "start_date", "type": "date", "required": true }, { "key": "tax_treatment", "type": "select", "required": false, "options": [ { "value": "w2", "label": "W-2" }, { "value": "1099", "label": "1099" } ] } ] }
  },
  {
    "key": "liquidity_pause_401k",
    "title": "Increase liquidity by reducing retirement contributions",
    "severity": "warning",
    "why": "Liquidity is 2.4 months (target 6.0).",
    "template_key": "modify_401k",
    "suggested_inputs": { "contribution_percent": "0.00", "start_date": "2026-02-01" },
    "inputs_schema": { "fields": [ { "key": "income_source_id", "type": "select", "required": true }, { "key": "contribution_percent", "type": "percent", "required": true }, { "key": "start_date", "type": "date", "required": true } ] }
  }
]
```

### Implementation note
- The actions service should return **N candidates** per failing metric/goal (typically 2–3).
- Each candidate should map to exactly **one** decision template and one change plan.
- This keeps UI simple, while enabling branching at the product level.

---

## B) Overlay adjustments (do NOT persist synthetic RecurringFlows)

### Problem
Earlier guidance suggested adding synthetic recurring flows to represent global expense/income adjustments. This is confusing, bleeds into user data, and complicates “adopt scenario” behavior.

### Update
Implement these changes as **ScenarioEngine overlay variables** derived from ScenarioChange records.

#### ChangeType: `ADJUST_TOTAL_EXPENSES`
**Parameters**
```json
{
  "monthly_adjustment": "-600.00",
  "description": "Expense reduction target"
}
```

**Engine behavior**
- During projection initialization, compute:
  - `expense_adjustment = sum(monthly_adjustment for active ADJUST_TOTAL_EXPENSES changes)`
- Each month:
  - `total_expenses = base_total_expenses + expense_adjustment`
- This affects monthly surplus, liquidity months, etc.
- It does not create or persist any RecurringFlow rows.

#### ChangeType: `ADJUST_TOTAL_INCOME`
**Parameters**
```json
{
  "monthly_adjustment": "900.00",
  "description": "Income increase target",
  "tax_treatment": "w2"
}
```

**Engine behavior**
- `income_adjustment = sum(...)`
- `total_income = base_total_income + income_adjustment_net_of_tax`
- Net-of-tax computation must go through the existing TaxService pipeline.
- No persisted IncomeSource rows are created.

---

## C) Adopt Scenario: apply scenario changes to reality (so scenario becomes new baseline)

### Why this matters
Users will model a decision, then want to “make it real” — i.e., update the underlying flows/accounts/tax settings so Baseline updates accordingly.

### New endpoint
`POST /api/v1/scenarios/{scenario_id}/adopt/`

#### Payload
```json
{
  "apply_changes": true,
  "change_ids": ["uuid1", "uuid2"],
  "effective_date": "2026-02-01",
  "allocation": {
    "expense_adjustment_category_key": "discretionary",
    "income_adjustment_name": "Income adjustment"
  }
}
```

#### Response (standard)
Same response shape as decision-builder/actions/apply:
```json
{
  "baseline_scenario": { "id": "uuid", "name": "Baseline", "last_projected_at": "..." },
  "applied": { "changes_count": 2 },
  "redirect_url": "/dashboard"
}
```

### Adoption mapping rules (V1)
For each ScenarioChange type:
- `ADD_EXPENSE` → create a new RecurringFlow expense (household-owned), active from effective_date
- `ADD_INCOME` → create a new IncomeSource *or* a recurring income flow (choose one and standardize)
- `MODIFY_401K` / `MODIFY_HSA` / `MODIFY_WITHHOLDING` → update existing IncomeSource / tax config
- `PAYOFF_DEBT` → update the debt account’s balance snapshot (record a new snapshot) OR mark liability detail as paid off (if model supports)
- `REFINANCE` → update liability details (rate/term) and optionally create a one-time closing cost expense flow
- `ADJUST_TOTAL_EXPENSES` (overlay) → requires allocation to reality:
  - V1 option: create a RecurringFlow called “Budget reduction” in a chosen category (default discretionary)
- `ADJUST_TOTAL_INCOME` (overlay) → create a RecurringFlow income called “Income increase” or update an IncomeSource

### Baseline refresh integration
After applying changes:
- emit the same “reality change event” used in baseline refresh pipeline (TASK-12)
- refresh baseline projections
- return to dashboard

---

## D) Frontend UX: “Apply this decision to my plan”
Add a prominent button on scenario results page (Decision Builder outcome UI):
- **Apply to my plan**
- Opens modal listing scenario changes with toggles:
  - user selects which changes to apply
  - overlay adjustments require category/name allocation (simple selects)
- Submit calls `/scenarios/{id}/adopt/`
- Redirect to dashboard with toast “Baseline updated”

---

## E) Spec changes to earlier sections (clarifications)
1) The action mapping table in v1.1 becomes **default mapping** only. Branching is via multiple candidates.
2) ChangeType implementation text must state **overlay** behavior.
3) Solver plans may include overlay change types; adoption flow must handle converting overlays into real flows if user adopts.

---
