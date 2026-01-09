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
    "applies_when": /* condition evaluator in registry */: snapshot.liquidity_months < goal_target("emergency_fund_months"),
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
1) Add `ScenarioEngine.compute_projection(in_memory=True)` returning list[ProjectionDTO] without DB writes
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

## 4.3.4 ChangeType Parameter Schemas (required)

**ADJUST_TOTAL_INCOME / ADJUST_TOTAL_EXPENSES**
```json
{
  "amount": "500.00",
  "mode": "absolute",  // "absolute" | "percent"
  "start_date": "2026-02-01",
  "end_date": null,
  "description": "Adjustment"
}
```

Percent mode rules:
- `amount = "0.25"` means +25%
- `amount = "-0.10"` means -10%
Applied to the baseline total at projection time (month-level).



