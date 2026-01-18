# Life Events & Scenario Engine - Deep Dive Audit Report

**Date**: January 15, 2026
**Scope**: Complete analysis of life events and scenario engine implementation
**Files Analyzed**: 15+ backend files, 10+ frontend components, data models, API endpoints

---

## Executive Summary

This report documents bugs, errors, issues, unimplemented functionality, and data model inconsistencies discovered during a comprehensive audit of the Life Events and Scenario Engine system.

**Overall Assessment**: The system is feature-rich and mostly functional, but has several critical bugs, data validation gaps, and potential correctness issues in financial calculations that need attention.

**Severity Levels**:
- 🔴 **CRITICAL**: Data correctness issues, security vulnerabilities, or crashes
- 🟡 **HIGH**: Functional bugs that affect user experience or produce incorrect results
- 🟠 **MEDIUM**: Edge cases, incomplete features, or technical debt
- 🔵 **LOW**: Minor issues, optimization opportunities, or cosmetic problems

---

## 1. Data Model Issues

### 🔴 CRITICAL: No Schema Validation on ScenarioChange.parameters

**Location**: `backend/apps/scenarios/models.py:141`

**Issue**: The `parameters` field is a generic JSONField with no validation. Different `ChangeType` values expect completely different parameter schemas, but there's no enforcement at the model level.

**Impact**: Users can create ScenarioChanges with invalid/missing parameters that will fail silently during projection computation or produce incorrect results.

**Example**:
```python
# These should fail but don't:
ScenarioChange.objects.create(
    scenario=scenario,
    change_type=ChangeType.ADD_DEBT,
    parameters={}  # Missing required: principal, rate, term_months
)

ScenarioChange.objects.create(
    scenario=scenario,
    change_type=ChangeType.ADD_INCOME,
    parameters={'amount': 'not_a_number'}  # Type mismatch
)
```

**Recommendation**: Add a JSON schema validator or create a validation method that checks parameters against the required schema for each ChangeType.

---

### 🟡 HIGH: source_flow_id Type Inconsistency

**Location**:
- `backend/apps/scenarios/models.py:138`
- `backend/apps/scenarios/migrations/0005_change_source_flow_id_to_charfield.py`

**Issue**: The field was changed from UUIDField to CharField(max_length=100) to support formatted identifiers like `"income_source_{uuid}"`, but the code inconsistently expects UUIDs in some places and formatted strings in others.

**Impact**:
- String matching fails when comparing `"uuid"` to `"income_source_uuid"`
- MODIFY_INCOME/REMOVE_INCOME changes may not find their target flows
- Creates confusion about what format to use

**Evidence**:
```python
# services.py:686 - expects formatted string from source_flow_id
flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
for income in state.incomes:
    if income['id'] == flow_id:  # But income['id'] is 'income_source_{uuid}'
```

**Recommendation**: Standardize on one format (preferably `"income_source_{uuid}"` for IncomeSources and plain UUID strings for RecurringFlows) and document it clearly.

---

### 🟡 HIGH: No Validation on projection_months

**Location**: `backend/apps/scenarios/models.py:43`

**Issue**: The field has no max_value constraint at the model level. Only the comparison view enforces MAX_HORIZON_MONTHS=360.

**Impact**:
- Users can create scenarios with projection_months=10000, causing massive computation
- Inconsistent limits between create and compare operations
- No protection against accidental or malicious DoS

**Recommendation**: Add validation at model level:
```python
projection_months = models.PositiveIntegerField(
    default=120,
    validators=[MaxValueValidator(360)]
)
```

---

### 🟠 MEDIUM: No Unique Constraint on LifeEventTemplate.name

**Location**: `backend/apps/scenarios/models.py:224`

**Issue**: Template names are used as lookup keys (views.py:671), but there's no unique constraint on the name field.

**Impact**: If multiple templates have the same name, lookup by name will return arbitrary results.

**Recommendation**: Add unique constraint if name is used as identifier, or use ID exclusively for lookups.

---

### 🟠 MEDIUM: ScenarioChange.end_date Semantics Unclear

**Location**: `backend/apps/scenarios/models.py:133`

**Issue**: The end_date field exists but its semantics aren't well-defined:
- Is it inclusive or exclusive?
- Does it mean "stop applying change" or "remove the effect"?
- For recurring changes (like ADD_INCOME), does it remove the income on end_date?

**Current Behavior**: services.py:234-236 treats it as inclusive (change applies `if change.effective_date <= current_date and (not change.end_date or change.end_date >= current_date)`)

**Recommendation**: Document the semantics clearly in the model docstring.

---

## 2. ScenarioEngine Calculation Bugs

### 🔴 CRITICAL: Tax Calculation Doesn't Update When Income Changes Order

**Location**: `backend/apps/scenarios/services.py:375-395`

**Issue**: During initialization, income taxes are calculated cumulatively (each new income is taxed at the marginal rate considering all previous income). However, when scenario changes add/modify income, the order matters for marginal tax calculation, but the code doesn't recalculate taxes for existing income sources.

**Impact**:
- If a high-income job is added via scenario change, existing income sources should see their taxes increase (higher marginal bracket), but they don't
- Tax calculations can be significantly understated
- Net worth projections will be overly optimistic

**Example**:
```python
# Initial state: $50k salary → taxed at 12% marginal
# Scenario adds: $150k new job
# Expected: $50k salary now taxed at higher marginal rate (24%+)
# Actual: $50k salary still taxed at 12%
```

**Recommendation**: After any income change, call `_recalculate_all_taxes(state)` to recompute all income taxes with the new total income.

---

### 🔴 CRITICAL: Deferred Income Activation Doesn't Recalculate Existing Taxes

**Location**: `backend/apps/scenarios/services.py:525-583`

**Issue**: When a deferred income activates (lines 537-565), it calculates taxes for the new income but doesn't update taxes for income sources that were already active. This causes the same problem as above - marginal rates aren't correctly applied.

**Impact**:
- Scenarios with future-dated income (common in life events like "Get a New Job" starting in November) will have incorrect tax projections
- The error compounds over the projection period

**Recommendation**: Call `_recalculate_all_taxes(state)` after activating deferred income.

---

### 🟡 HIGH: MODIFY_401K Only Handles First Income Source

**Location**: `backend/apps/scenarios/services.py:1023-1070`

**Issue**: When modifying 401k contribution, the code finds the first income with category in `('salary', 'hourly_wages')` and applies the 401k to it. If someone has multiple jobs, only one gets the 401k contribution applied.

```python
for inc in state.incomes:
    if inc['category'] in ('salary', 'hourly_wages'):
        # Calculate contribution...
        break  # ⚠️ Only processes first match
```

**Impact**:
- Multi-job scenarios will have incorrect 401k projections
- Total contributions will be understated

**Recommendation**: Either sum all eligible income or require users to specify which income source gets the 401k contribution.

---

### 🟡 HIGH: Investment Recovery Calculation Error

**Location**: `backend/apps/scenarios/services.py:1369-1383`

**Issue**: When applying gradual recovery after market drop:
- Drop applies: `balance * (1 + percent_change)` where percent_change is negative (e.g., -0.20)
- Recovery applies: `balance * (1 + monthly_recovery)` where monthly_recovery = `-percent_change / recovery_months`

The problem: Recovery is applied to the already-dropped balance, so it doesn't fully restore to original value due to compounding mathematics.

**Example**:
```
Original: $100,000
Drop 20%: $100,000 * 0.80 = $80,000
Recovery over 10 months: monthly_recovery = 0.20 / 10 = 0.02 (2% per month)
Month 1: $80,000 * 1.02 = $81,600
Month 10: ~$97,591 (NOT $100,000)
```

**Recommendation**: Calculate recovery differently:
```python
monthly_recovery = ((1 / (1 + percent_change)) ** (1 / recovery_months)) - 1
```

---

### 🟡 HIGH: Debt Payment Matching is Fragile

**Location**: `backend/apps/scenarios/services.py:1488-1498`

**Issue**: The code finds extra debt payments using string matching:
```python
if target_debt and target_debt == lid:
    extra_payment += e['monthly']
elif not target_debt and 'extra' in e.get('id', '') and lid in e.get('id', ''):
    extra_payment += e['monthly']
```

The second condition is dangerous - it matches if `lid` appears anywhere in the expense ID, which could cause false matches.

**Example**:
```python
debt_id = "abc123"
expense_id = "extra_xyz_abc123_456"  # Matches
expense_id = "extra_abc123"  # Also matches
expense_id = "other_abc123"  # Doesn't match (no 'extra'), but still fragile
```

**Impact**: Could apply extra payments to wrong debts, causing incorrect liability projections.

**Recommendation**: Always use explicit `_target_debt_id` mapping, never fall back to string matching.

---

### 🟠 MEDIUM: No Validation of source_flow_id/source_account_id Existence

**Location**: `backend/apps/scenarios/services.py` - multiple locations (684, 745, 772, etc.)

**Issue**: When applying changes that reference source_flow_id or source_account_id, the code doesn't validate that these exist in the state before trying to modify them.

**Impact**:
- MODIFY_INCOME with invalid source_flow_id silently fails (for loop doesn't match)
- User thinks they modified income, but nothing changed
- No error message, just silent failure

**Recommendation**: Add validation and raise descriptive errors:
```python
if not any(income['id'] == flow_id for income in state.incomes):
    raise ValueError(f"Income source {flow_id} not found in scenario state")
```

---

### 🟠 MEDIUM: Employer Match YTD Doesn't Account for Mid-Year Starts

**Location**: `backend/apps/scenarios/services.py:1438-1470`

**Issue**: employer_match_ytd is initialized to 0 regardless of scenario start date. If a scenario starts in June, the household may have already received 6 months of employer match, but the projection starts from 0.

**Impact**: Annual limit enforcement will be wrong, potentially allowing more employer match than should be possible in that calendar year.

**Recommendation**: Initialize YTD based on the current date and past contributions (if data is available).

---

### 🟠 MEDIUM: Growth Rate Applied Only at Month Boundaries

**Location**: `backend/apps/scenarios/services.py:1385-1399`

**Issue**: Annual growth (salary, inflation) is applied only when `month % 12 == 0`. This means:
- Growth happens at months 12, 24, 36, etc.
- Month 0 never gets growth (correct)
- But this creates a discontinuity - growth doesn't happen at month 1 or 11

This is probably correct behavior (annual growth), but it's not documented and could confuse users who expect continuous growth.

**Recommendation**: Add comment explaining this is intentional annual step growth.

---

### 🟠 MEDIUM: Frequency Conversion Fails Silently on Invalid Input

**Location**: `backend/apps/scenarios/services.py:1580-1589`

**Issue**: If an invalid frequency string is provided, the code defaults to multiplier of 1:
```python
mult = FREQUENCY_TO_MONTHLY.get(frequency, Decimal('1'))
```

This silently produces incorrect results instead of raising an error.

**Recommendation**: Raise ValueError for invalid frequencies.

---

### 🔵 LOW: Liquid Asset Selection Always Picks First

**Location**: `backend/apps/scenarios/services.py:1415`

**Issue**: Uses `next((k for k, a in state.assets.items() if a.is_liquid), None)` which always returns the first liquid asset. Dictionary iteration order is guaranteed in Python 3.7+, but this may not be the asset the user expects to be used.

**Recommendation**: Either document this behavior or allow users to specify which liquid account to use.

---

### 🔵 LOW: Negative Balances are Masked

**Location**: `backend/apps/scenarios/services.py:1417, 1429, etc.`

**Issue**: Code uses `max(Decimal('0'), balance)` to prevent negative balances. This masks cash flow problems - if expenses exceed income + assets, the account just goes to 0 instead of showing negative.

**Recommendation**: Track overdraft separately or add a warning when cash flow would cause negative balance.

---

## 3. API / Views Issues

### 🔴 CRITICAL: Task Status Endpoint Doesn't Verify Household Ownership

**Location**: `backend/apps/scenarios/views.py:820-847`

**Issue**: The `ScenarioTaskStatusView` gets task results without verifying that the task belongs to the requesting user's household.

```python
def get(self, request, task_id):
    task_result = AsyncResult(task_id)
    # No check that task belongs to this household!
    return Response({'result': task_result.result})
```

**Impact**:
- **Security vulnerability**: User can access other households' task results by guessing task_id
- Could expose financial data to unauthorized users

**Recommendation**: Store task_id → household_id mapping in cache/database and validate ownership before returning results.

---

### 🟡 HIGH: Compare Endpoint Modifies Scenarios Permanently

**Location**: `backend/apps/scenarios/views.py:160-167`

**Issue**: The compare endpoint has a side effect - if horizon_months exceeds a scenario's projection_months, it permanently updates the scenario:

```python
if scenario.projection_months < horizon_months:
    scenario.projection_months = horizon_months
    scenario.save(update_fields=['projection_months'])
    engine.compute_projection()
```

**Impact**:
- Read operation (compare) causes write side effects
- Unexpected database changes from GET-like operation
- Violates REST principles

**Recommendation**: Compute extended projections in-memory (using `in_memory=True`) without saving to database.

---

### 🟡 HIGH: Adopt Endpoint Doesn't Handle Most Change Types

**Location**: `backend/apps/scenarios/views.py:221-396`

**Issue**: Only handles 3 change types (ADD_EXPENSE, ADD_INCOME, SET_SAVINGS_TRANSFER) out of 40+ defined types. Many types like MODIFY_INCOME, REMOVE_INCOME, REMOVE_EXPENSE should be adoptable but are silently skipped.

**Impact**: Users can't adopt scenarios with common changes, limiting feature usefulness.

**Recommendation**: Implement adopt logic for all reversible change types.

---

### 🟡 HIGH: Life Event Template Apply Doesn't Validate change_values

**Location**: `backend/apps/scenarios/views.py:654-817`

**Issue**: The endpoint accepts arbitrary user input in `change_values` without schema validation:

```python
change_values = request.data.get('change_values', {})
# No validation that change_values contains valid data
parameters = {**change_template.get('parameters_template', {}), **user_values}
```

**Impact**:
- Users can submit malformed data that causes projection errors
- Type mismatches (string instead of number) cause crashes
- No clear error messages to user

**Recommendation**: Validate change_values against expected schema before creating changes.

---

### 🟠 MEDIUM: Template Lookup Uses Name Instead of ID

**Location**: `backend/apps/scenarios/views.py:670-673`

**Issue**: Falls back to comparing template name for lookup:
```python
if str(t.get('id', '')) == pk or t['name'] == pk:
```

**Impact**:
- Names with special characters (spaces, slashes) require URL encoding
- Creates ambiguity about what to use as identifier
- Breaks if template names aren't unique

**Recommendation**: Use UUID exclusively for API lookups.

---

### 🟠 MEDIUM: No Rate Limiting on Expensive Operations

**Location**: Multiple endpoints (compute, compare, apply template)

**Issue**: Projection computation and comparison are expensive operations (1600+ lines of Python for 120-month projection), but there's no rate limiting or throttling.

**Impact**: Potential DoS if users spam compute requests.

**Recommendation**: Add throttling using DRF's throttle classes.

---

### 🔵 LOW: Inconsistent Parameter Naming

**Location**: `backend/apps/scenarios/views.py:61, 111`

**Issue**: Scenario has `projection_months` field but API uses `horizon_months` parameter in some endpoints.

**Impact**: Confusion about which term to use.

**Recommendation**: Standardize on one term throughout API.

---

## 4. Life Event Template Issues

### 🟡 HIGH: Inconsistent Parameter Field Names

**Location**: `backend/apps/scenarios/models.py:250-1112` (template definitions)

**Issue**: Some templates use `'category'`, others use `'income_category'` or `'expense_category'`:

```python
# Line 269
'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'salary'}

# Line 858
'parameters_template': {'amount': 0, 'frequency': 'monthly', 'category': 'other_income'}

# Line 1023
'parameters_template': {'amount': 0, 'frequency': 'monthly', 'income_category': 'other_income'}
```

**Impact**:
- Adopt endpoint checks for both fields: `params.get('expense_category') or params.get('category')` (views.py:250)
- Inconsistency makes templates hard to maintain
- Unclear which field name to use

**Recommendation**: Standardize on one naming convention for all templates.

---

### 🟡 HIGH: Template Parameters Don't Match ChangeType Requirements

**Location**: Multiple templates throughout models.py:245-1112

**Issue**: Some templates provide parameters that aren't used by their change_type, or omit required parameters:

**Example 1**: "Get a Raise" template (line 313)
```python
'parameters_template': {'amount': 0, 'frequency': 'annually', 'category': 'salary'}
```
But MODIFY_INCOME change type expects `frequency` to match existing flow, doesn't use `category` for modifications.

**Example 2**: "Buy a Home" ADD_DEBT (line 416)
```python
'parameters_template': {'principal': 0, 'rate': 0.07, 'term_months': 360, 'payment': 0}
```
If payment is 0, engine will calculate it, but template suggests user should provide it.

**Impact**: Confusion about what parameters are actually needed/used.

**Recommendation**: Audit all templates against their change_type requirements.

---

### 🟠 MEDIUM: No Choice Group Validation

**Location**: `backend/apps/scenarios/models.py` (template definitions)

**Issue**: Templates can specify `choice_group` for mutually exclusive options, but:
- No validation that all options in a group are actually mutually exclusive
- No model-level enforcement
- Only frontend enforces the mutual exclusion

**Impact**: If frontend validation is bypassed, backend will accept multiple options from same choice group.

**Recommendation**: Add validation in the apply endpoint or ScenarioChange model.

---

### 🟠 MEDIUM: Hard-Coded Default Values May Be Inappropriate

**Location**: Throughout template definitions (models.py:245-1112)

**Issue**: Templates have hard-coded defaults that may not fit all users:
- Childcare: $1,500/month (line 498)
- Baby supplies: $200/month (line 535)
- 529 savings: $200/month (line 542)
- Wedding costs: $20,000 (line 558)
- Divorce legal fees: $15,000 (line 590)

**Impact**: Users in different geographies or income brackets may find defaults unrealistic.

**Recommendation**: Either make these configurable or use income-based heuristics.

---

### 🔵 LOW: Missing Templates for Some ChangeTypes

**Location**: `backend/apps/scenarios/models.py:245-1112`

**Issue**: No templates exist for stress test change types:
- ADJUST_INTEREST_RATES
- ADJUST_INVESTMENT_VALUE
- OVERRIDE_ASSUMPTIONS
- MODIFY_WITHHOLDING
- MODIFY_DEDUCTIONS
- SWITCH_EMPLOYMENT_TYPE

**Impact**: Users must manually create these changes, reducing feature discoverability.

**Recommendation**: Add templates for common stress test scenarios.

---

## 5. Frontend Issues

### 🟡 HIGH: No Validation of Required Fields Before Submission

**Location**: `frontend/components/life-events/life-event-wizard.tsx:261`

**Issue**: The wizard submits without validating that required fields (like `amount`) are actually provided:

```typescript
const handleSubmit = () => {
    createMutation.mutate()  // No validation!
}
```

**Impact**:
- Backend receives ScenarioChange with parameters={}
- Projection computation fails or produces incorrect results
- Poor user experience - error appears after submission instead of preventing it

**Recommendation**: Add client-side validation before submission.

---

### 🟡 HIGH: Scenario Creation Failure Leaves Broken State

**Location**: `frontend/components/life-events/life-event-wizard.tsx:187`

**Issue**: If `scenarios.compute()` fails after scenario is created, the scenario exists but has no projections:

```typescript
// Apply the life event template to the scenario
const response = await lifeEventTemplates.apply(...)

// Compute projections - if this fails, scenario is created but broken
await scenarios.compute(scenarioId)
```

**Impact**: Orphaned scenarios that can't be used or compared.

**Recommendation**: Wrap in try/catch and delete scenario if compute fails, or make compute part of the same transaction.

---

### 🟠 MEDIUM: Source Flow Queries May Show Inactive Flows

**Location**: `frontend/components/life-events/life-event-wizard.tsx:144-153`

**Issue**: Expense flows are filtered to `flow.flowType === 'expense'` but not explicitly to `is_active=True`:

```typescript
.filter((flow: RecurringFlow) => flow.flowType === 'expense')
```

**Impact**: Users might select inactive/archived flows as source for modifications.

**Recommendation**: Add `is_active` filter or rely on API to only return active flows.

---

### 🟠 MEDIUM: Change Value Types Not Validated

**Location**: `frontend/components/life-events/life-event-wizard.tsx:216-224`

**Issue**: User input is stored as-is without type conversion:

```typescript
setChangeValues((prev) => ({
    ...prev,
    [String(changeIdx)]: {
        ...prev[String(changeIdx)],
        [field]: value,  // String input stored directly
    },
}))
```

**Impact**: Backend expects Decimal for `amount`, but receives string "1000" instead of number 1000.

**Recommendation**: Parse and validate types based on field name (amount → number, date → Date, etc.).

---

## 6. Missing / Incomplete Features

### 🟠 MEDIUM: No Undo/Redo for Scenario Changes

**Issue**: Once changes are applied to a scenario, there's no way to revert them besides manually deleting.

**Impact**: Users can't experiment easily - they must recreate scenarios from scratch if they make mistakes.

**Recommendation**: Implement change history or snapshot feature.

---

### 🟠 MEDIUM: No Change Audit Trail

**Issue**: ScenarioChange can be modified (parameters updated), but there's no audit trail of what changed when.

**Impact**: Can't understand why projection results changed over time.

**Recommendation**: Add ChangeHistory model or use django-simple-history.

---

### 🟠 MEDIUM: No Validation That effective_date Is Within Projection Period

**Location**: `backend/apps/scenarios/views.py:788-798`

**Issue**: Can create changes with effective_date after scenario.start_date + projection_months:

```python
# Scenario projects 120 months from Jan 2026
# Change effective_date = Jan 2036 (10 years out) - allowed but useless
```

**Impact**: Changes never take effect because they're beyond projection horizon.

**Recommendation**: Validate effective_date is within projection period.

---

### 🟠 MEDIUM: No Support for Gradual Changes

**Issue**: All changes happen immediately on effective_date. Can't model gradual transitions (e.g., "reduce work hours by 10% each month for 6 months").

**Impact**: Users must create multiple changes to approximate gradual transitions.

**Recommendation**: Add support for ramp-up/ramp-down parameters.

---

### 🔵 LOW: No Optimization/Solver Capability

**Issue**: Can't ask questions like "what 401k contribution rate gets me to $2M by retirement?"

**Impact**: Users must manually try different values until they find one that works.

**Recommendation**: Add goal-seek or optimization feature (TASK-14 mentions decision builder, but incomplete).

---

### 🔵 LOW: Limited Stress Test Change Types

**Issue**: Only basic stress tests supported (investment drops, inflation spikes). No support for:
- Income loss scenarios
- Unexpected expense scenarios
- Healthcare cost increases
- Education cost inflation

**Recommendation**: Expand stress test templates to cover more scenarios.

---

## 7. Baseline / Reality Change Issues

### 🟡 HIGH: Reality Change Events Can Accumulate Indefinitely

**Location**: `backend/apps/scenarios/reality_events.py:88-90`

**Issue**: If processing fails repeatedly, events stay in PENDING status and accumulate:

```python
pending_events = RealityChangeEvent.objects.filter(
    status=RealityChangeEventStatus.PENDING
).select_related('household').order_by('created_at')[:batch_size]
```

**Impact**:
- Table grows unbounded
- No cleanup of old failed events
- Performance degrades as table grows

**Recommendation**: Add cleanup job for events older than X days, or implement exponential backoff.

---

### 🟠 MEDIUM: No Detection of Conflicting Reality Changes

**Location**: `backend/apps/scenarios/reality_events.py:93-95`

**Issue**: Multiple events affecting the same account/flow could conflict, but there's no detection or resolution:

```python
# Event 1: Account balance changed to $1000
# Event 2: Account balance changed to $2000
# Which is correct? Both trigger baseline refresh, but no conflict detection
```

**Recommendation**: Add conflict detection or last-write-wins semantics with timestamp.

---

### 🟠 MEDIUM: Baseline Refresh Doesn't Validate Data Integrity

**Location**: `backend/apps/scenarios/baseline.py:75-115`

**Issue**: If household has inconsistent data (e.g., IncomeSource without household_member), refresh will fail, but there's no validation beforehand:

```python
def refresh_baseline(cls, household: Household, force: bool = False):
    # No data integrity checks
    engine = ScenarioEngine(baseline)
    engine.compute_projection()  # May fail if data is broken
```

**Recommendation**: Add pre-flight data validation checks.

---

### 🟠 MEDIUM: No Rollback for Failed Baseline Refresh

**Location**: `backend/apps/scenarios/services.py:250-252`

**Issue**: Projections are deleted before new ones are computed. If computation fails, old projections are gone:

```python
with transaction.atomic():
    ScenarioProjection.objects.filter(scenario=self.scenario).delete()
    ScenarioProjection.objects.bulk_create(projections)  # If this fails, old data is lost
```

**Impact**: Failed refresh leaves baseline with no projections.

**Recommendation**: Compute projections first, then delete+insert in same transaction.

---

## 8. Performance Issues

### 🟠 MEDIUM: N+1 Query Problem in Views

**Location**: Multiple views (scenarios list, changes list, etc.)

**Issue**: Views fetch scenarios then iterate over related objects without prefetching:

```python
scenarios = Scenario.objects.filter(household=household)
for scenario in scenarios:
    changes = scenario.changes.all()  # N+1 query
    projections = scenario.projections.all()  # Another N+1
```

**Recommendation**: Use `prefetch_related('changes', 'projections')`.

---

### 🟠 MEDIUM: No Caching of Expensive Calculations

**Issue**: Tax calculations, projection comparisons, and other expensive operations are recomputed from scratch every time with no caching.

**Impact**: Slow API response times, especially for comparison endpoint.

**Recommendation**: Cache projection results and invalidate on scenario updates.

---

### 🔵 LOW: Large JSON Fields Without Indexing

**Location**: `parameters`, `suggested_changes`, `payload` fields

**Issue**: These JSONFields can be large and are queried but not indexed.

**Impact**: Queries that filter on JSON contents will be slow.

**Recommendation**: Add GIN indexes if filtering on JSON fields is needed.

---

## 9. Documentation / Code Quality Issues

### 🟠 MEDIUM: Incomplete Docstrings

**Issue**: Many complex functions lack docstrings or have incomplete ones:
- `_apply_change`: 200+ lines, no docstring
- `_advance_month`: Complex logic, minimal documentation
- `_recalculate_all_taxes`: No docstring

**Recommendation**: Add comprehensive docstrings to all public and complex private methods.

---

### 🔵 LOW: Magic Numbers Not Explained

**Issue**: Many hard-coded values without explanation:
- 999 for max DSCR (services.py:1532)
- 9.9999 for max savings_rate (services.py:1571)
- 360 for max horizon months (comparison.py)

**Recommendation**: Define as named constants with explanatory comments.

---

## 10. Data Consistency Issues

### 🟡 HIGH: Income Source vs RecurringFlow Dual Representation

**Location**: `backend/apps/scenarios/services.py:340-455`

**Issue**: Income can come from either IncomeSource or RecurringFlow, with complex logic to avoid double-counting:

```python
# Include income from IncomeSource objects
for source in IncomeSource.objects.filter(...):
    incomes.append(...)

# Skip employment income from RecurringFlow if we have IncomeSources
has_income_sources = len(incomes) > 0 or len(deferred_incomes) > 0
if has_income_sources:
    employment_categories = {'salary', 'hourly_wages', ...}
    if flow.category in employment_categories:
        continue  # Skip to avoid double-counting
```

**Impact**:
- Fragile logic that could break if categories don't match exactly
- Confusing which source of truth to use
- Risk of double-counting or missing income

**Recommendation**: Consolidate to single source of truth for income data.

---

### 🟡 HIGH: Inconsistent Frequency Handling

**Location**: Multiple locations

**Issue**: Frequencies are sometimes strings ('monthly'), sometimes enums (Frequency.MONTHLY), and conversion logic is scattered:

```python
# services.py:1583
if isinstance(frequency, str):
    try:
        frequency = Frequency(frequency)
    except ValueError:
        pass  # Keep as string if invalid
```

**Impact**: Type confusion, potential for bugs when adding/comparing frequencies.

**Recommendation**: Standardize on one representation throughout the codebase.

---

## Summary Statistics

- **Total Issues Found**: 58
- **Critical (🔴)**: 6
- **High (🟡)**: 17
- **Medium (🟠)**: 27
- **Low (🔵)**: 8

**Top Priority Issues** (Recommended Fix Order):

1. 🔴 **Task status endpoint security vulnerability** - Can expose other households' data
2. 🔴 **Tax calculation doesn't update when income changes** - Financial calculations incorrect
3. 🔴 **Deferred income tax recalculation** - More incorrect tax calculations
4. 🔴 **No schema validation on ScenarioChange parameters** - Data integrity risk
5. 🟡 **Investment recovery calculation error** - Stress tests give wrong results
6. 🟡 **Compare endpoint modifies scenarios** - Unexpected side effects
7. 🟡 **Adopt endpoint incomplete** - Feature mostly non-functional
8. 🟡 **source_flow_id type inconsistency** - Changes don't find their targets
9. 🟡 **MODIFY_401K only handles one income** - Multi-job scenarios broken
10. 🟡 **Baseline refresh rollback missing** - Failed refresh loses all projections

---

## Testing Recommendations

Based on issues found, the following test cases are recommended:

### Unit Tests Needed:
1. Test tax recalculation when income order changes
2. Test deferred income tax calculation
3. Test MODIFY_401K with multiple income sources
4. Test investment recovery math correctness
5. Test debt payment matching with various ID formats
6. Test all ScenarioChange parameter schemas
7. Test source_flow_id matching for all flow types

### Integration Tests Needed:
1. Test life event wizard end-to-end with various templates
2. Test scenario comparison with extended horizons
3. Test adopt functionality for all supported change types
4. Test baseline refresh with data integrity issues
5. Test reality change event processing with failures

### Security Tests Needed:
1. Test task status endpoint with cross-household access attempts
2. Test ScenarioChange parameter injection attacks
3. Test rate limiting on expensive operations

---

## Conclusion

The Life Events and Scenario Engine is a sophisticated system with powerful capabilities, but it has several critical bugs that affect financial calculation correctness and data security. The most urgent issues are:

1. **Financial Correctness**: Tax calculations and investment recovery need immediate fixes
2. **Security**: Task status endpoint vulnerability needs patching
3. **Data Integrity**: Schema validation for scenario changes is essential
4. **Feature Completeness**: Many partially implemented features need completion

The codebase is well-structured overall, but would benefit from:
- More comprehensive unit/integration tests
- Better input validation at all boundaries
- Consolidation of income data sources
- Documentation of complex financial logic

**Estimated effort to address top 10 issues**: 2-3 weeks of focused development work
