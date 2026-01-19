# Complete Async Bugs - All Issues Found

## Previously Fixed (7 issues from first investigation)

✅ **Issue #1**: Missing task ownership validation in onboarding - FIXED
✅ **Issue #2**: Blocking .get() in batch stress tests - FIXED
✅ **Issue #3**: Race condition in flow regeneration TASKS - FIXED (but see Issue #8!)
✅ **Issue #4**: Race condition in reality event processing - FIXED
✅ **Issue #5**: Task result expiration mismatch - FIXED
✅ **Issue #6**: Missing task status endpoints - FIXED
✅ **Issue #7**: Silent error handling in compare scenarios - FIXED

---

## NEW CRITICAL BUGS FOUND (8 additional issues)

### ISSUE #8: Synchronous Flow Regeneration Has NO Locking (CRITICAL)

**Severity**: CRITICAL - Data Corruption Risk
**Location**: `/home/user/effluent/backend/apps/flows/views.py:72`
**Risk**: Race condition, duplicate/missing flows

#### The Problem
```python
# flows/views.py:72 - Synchronous path
if not run_async:    # ❌ NO LOCKING AT ALL!
    generate_system_flows_for_household(request.household.id)
```

We added `@with_task_lock` to the ASYNC task, but the **synchronous code path** has NO protection!

#### Race Condition Scenario
1. User triggers sync flow regeneration via API (`async=false`)
2. Reality event processing starts for same household (has lock)
3. Both call `generate_system_flows_for_household()` simultaneously
4. Both enter `transaction.atomic()`
5. Both delete all system flows
6. Both recreate flows
7. **Result**: Duplicate flows or missing flows

#### Impact
- **Data corruption**: Duplicate tax withholding, income, expense flows
- **Incorrect projections**: Baseline scenarios show wrong cash flow
- **User confusion**: Double expenses in UI

#### Fix Required
```python
# flows/views.py
from apps.core.task_utils import get_household_lock, release_household_lock

if not run_async:
    lock_acquired = get_household_lock(str(request.household.id), 'flow_regen_sync', timeout=30)
    if not lock_acquired:
        return Response({
            'error': 'Flow regeneration already in progress'
        }, status=status.HTTP_409_CONFLICT)
    try:
        generate_system_flows_for_household(request.household.id)
    finally:
        release_household_lock(str(request.household.id), 'flow_regen_sync')
```

---

### ISSUE #9: Onboarding Flow Regeneration Has NO Locking (CRITICAL)

**Severity**: CRITICAL - Data Corruption Risk
**Location**: `/home/user/effluent/backend/apps/onboarding/services.py:91`
**Risk**: Race condition during onboarding

#### The Problem
```python
# onboarding/services.py:91
if current_step in FLOW_GENERATION_STEPS:
    generate_system_flows_for_household(self.household.id)  # ❌ NO LOCKING!
```

Onboarding calls `generate_system_flows_for_household()` directly during step completion with NO locking.

#### Race Condition Scenario
1. User completes onboarding step (Income Sources)
2. Onboarding calls `generate_system_flows_for_household()`
3. Beat scheduler triggers reality event processing for same household
4. Reality event processing calls `generate_system_flows_for_household()`
5. **Result**: Concurrent flow generation, data corruption

#### Specific Trigger Steps
From `FLOW_GENERATION_STEPS` (onboarding/services.py:17-27):
- INCOME_SOURCES
- WITHHOLDING
- PRETAX_DEDUCTIONS
- MORTGAGES
- CREDIT_CARDS
- STUDENT_LOANS
- OTHER_DEBTS
- COMPLETE

Every time user completes one of these steps, flows regenerate WITHOUT locking!

#### Fix Required
```python
# onboarding/services.py
from apps.core.task_utils import get_household_lock, release_household_lock

if current_step in FLOW_GENERATION_STEPS:
    lock_acquired = get_household_lock(str(self.household.id), 'flow_regen_onboarding', timeout=30)
    if lock_acquired:
        try:
            generate_system_flows_for_household(self.household.id)
        finally:
            release_household_lock(str(self.household.id), 'flow_regen_onboarding')
    else:
        logger.warning(f"Flow regeneration already in progress for household {self.household.id}, skipping")
```

---

### ISSUE #10: Multiple Flow Regeneration Entry Points Cause Lock Mismatch (HIGH)

**Severity**: HIGH - Lock Inconsistency
**Risk**: Some paths protected, others not

#### The Problem
We have **5 different entry points** for flow regeneration:

1. ✅ `regenerate_system_flows_task` (async task) - HAS LOCKING
2. ✅ `recalculate_tax_withholding_task` (async task) - HAS LOCKING
3. ✅ `process_reality_changes` (reality events) - HAS LOCKING
4. ❌ **Synchronous API call** (flows/views.py:72) - NO LOCKING
5. ❌ **Onboarding step completion** (onboarding/services.py:91) - NO LOCKING

All 5 call the same underlying function `generate_system_flows_for_household()` which has **transaction.atomic but NO locking**.

#### Design Issue
Locking is at the CALLER level, not the FUNCTION level. This creates inconsistency.

#### Better Design
**Option A**: Move locking INTO `generate_system_flows_for_household()`
```python
def generate_system_flows_for_household(household_id, timeout=30) -> dict:
    from apps.core.task_utils import get_household_lock, release_household_lock    from apps.core.models import Household

    lock_acquired = get_household_lock(str(household_id), 'flow_generation', timeout=timeout)
    if not lock_acquired:
        return {'skipped': True, 'reason': 'lock_held'}

    try:
        household = Household.objects.get(id=household_id)
        generator = SystemFlowGenerator(household)
        generator.generate_all_flows()
        return {'success': True}
    finally:
        release_household_lock(str(household_id), 'flow_generation')
```

**Option B**: Always require callers to acquire lock first (current partial implementation)
- Pro: Explicit lock ownership
- Con: Easy to forget, already missed 2 call sites

**Recommendation**: Option A - centralize locking in the function itself

---

### ISSUE #11: generate_all_flows() Transaction Scope Too Narrow (MEDIUM)

**Severity**: MEDIUM - Atomicity Risk
**Location**: `/home/user/effluent/backend/apps/flows/services.py:86-91`

#### The Problem
```python
def generate_all_flows(self):
    with transaction.atomic():  # Transaction INSIDE the function        # Delete existing
        RecurringFlow.objects.filter(...).delete()

        # Generate income flows
        self._generate_income_flows()  # Creates many flows

        # Generate liability flows
        self._generate_liability_payment_flows()  # Creates more flows
```

The transaction is INSIDE `generate_all_flows()`, which means:
- Each call to `generate_all_flows()` gets its own transaction
- But the LOCKING (when present) is OUTSIDE in the caller
- Lock is held before transaction starts

#### Race Condition Window
1. Thread A acquires lock
2. Thread B attempts lock, waits
3. Thread A enters transaction
4. Thread A deletes flows (DELETE committed when transaction ends)
5. **Thread A transaction commits**
6. **WINDOW**: Lock still held but transaction done
7. If Thread A's task fails/retries, flows are deleted but not recreated
8. Thread B gets lock, sees empty flow table, regenerates

#### Current Behavior
Actually this is probably OK because:
- Lock is held during entire function call
- Transaction commits before lock release
- Next caller sees consistent state

But if function throws exception AFTER transaction commits, flows could be deleted without regeneration.

#### Fix
Ensure lock is held for full function + transaction lifecycle (currently correct in most cases).

---

### ISSUE #12: No Idempotency for Flow Regeneration (MEDIUM)

**Severity**: MEDIUM - Duplicate Work
**Risk**: User clicks "Regenerate" twice, dispatches 2 tasks

#### The Problem
If user double-clicks "Regenerate flows" button:
1. First click dispatches task 1
2. Second click dispatches task 2
3. Task 1 acquires lock, regenerates flows
4. Task 2 waits for lock, then regenerates flows AGAIN
5. **Result**: Same work done twice, wasted resources

#### Current Behavior
- Tasks do get lock, so no data corruption
- But both tasks run sequentially
- No idempotency - same operation performed twice

#### Fix
Add idempotency key:
```python
from apps.core.task_utils import with_idempotency_key

@shared_task(bind=True)
@with_idempotency_key('flow_regen:{household_id}', ttl=300)
@with_task_lock('flow_regen:{household_id}', timeout=300)
@transaction.atomic
def regenerate_system_flows_task(self, household_id):
    # If called twice within 5 minutes, second call returns {'duplicate': True}
    ...
```

---

### ISSUE #13: Baseline Refresh Has NO Distributed Locking (CRITICAL)

**Severity**: CRITICAL - Data Corruption Risk
**Location**: Multiple locations where `BaselineScenarioService.refresh_baseline()` is called

#### The Problem
Baseline refresh can be triggered from:
1. Reality event processing (scenarios/reality_events.py:141)
2. Manual API call (scenarios/views.py:782-791)
3. Onboarding completion (onboarding/services.py via reality event)

**None of these have household-level locking at the baseline refresh level!**

#### Current State
- Reality events have **household lock for entire processing** ✓
- But that lock is for "reality_processing", not for "baseline_refresh"
- Manual API call has NO locking ❌
- If both happen simultaneously:  - Reality processing: locks, regenerates flows, refreshes baseline
  - Manual API: dispatches baseline refresh task (no lock check)  - Both refresh baseline concurrently!

#### Race Condition
```python
# scenarios/reality_events.py:141 - has reality_processing lock
BaselineScenarioService.refresh_baseline(household)

# scenarios/views.py:791 - NO LOCK CHECK before dispatch!
task = refresh_baseline_task.apply_async(
    kwargs={'household_id': str(request.household.id)}
)
```

#### Fix Required
Add idempotency check before dispatching baseline refresh:
```python
# scenarios/views.py
from apps.core.task_utils import with_idempotency_key

# Option 1: Check if refresh is already in progress
from django.core.cache import cache
refresh_key = f'baseline_refresh_in_progress:{household.id}'
if cache.get(refresh_key):
    return Response({
        'error': 'Baseline refresh already in progress'
    }, status=status.HTTP_409_CONFLICT)

cache.set(refresh_key, 'true', timeout=300)  # 5 min lock
```

---

### ISSUE #14: Scenario Projections Don't Reflect Latest Flows (HIGH)

**Severity**: HIGH - Stale Data Risk
**Risk**: Projections computed with old flow data

#### The Problem
1. User modifies income source (triggers reality event)
2. Reality event queued for processing (runs every 30s)
3. User immediately computes scenario projection
4. **Projection reads flows before reality event processed**
5. **Result**: Projection shows OLD flows, not new ones

#### Current Behavior
- Reality events processed every 30 seconds by Beat
- Flow regeneration is async
- Scenario projection is immediate
- **No coordination between reality events and projections**

#### Example Timeline
```
00:00 - User changes income from $80k to $100k
00:00 - Reality event created (status=PENDING)
00:01 - User computes scenario projection
00:01 - Projection reads flows (still shows $80k income)
00:30 - Beat processes reality event
00:30 - Flows regenerated (now shows $100k income)
00:31 - Projection is now stale
```

#### Impact
- **Incorrect projections**: Users see wrong cash flow
- **Confusing UX**: "I just changed my income, why doesn't projection update?"
- **Trust issues**: Users lose confidence in accuracy

#### Fix Options

**Option A**: Check for pending reality events before projection
```python
# scenarios/services.py - in ScenarioEngine.__init__
from apps.scenarios.models import RealityChangeEvent, RealityChangeEventStatus

pending = RealityChangeEvent.objects.filter(
    household=household,
    status=RealityChangeEventStatus.PENDING
).exists()

if pending:
    # Process immediately or wait or warn user
    logger.warning(f"Household {household.id} has pending reality events")
```

**Option B**: Trigger immediate flow regeneration before projection
```python
# If pending events exist, process them immediately instead of waiting for Beat
if pending:
    from apps.scenarios.reality_events import process_reality_changes
    process_reality_changes(batch_size=100)
```

**Option C**: Add staleness indicator to projection response
```python
{
    'projection': ...,
    'data_freshness': {
        'has_pending_events': true,
        'last_baseline_refresh': '2026-01-19T12:00:00Z',
        'warning': 'Projection may not reflect latest changes'
    }
}
```

---

### ISSUE #15: No Rollback on Partial Flow Generation Failure (MEDIUM)

**Severity**: MEDIUM - Partial State Risk
**Location**: `/home/user/effluent/backend/apps/flows/services.py:93-97`

#### The Problem
```python
def generate_all_flows(self):
    with transaction.atomic():
        # Delete all system flows
        RecurringFlow.objects.filter(...).delete()

        # Generate income flows
        self._generate_income_flows()  # Could fail here!

        # Generate liability flows        self._generate_liability_payment_flows()  # Or here!
```

If `_generate_income_flows()` succeeds but `_generate_liability_payment_flows()` fails:
- Transaction rolls back (good!)
- But we're inside a Celery task
- Task will retry (good!)
- **But**: Next retry sees same error condition
- **Result**: Task fails permanently, household has NO flows

#### Specific Failure Cases
1. **Account not found**: Primary checking account deleted mid-regeneration
2. **Invalid data**: Income source has gross_annual=0 or negative
3. **Database constraint violation**: Duplicate flow somehow created
4. **FK violation**: Linked account deleted

#### Current Behavior
- Transaction rolls back on error ✓
- Task retries (up to 3 times) ✓
- But if error is data-related, retries will all fail ✓
- **Result**: Task fails, household has NO flows ✗

#### Fix
Add error handling with partial recovery:
```python
def generate_all_flows(self):
    with transaction.atomic():
        # Delete all system flows
        RecurringFlow.objects.filter(...).delete()

        try:
            self._generate_income_flows()
        except Exception as e:
            logger.error(f"Income flow generation failed: {e}", exc_info=True)
            # Continue with liability flows even if income fails

        try:
            self._generate_liability_payment_flows()
        except Exception as e:
            logger.error(f"Liability flow generation failed: {e}", exc_info=True)
```

But this violates transaction atomicity! Better approach:

```python
def generate_all_flows(self):
    """Generate all flows with granular error reporting."""
    errors = []

    with transaction.atomic():
        # Delete all system flows
        RecurringFlow.objects.filter(...).delete()

        # Try income flows
        try:
            self._generate_income_flows()
        except Exception as e:
            errors.append(('income', str(e)))
            logger.error(f"Income flow generation failed: {e}", exc_info=True)
            raise  # Still raise to rollback transaction

        # Try liability flows
        try:
            self._generate_liability_payment_flows()
        except Exception as e:
            errors.append(('liability', str(e)))
            logger.error(f"Liability flow generation failed: {e}", exc_info=True)
            raise

    return {'errors': errors} if errors else {'success': True}
```

---

## Summary of ALL Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Missing task ownership in onboarding | CRITICAL | ✅ FIXED |
| 2 | Blocking .get() in batch stress tests | HIGH | ✅ FIXED |
| 3 | Race condition in flow regen tasks | HIGH | ✅ FIXED |
| 4 | Race condition in reality events | HIGH | ✅ FIXED |
| 5 | Task result expiration mismatch | MEDIUM | ✅ FIXED |
| 6 | Missing task status endpoints | MEDIUM | ✅ FIXED |
| 7 | Silent error handling | LOW | ✅ FIXED |
| **8** | **Sync flow regen has NO locking** | **CRITICAL** | ❌ **NOT FIXED** |
| **9** | **Onboarding flow regen has NO locking** | **CRITICAL** | ❌ **NOT FIXED** |
| **10** | **Inconsistent locking across entry points** | **HIGH** | ❌ **NOT FIXED** |
| 11 | Transaction scope concerns | MEDIUM | ⚠️ Acceptable |
| 12 | No idempotency for flow regen | MEDIUM | ❌ NOT FIXED |
| **13** | **Baseline refresh has NO locking** | **CRITICAL** | ❌ **NOT FIXED** |
| **14** | **Projections don't reflect latest flows** | **HIGH** | ❌ **NOT FIXED** |
| 15 | No rollback on partial failure | MEDIUM | ❌ NOT FIXED |

## Critical Issues Remaining: 3
## High Severity Issues Remaining: 2
## Medium Severity Issues Remaining: 2

**Total Unfixed**: 7 issues (3 critical, 2 high, 2 medium)

## Priority Fix Order

1. **Issue #8** - Sync flow regen locking (CRITICAL)
2. **Issue #9** - Onboarding flow regen locking (CRITICAL)
3. **Issue #13** - Baseline refresh locking (CRITICAL)
4. **Issue #10** - Centralize locking in generate_system_flows_for_household()
5. **Issue #14** - Handle stale flow data in projections
6. **Issue #12** - Add idempotency
7. **Issue #15** - Improve error handling
