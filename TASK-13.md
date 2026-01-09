# TASK-13 — Baseline Goals Dashboard + Data Confidence + Decision Builder (Improvements #1–#3)

> **Purpose:** This is an AI-agent-ready implementation plan for the first 3 major product upgrades:
>
> 1) **North Star Dashboard (Goals-aware, decision-ready)**
> 2) **Data Completeness / Modeling Confidence**
> 3) **Decision Builder (Scenario Wizard)**
>
> This spec is written to be executed by an agentic coding model (Codex / Claude Code) against the existing codebase.
>
> **IMPORTANT:** This task is intentionally explicit about:
> - What existing features/pages are being **modified or replaced**
> - The **exact new models/services/endpoints/components**
> - How to reuse existing **ScenarioEngine**, projections, metrics, and UI patterns
> - Suggested code skeletons + concrete JSON shapes
>
> **Primary Outcome:** The app feels like a **financial decision cockpit**, not a passive metrics page.

---

## 0) Existing System Inventory (What we’re building on)

### Backend building blocks (already exist)
- **Scenario model** (includes `is_baseline`, `start_date`, assumptions, etc.)
- **ScenarioChange model** (typed changes with JSON parameters)
- **ScenarioProjection model** (monthly projection records; unique per scenario+month)
- **ScenarioEngine.compute_projection()** persists projections and drives month-by-month logic
- **RecurringFlow.is_active_on(date)** exists (needed for “as-of” initialization)
- **Metrics**: tier-1 metrics exist (net worth, surplus, liquidity months, dscr, savings rate)
- **Insights**: thresholds and insight generation exist

### Frontend building blocks (already exist)
- Next.js + Tailwind layout patterns
- Dashboard UI spec (TASK-08) with existing sections:
  - metric cards, net worth chart, accounts list, insights panel, etc.
- shadcn-like component usage patterns: `Card`, `Dialog`, `Badge`, `Tabs`, `Form`
- React Query usage for data fetching

### What these improvements change at a high level
- Dashboard becomes **goal-aware** and **actionable**
- Platform gains **data confidence** and self-auditing
- Scenario creation becomes a **guided decision wizard**
- Users model decisions in <2 minutes and immediately see “baseline vs scenario” impact

---

# Improvement #1 — North Star Dashboard (Goal-aware + Status + Next Moves)

## 1.1 What this replaces / modifies

### Replaces
- A purely descriptive dashboard experience (metrics + charts + insights list)
- Users currently see numbers but aren’t told:
  - whether they’re on track
  - what “good” means for them
  - what to do next

### Modifies
- `app/(app)/dashboard/page.tsx` layout & data fetching
- Metric cards component -> becomes **NorthStarCards**
- Adds new **ActionPanel** and **Goals Settings** page

---

## 1.2 UX Requirements (Concrete)

### Dashboard page layout (final)
**Top: Dashboard Header**
- Headline: short “status sentence” based on goals, e.g.
  - “Emergency fund: ⚠️ low • Cash flow: ✅ healthy • Debt risk: ⚠️”
- Buttons:
  - `Edit goals` → `/settings/goals`
  - `Model a decision` → `/scenarios/new/decision-builder`

**Row: North Star Cards** (max 5–6)
- Net Worth
- Monthly Surplus
- Liquidity Months
- DSCR
- Savings Rate (optional if room; recommended)
Each card shows:
- Big value
- Target (from goals or default thresholds)
- Status badge: `Good / Warning / Critical`
- Delta to target (e.g. “-3.6 mo”)
- Tiny sparkline (last 12 months)

**Right sidebar:**
1) Model Confidence Card (Improvement #2)
2) Action Panel (Next best actions; placeholder here, full in later tasks)
3) Insights Panel (existing; remains)

**Main area:**
- Net worth chart (existing)
- Accounts list (existing)
- Baseline projection preview (12 months) (optional; if already available)

---

## 1.3 Backend Implementation (Goals)

### 1.3.1 Create `goals` app

**Path**
- `backend/apps/goals/`

**Models**
`Goal` (household-owned)
- `household: FK`
- `goal_type: CharField(choices=GoalType)`
- `target_value: DecimalField(max_digits=12, decimal_places=2)`
- `target_date: DateField(null=True, blank=True)` (for time-bound goals only)
- `is_primary: BooleanField(default=False)`
- `is_active: BooleanField(default=True)`
- `created_at`, `updated_at`

**GoalType enum**
- `emergency_fund_months` (liquidity months target)
- `min_dscr`
- `min_savings_rate`
- `net_worth_target_by_date`
- `retirement_age` (placeholder; later needs long-horizon model)

**Constraints**
- One primary goal per household (optional initial enforcement):
  - `UniqueConstraint(fields=["household"], condition=Q(is_primary=True), name="unique_primary_goal_per_household")`

**Admin**
- Register Goal for quick internal testing.

---

### 1.3.2 Add goal evaluation service

**Path**
- `backend/apps/goals/services.py`

**Function**
`evaluate_goals(household, as_of_date=None, scenario_id=None) -> list[GoalStatusDTO]`

**Rules**
- If `scenario_id` provided:
  - Use latest ScenarioProjection month (or compute min/worst month depending on goal)
- Else baseline:
  - Use latest MetricSnapshot + insights thresholds
- Convert goal → current_value → status

**Return DTO shape**
```json
[
  {
    "goal_id": "uuid",
    "goal_type": "emergency_fund_months",
    "target_value": "6.00",
    "current_value": "2.40",
    "status": "critical",
    "delta_to_target": "-3.60",
    "recommendation": "Increase liquidity by $18,200 or increase surplus by $910/mo"
  }
]
```

**Implementation details**
- Liquidity goal uses metric `liquidity_months`
- DSCR goal uses metric `dscr`
- Savings rate goal uses metric `savings_rate`
- Net worth target uses `net_worth_market` at target date (scenario) or latest (baseline)

---

### 1.3.3 API Endpoints

**Paths**
- `backend/apps/goals/views.py`
- `backend/apps/goals/urls.py`

**Endpoints**
- `GET /api/v1/goals/` → list active goals
- `POST /api/v1/goals/` → create goal
- `PATCH /api/v1/goals/{id}/` → update goal
- `DELETE /api/v1/goals/{id}/` → soft delete (set inactive)
- `GET /api/v1/goals/status/`
  - optional query: `scenario_id`
  - returns evaluated status list

**Auth**
- Household scoping must match existing patterns.

---

### 1.3.4 Tests (backend)
- Create goal; list returns it
- Goal status evaluates correctly for baseline snapshot
- Goal status evaluates for scenario projections
- Primary goal uniqueness enforced (if implemented)

---

## 1.4 Frontend Implementation (Dashboard + Goals UI)

### 1.4.1 API client
**Path**
- `frontend/lib/api.ts`
Add:
```ts
export const goals = {
  list: () => api.get('/api/v1/goals/'),
  create: (data: any) => api.post('/api/v1/goals/', data),
  update: (id: string, data: any) => api.patch(`/api/v1/goals/${id}/`, data),
  remove: (id: string) => api.delete(`/api/v1/goals/${id}/`),
  status: (scenarioId?: string) =>
    api.get(`/api/v1/goals/status/${scenarioId ? `?scenario_id=${scenarioId}` : ''}`),
};
```

**Types**
- `frontend/lib/types.ts`
  - `Goal`
  - `GoalStatus`

---

### 1.4.2 Dashboard modifications
**Path**
- `app/(app)/dashboard/page.tsx`

Add queries:
- goals status
- data quality (Improvement #2)
- baseline scenario (optional; see Improvement #3 later)

New layout structure:
```tsx
<div className="space-y-6">
  <DashboardHeader goalStatus={goalStatus} />

  <NorthStarCards metrics={metricsData} goalStatus={goalStatus} />

  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <div className="xl:col-span-2 space-y-6">
      <NetWorthChart history={history?.results || []} />
      <AccountsList accounts={accountsData?.results || []} />
    </div>

    <div className="space-y-6">
      <ModelConfidenceCard report={dataQuality} />
      <ActionPanel metrics={metricsData} goalStatus={goalStatus} />
      <InsightsPanel insights={insightsData?.results || []} />
    </div>
  </div>
</div>
```

---

### 1.4.3 New components
**Paths**
- `components/dashboard/dashboard-header.tsx`
- `components/dashboard/north-star-cards.tsx`
- `components/dashboard/action-panel.tsx`
- (ModelConfidenceCard in Improvement #2)

**DashboardHeader behavior**
- Builds a short sentence from goal statuses.
- Buttons:
  - `/settings/goals`
  - `/scenarios/new/decision-builder`

**NorthStarCards**
- Uses Tier 1 metrics from existing metrics endpoint.
- For each card:
  - shows current metric value
  - target value (from goal if exists, else default threshold)
  - status badge
  - delta-to-target
  - sparkline: request history endpoint for each metric (lazy load or batch)

**ActionPanel**
- Placeholder: show 2–3 heuristic actions derived from worst goal status.
- Example:
  - Liquidity critical → “Model expense reduction”
  - DSCR low → “Model debt payoff”
- These buttons navigate to Decision Builder with template preselected (Improvement #3).

---

### 1.4.4 Goals settings page
**Path**
- `app/(app)/settings/goals/page.tsx`
- Table of goals + add/edit dialog.
- shadcn `Dialog` + `Form` + `Select`

---

## 1.5 Acceptance criteria (Improvement #1)
- Goals CRUD works.
- Dashboard is goal-aware.
- North Star cards show statuses + targets.
- “Model a decision” entrypoint is visible and primary.

---

# Improvement #2 — Data Completeness / Modeling Confidence

## 2.1 What this replaces / modifies

### Replaces
- The silent failure mode where metrics exist but are low-confidence due to missing inputs.

### Modifies
- Adds a new `data-quality` report endpoint.
- Adds a dashboard “Confidence” panel and missing checklist with CTAs.

---

## 2.2 UX Requirements

### On dashboard sidebar
**Model Confidence Card**
- Shows:
  - Confidence Level: High/Medium/Low
  - Progress bar (0–100%)
- Lists “Missing / Recommended” items:
  - “Add income sources”
  - “Add recurring expenses”
  - “Update account balances”
- Each item has a CTA button that routes to the right page
  - onboarding steps or direct management pages

Empty state:
- If confidence high and missing list empty: “Model confidence is high ✅”

---

## 2.3 Backend Implementation

### 2.3.1 Add DataQualityReport generator
**Path**
- `backend/apps/metrics/data_quality.py`

Function:
`build_data_quality_report(household) -> dict`

Return shape:
```json
{
  "confidence_level": "medium",
  "confidence_score": 0.72,
  "missing": [
    {
      "key": "income_sources",
      "severity": "critical",
      "title": "No income sources",
      "description": "Add at least one income source so forecasts can compute taxes and cash flow accurately.",
      "cta": { "label": "Add income", "route": "/onboarding?step=income" }
    }
  ],
  "warnings": [
    {
      "key": "stale_balances",
      "severity": "warning",
      "title": "Account balances are stale",
      "description": "Your latest account snapshot is 52 days old.",
      "cta": { "label": "Update balances", "route": "/accounts" }
    }
  ]
}
```

### 2.3.2 Minimum rule set (start here)
Rules should inspect:
- Accounts existence
- Latest snapshot existence per account (ScenarioEngine uses latest snapshot values for balances)
- Income sources existence
- Recurring expenses existence
- Recurring debt payments if liabilities exist
- Snapshot recency thresholds (e.g., 30 days)

**Scoring**
- Start at 1.0
- Deduct weighted penalties:
  - missing income: -0.35
  - missing expenses: -0.25
  - missing liquid assets: -0.25
  - stale balances: -0.15
- Clamp 0..1

**Confidence level mapping**
- `>= 0.85` high
- `>= 0.60` medium
- else low

### 2.3.3 API endpoint
Add to `backend/apps/metrics/views.py`:
- `GET /api/v1/metrics/data-quality/`
- Response is the report dict

### 2.3.4 Tests (backend)
- Household with no income returns missing income critical
- Household with stale snapshots returns stale warning
- Score maps to correct confidence level

---

## 2.4 Frontend Implementation

### 2.4.1 API client
**Path**
- `frontend/lib/api.ts`
Add:
```ts
export const metrics = {
  ...,
  dataQuality: () => api.get('/api/v1/metrics/data-quality/'),
};
```

### 2.4.2 ModelConfidenceCard component
**Path**
- `components/dashboard/model-confidence-card.tsx`

UI:
- title + progress bar
- list missing and warning items
- CTA button per item

Add to dashboard sidebar above ActionPanel.

---

## 2.5 Acceptance criteria (Improvement #2)
- Dashboard always shows a confidence card.
- Missing checklist is accurate and routes correctly.
- Users understand what’s missing and can fix it.

---

# Improvement #3 — Decision Builder (Scenario Wizard + Scenario Generation)

## 3.1 What this replaces / modifies

### Replaces
- Expert-driven scenario creation (“create scenario → add changes manually → run projection”)

### Modifies
- Adds a new wizard flow that generates Scenario + ScenarioChanges automatically.
- Keeps the existing scenario detail UI (Task 11) as the “advanced view”.

**Important philosophy**
- Decision Builder is the default.
- Manual ScenarioChange editing is advanced.

---

## 3.2 UX Requirements (Concrete)

### Entry points
- Dashboard ActionPanel: `Model a decision`
- Global nav: `New → Decision`

### Wizard route
- `/scenarios/new/decision-builder`

### Step flow
**Step 1: Choose decision**
- Cards:
  - Pay off debt faster
  - Increase retirement contributions
  - Refinance a loan
  - One-time expense shock
  - Add recurring expense
  - Add recurring income

**Step 2: Inputs**
- Template-specific small form
- Prefer selects + currency input + date
- Inputs should default to scenario start month (first of current month)

**Step 3: Review**
- Summary of inputs
- Shows which accounts/flows will be affected
- “Create scenario” button

**Step 4: Results**
- Shows baseline vs scenario:
  - North star deltas
  - goal status deltas
- Key takeaways (2–3 bullet points)
- Charts: net worth (baseline vs scenario)
- Buttons:
  - “View scenario detail”
  - “Compare scenarios”
  - “Make another decision”

---

## 3.3 Backend Implementation

### 3.3.1 Minimal viable template system (no DB model yet)
Create:
- `backend/apps/scenarios/decision_templates.py`

Define:
```py
DECISION_TEMPLATES = {
  "payoff_debt": {...},
  "modify_401k": {...},
  "refinance": {...},
  "lump_sum_expense": {...},
  "add_expense": {...},
  "add_income": {...},
}
```

Each template contains:
- `key`, `name`, `description`
- `inputs_schema`: fields and validation rules
- `compile(inputs, household, base_scenario) -> (Scenario, list[ScenarioChange])`

**Why no DB model yet?**
- Faster and safer for V1.
- You can migrate to DB templates later (TASK-13+).

---

### 3.3.2 Decision Builder API endpoints

Add to `backend/apps/scenarios/views.py` (or new `decision_views.py`):

#### `GET /api/v1/scenarios/decision-templates/`
Returns:
```json
[
  { "key": "payoff_debt", "name": "Pay off debt faster", "description": "...", "inputs_schema": {...} },
  ...
]
```

#### `POST /api/v1/scenarios/decision-builder/`
Payload:
```json
{
  "template_key": "payoff_debt",
  "scenario_name": "Pay off credit card faster",
  "inputs": {
    "debt_account_id": "uuid",
    "extra_monthly": "300.00",
    "start_date": "2026-02-01"
  }
}
```

Response:
```json
{
  "scenario": { ... },
  "changes": [ ... ],
  "summary": {
    "baseline": { "net_worth": "...", "liquidity_months": "...", "dscr": "...", ... },
    "scenario": { "net_worth": "...", "liquidity_months": "...", "dscr": "...", ... },
    "goal_status": {
      "baseline": [ ... ],
      "scenario": [ ... ]
    },
    "takeaways": [
      "Debt-free 14 months sooner",
      "Net worth +$22,400 by month 60"
    ]
  }
}
```

---

### 3.3.3 Implement template compilation using existing ChangeTypes
Use existing ScenarioChange types from `ScenarioChange.ChangeType`.

**Template: payoff_debt**
- Requires: `debt_account_id`, `extra_monthly`, `start_date`
- Creates change:
  - `change_type = PAYOFF_DEBT`
  - `source_account_id = debt_account_id`
  - `effective_date = start_date`
  - `parameters = { "extra_monthly": Decimal(extra_monthly) }`
ScenarioEngine already applies extra monthly payment by adding expense and reducing principal.

**Template: modify_401k**
- Requires: `income_source_id`, `new_contribution_percent`, `start_date`
- `change_type = MODIFY_401K`
- parameters: `{ "contribution_percent": ... }`

**Template: refinance**
- Requires: `debt_account_id`, `new_rate`, `new_term_months`, `start_date`, `closing_costs`
- `change_type = REFINANCE`
- parameters: `{ "new_rate": ..., "new_term_months": ..., "closing_costs": ... }`

**Template: lump_sum_expense**
- Requires: `amount`, `date`, `category`
- `change_type = LUMP_SUM_EXPENSE`
- parameters: `{ "amount": ..., "category": ... }`

**Template: add_income**
- `change_type = ADD_INCOME`

**Template: add_expense**
- `change_type = ADD_EXPENSE`

---

### 3.3.4 Scenario creation + projection steps
Inside `POST /decision-builder/`:
1) Identify base scenario:
   - baseline scenario (existing `Scenario.is_baseline=True`) or create if not exists
2) Create new scenario:
   - `parent_scenario = baseline`
   - `start_date = input.start_date or baseline.start_date`
3) Create ScenarioChange records
4) Run `ScenarioEngine(scenario).compute_projection()`
5) Compute summary:
   - last projection month for baseline and scenario
   - compute goal status using goals service
6) Return payload

---

### 3.3.5 Tests (backend)
- GET templates returns correct list
- POST decision-builder creates scenario + changes + projections
- Projections exist and are unique
- Summary structure correct

---

## 3.4 Frontend Implementation

### 3.4.1 New route
- `app/(app)/scenarios/new/decision-builder/page.tsx`

### 3.4.2 Fetch templates
Use React Query:
- `GET /api/v1/scenarios/decision-templates/`

### 3.4.3 Wizard state machine
State:
- `selectedTemplateKey`
- `inputs`
- `stepIndex`
- `result` (after submit)

### 3.4.4 Inputs rendering
For V1:
- hardcode forms per template (fastest)
- still use `inputs_schema` for labels and validation hints

Later:
- render schema-driven forms automatically

### 3.4.5 Submit + results
- POST to `/api/v1/scenarios/decision-builder/`
- Render:
  - baseline vs scenario metric comparison grid
  - goal impact (good/warn/critical)
  - 1–3 bullet takeaways
  - charts (baseline vs scenario)

### 3.4.6 Navigation
Buttons:
- View scenario: `/scenarios/{id}`
- Compare: `/scenarios/compare?left=baseline&right={id}` (to be implemented later)
- Start another decision: resets wizard

---

## 3.5 Acceptance criteria (Improvement #3)
- A user can create a modeled decision scenario in <2 minutes.
- The default experience is guided (wizard).
- Scenarios produced work with the existing scenario detail UI.
- Results page clearly answers “Should I do this?”

---

# 4) Implementation Plan (Agent Execution Checklist)

## 4.1 Backend changes (in order)
1) Create `goals` app:
   - models, migrations, admin
   - CRUD endpoints
   - goal evaluation service
2) Implement metrics data-quality report:
   - report builder
   - endpoint
   - tests
3) Implement decision templates system:
   - template registry
   - GET templates endpoint
   - POST decision-builder endpoint
   - integration with ScenarioEngine + projections
   - summary + takeaways generation
   - tests

## 4.2 Frontend changes (in order)
1) Add goals API + types
2) Add goals settings page
3) Update dashboard:
   - new header
   - new north star cards
   - confidence card
   - action panel
4) Add decision builder page:
   - templates list
   - input forms
   - results panel

---

# 5) Concrete File/Folder Changes (Recommended)

## Backend
- `backend/apps/goals/__init__.py`
- `backend/apps/goals/models.py`
- `backend/apps/goals/services.py`
- `backend/apps/goals/serializers.py`
- `backend/apps/goals/views.py`
- `backend/apps/goals/urls.py`
- `backend/apps/goals/admin.py`
- `backend/apps/metrics/data_quality.py`
- `backend/apps/metrics/views.py` (add endpoint)
- `backend/apps/scenarios/decision_templates.py`
- `backend/apps/scenarios/views.py` (add endpoints)
- tests:
  - `backend/apps/goals/tests/`
  - `backend/apps/metrics/tests/`
  - `backend/apps/scenarios/tests/`

## Frontend
- `frontend/lib/api.ts` (add goals + dataQuality + decision endpoints)
- `frontend/lib/types.ts` (Goal, GoalStatus, DataQualityReport, DecisionTemplate, DecisionBuilderResult)
- `app/(app)/dashboard/page.tsx` (modify)
- `components/dashboard/dashboard-header.tsx` (new)
- `components/dashboard/north-star-cards.tsx` (new)
- `components/dashboard/model-confidence-card.tsx` (new)
- `components/dashboard/action-panel.tsx` (new)
- `app/(app)/settings/goals/page.tsx` (new)
- `app/(app)/scenarios/new/decision-builder/page.tsx` (new)

---

# 6) Notes / Guardrails for the Agent

- **Do not rewrite ScenarioEngine math** in this task. Only build orchestration and UX.
- **Persist projections** using existing `compute_projection()` (no in-memory-only results).
- Prefer incremental PRs:
  1) goals + status
  2) data quality
  3) decision builder
  4) dashboard wiring

---

## 7) Definition of Done
- Dashboard feels like a cockpit:
  - goal-aware status
  - north star cards
  - confidence score
  - decision entrypoint
- Decision Builder creates scenarios reliably and immediately shows baseline vs scenario deltas.
- Data quality makes the model trustworthy and self-auditing.

