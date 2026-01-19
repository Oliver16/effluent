# Async Task Implementation - Deep Dive Investigation Report

**Date**: 2026-01-19
**Branch**: `claude/investigate-async-bugs-EyEvg`
**Status**: CRITICAL ISSUES FOUND

---

## Executive Summary

This investigation identified **7 critical to medium severity bugs** in the async task implementation, including:
- **1 CRITICAL security vulnerability** (missing task ownership validation in onboarding)
- **3 HIGH severity race conditions** (batch tasks, flow regeneration, reality event processing)
- **2 MEDIUM severity architectural issues** (task expiration mismatch, missing endpoints)
- **1 LOW severity error handling issue** (silent failures in compare scenarios)

The recent security fixes (commits 557fd1e and fc22783) correctly addressed cross-user task access vulnerabilities, but **one critical code path was missed**: the onboarding completion baseline refresh.

---

## Architecture Overview

### Technology Stack
- **Task Queue**: Celery 5.x with Redis broker
- **Result Backend**: Django-DB (PostgreSQL) - NOT Redis
- **Beat Scheduler**: Celery Beat for periodic tasks (reality events every 30s)
- **Task Timeout**: 30 minutes hard limit, 25 minutes soft limit
- **Result Expiration**: 1 hour (3600 seconds)

### Task Inventory (11 total tasks)
1. `refresh_baseline_task` - Baseline scenario recalculation
2. `compute_projection_task` - Scenario projection computation
3. `compare_scenarios_task` - Multi-scenario comparison with driver analysis
4. `apply_life_event_task` - Life event application to scenarios
5. `process_reality_changes_task` - Periodic event processing (Beat: every 30s)
6. `cleanup_old_reality_events_task` - Daily cleanup (Beat: 3 AM)
7. `run_stress_test_task` - Single stress test execution
8. `run_batch_stress_tests_task` - Parallel batch stress testing
9. `analyze_stress_test_results_task` - Post-test analysis
10. `regenerate_system_flows_task` - System flow regeneration
11. `recalculate_tax_withholding_task` - Tax withholding recalculation

### Security Pattern (Established in 557fd1e)
All async task endpoints should follow this pattern:
1. Dispatch task: `task = some_task.apply_async(kwargs={...})`
2. Cache ownership: `cache.set(f'task_household:{task.id}', str(household.id), 3600)`
3. Validate ownership in status endpoint before returning results
4. Return 404 for expired/unknown tasks, 403 for unauthorized access

---

## CRITICAL ISSUES

### ISSUE #1: Missing Task Ownership Validation in Onboarding (CRITICAL)

**Severity**: CRITICAL SECURITY VULNERABILITY
**Location**: `/home/user/effluent/backend/apps/onboarding/services.py:939-941`
**Risk**: Task ownership validation broken for onboarding-triggered baseline refreshes

#### The Problem
```python
# Line 939-941 in onboarding/services.py
refresh_baseline_task.apply_async(
    kwargs={'household_id': str(self.household.id)}
)
# ❌ NO cache.set() for task_household mapping!
```

When a user completes onboarding, the baseline refresh task is dispatched **WITHOUT** caching the task ownership mapping. This violates the security pattern established in commit 557fd1e.

#### Impact
1. **Broken Status Polling**: Users completing onboarding receive a `task_id` in the response, but polling `/api/v1/scenarios/tasks/{task_id}/` will return 404 (task ownership not found in cache)
2. **Inconsistent Security**: Every other async endpoint has this protection, but onboarding doesn't
3. **Poor UX**: Users see "Baseline generating..." but can't actually track the task progress

#### Expected Pattern (from scenarios/views.py:82-84)
```python
task = refresh_baseline_task.apply_async(kwargs={...})
cache.set(f'task_household:{task.id}', str(request.household.id), 3600)
return Response({'task_id': task.id, ...})
```

#### Fix Required
```python
# onboarding/services.py:939-941
task = refresh_baseline_task.apply_async(
    kwargs={'household_id': str(self.household.id)}
)
cache.set(f'task_household:{task.id}', str(self.household.id), 3600)
```

---

### ISSUE #2: Blocking .get() in Batch Stress Tests (HIGH)

**Severity**: HIGH - Resource Exhaustion Risk
**Location**: `/home/user/effluent/backend/apps/stress_tests/tasks.py:108-109`
**Risk**: Worker thread exhaustion, no partial result recovery

#### The Problem
```python
# Line 98-109 in stress_tests/tasks.py
job = group(
    run_stress_test_task.s(household_id=str(household_id), ...)
    for config in test_configs
)
result = job.apply_async()
results = result.get(timeout=3600)  # ❌ BLOCKS worker for up to 1 hour!
```

The `run_batch_stress_tests_task` uses Celery's blocking `.get()` call, which has multiple problems:

#### Problems
1. **Worker Blocking**: A worker thread is blocked for up to 1 hour waiting for child tasks
2. **No Partial Results**: If one subtask fails, the entire batch fails without any results
3. **Resource Waste**: Worker capacity is wasted sitting idle instead of processing other tasks
4. **Cascading Failures**: If parent task times out, all child tasks become orphaned

#### Impact
With default 4 workers and max 1000 tasks per child:
- A single batch of 10 stress tests blocks 1 worker for up to 1 hour
- 4 concurrent batch requests = all workers blocked
- No other tasks can run until batch completes

#### Better Pattern
Use task chains or callbacks instead of blocking:
```python
# Option 1: Use chord for callback after group completes
from celery import chord

callback = collect_stress_test_results.s()
job = chord(
    run_stress_test_task.s(...) for config in test_configs
)(callback)
return {'task_id': job.id}
```

---

### ISSUE #3: Race Condition in Flow Regeneration (HIGH)

**Severity**: HIGH - Data Consistency Risk
**Location**: `/home/user/effluent/backend/apps/flows/tasks.py:98-105`
**Risk**: Duplicate flows, stale UI state, inconsistent tax calculations

#### The Problem
```python
# Line 98-105 in flows/tasks.py
deleted_count, _ = RecurringFlow.objects.filter(
    household=household,
    is_system_generated=True,
    system_flow_kind='tax_withholding'
).delete()  # ❌ No transaction, no lock!

generator._generate_tax_withholding_flows()  # Create new ones
```

**Race Condition Window**:
1. Task A starts: DELETE old tax withholding flows
2. Task A: Flows deleted but new ones not yet created
3. User opens UI: Sees no tax withholding flows ❌
4. Task B starts: DELETE old tax withholding flows (finds none)
5. Task A completes: Creates new flows
6. Task B completes: Creates duplicate flows ❌

#### Missing Protection
- **No `@transaction.atomic()` decorator** on the task
- **No distributed locking** (Redis lock, DB-level lock, etc.)
- **No task deduplication** (same household can have multiple concurrent regenerations)

#### Impact
- **Data corruption**: Duplicate tax withholding flows
- **Incorrect projections**: Baseline scenarios use wrong expense amounts
- **UI confusion**: Users see duplicate or missing flows

#### Fix Required
```python
from django.db import transaction

@shared_task(name='apps.flows.tasks.recalculate_tax_withholding_task', bind=True)
@transaction.atomic  # ✅ Wrap entire task in transaction
def recalculate_tax_withholding_task(self, household_id):
    # Or use Redis lock for distributed locking:
    from django.core.cache import cache

    lock_key = f'flow_regen_lock:{household_id}'
    if not cache.add(lock_key, 'true', timeout=300):  # 5 min lock
        logger.warning(f"Flow regeneration already in progress for {household_id}")
        return {'skipped': True}

    try:
        # ... delete and regenerate ...
    finally:
        cache.delete(lock_key)
```

---

### ISSUE #4: Reality Event Processing Race Condition (HIGH)

**Severity**: HIGH - Data Consistency Risk
**Location**: `/home/user/effluent/backend/apps/scenarios/reality_events.py:115-138`
**Risk**: Duplicate flow regeneration, concurrent baseline refreshes

#### The Problem
The `process_reality_changes_task` runs every 30 seconds via Celery Beat:

```python
# Line 126-131 in reality_events.py
if needs_flow_regen:
    logger.info(f"Regenerating system flows...")
    generate_system_flows_for_household(household_id)  # ❌ No lock!

BaselineScenarioService.refresh_baseline(household)  # ❌ No lock!
```

**Race Condition Scenario**:
1. Beat triggers Task A at 12:00:00 for Household X
2. Task A starts processing events for Household X
3. Beat triggers Task B at 12:00:30 (still within 30s schedule)
4. Task B queries pending events - finds same events (Task A hasn't marked them processed yet)
5. Both tasks regenerate flows and refresh baseline **concurrently** ❌

#### Current Protections (Insufficient)
✅ Events coalesced by household
✅ `@transaction.atomic()` wrapper (line 117)
✅ Events marked processed at end
❌ **No task-level locking** - multiple tasks can process same household
❌ **No idempotency** - running twice regenerates flows twice

#### Impact
- **Duplicate work**: Same household processed multiple times
- **Resource waste**: Expensive baseline refreshes running in parallel
- **Race condition**: Flow regeneration from Issue #3 triggered concurrently

#### Fix Required
Add distributed locking at task level:
```python
from django.core.cache import cache

def process_reality_changes(batch_size=100):
    # ... get events ...

    for household_id, events in events_by_household.items():
        lock_key = f'reality_processing_lock:{household_id}'
        if not cache.add(lock_key, 'true', timeout=300):  # 5 min lock
            logger.info(f"Household {household_id} already being processed, skipping")
            continue

        try:
            # ... process events ...
        finally:
            cache.delete(lock_key)
```

---

## MEDIUM SEVERITY ISSUES

### ISSUE #5: Task Result Expiration Mismatch (MEDIUM)

**Severity**: MEDIUM - Edge Case Data Loss
**Location**: `/home/user/effluent/backend/config/celery.py:44` and multiple views
**Risk**: Task results expire before cache entries, causing "task not found" errors

#### The Problem
```python
# celery.py:44
result_expires=3600,  # Results expire after 1 hour

# Multiple views (scenarios/views.py:84, flows/views.py:57, etc.)
cache.set(f'task_household:{task.id}', str(household_id), 3600)  # Also 1 hour
```

**Edge Case Race Condition**:
1. Task dispatched at 12:00:00
2. Task runs for 58 minutes (complex stress test)
3. Task completes at 12:58:00, result saved to DB
4. User polls at 12:59:30 (59.5 minutes after dispatch)
5. Cache entry still exists (expires at 13:00:00)
6. Result backend may have purged result (expires at 13:00:00, but purging is async)
7. User gets "Task not found" error instead of actual result ❌

#### Impact
- **Rare but critical**: Users lose results for long-running tasks
- **Poor UX**: "Your task completed but we lost the result"
- **Financial data loss**: Stress test or projection results disappear

#### Fix Options
1. **Increase result expiration**: `result_expires=7200` (2 hours) while keeping cache at 1 hour
2. **Decrease task timeout**: `task_time_limit=20*60` (20 minutes) to ensure completion before expiration
3. **Best: Both** - Increase result expiration to 2 hours AND reduce task timeout to 20 minutes

---

### ISSUE #6: Missing Task Status Endpoints (MEDIUM)

**Severity**: MEDIUM - Inconsistent API
**Location**: Flows and Onboarding task dispatch
**Risk**: Users can't poll task status for certain operations

#### The Problem
**Endpoints Present**:
- ✅ Scenarios: `GET /api/v1/scenarios/tasks/{task_id}/`
- ✅ Stress Tests: `GET /api/stress-tests/status/{task_id}/`

**Endpoints MISSING**:
- ❌ Flows regeneration: No dedicated status endpoint
- ❌ Onboarding baseline refresh: No dedicated status endpoint

#### Current Behavior
When dispatching flow regeneration tasks:
```python
# flows/views.py:53-60
task = regenerate_system_flows_task.apply_async(...)
cache.set(f'task_household:{task.id}', str(household.id), 3600)
return Response({
    'task_id': task.id,  # ✅ Task ID returned
    'status': 'pending',
    'message': 'System flows regeneration started. Poll /api/v1/scenarios/tasks/{task_id}/ for results.'
    # ❌ But /api/v1/flows/tasks/{task_id}/ doesn't exist!
})
```

#### Impact
- **Confusing API**: Users must use scenarios endpoint for flow tasks
- **Leaky abstraction**: Internal routing exposed to clients
- **Maintenance burden**: Hard to change task routing without breaking clients

#### Fix Required
Create dedicated status endpoints:
```python
# flows/views.py - add new view
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def flow_task_status(request, task_id):
    """Poll status for flow regeneration tasks."""
    # Same implementation as scenarios task status view
    ...
```

---

## LOW SEVERITY ISSUES

### ISSUE #7: Silent Error Handling in Compare Scenarios (LOW)

**Severity**: LOW - Hidden Failures
**Location**: `/home/user/effluent/backend/apps/scenarios/tasks.py:300-302`
**Risk**: Driver analysis failures silently included in results

#### The Problem
```python
# Line 300-302 in scenarios/tasks.py
try:
    driver_analysis = service.compare_multiple(scenarios, ...)
except ValueError as e:
    # Include error but don't fail the whole request
    result['driver_analysis'] = {'error': str(e)}  # ❌ Silent failure
```

If driver analysis fails with a `ValueError`, the error is included in the result but:
1. Task still returns status='completed' (not 'failed')
2. No way to distinguish "analysis not requested" from "analysis failed"
3. User sees partial success, may not notice the error
4. No retry, no logging of stack trace

#### Impact
- **Hidden bugs**: Driver analysis failures go unnoticed
- **Incomplete results**: Users see partial data without realizing it
- **Debugging difficulty**: No error tracking or monitoring

#### Fix Options
1. **Fail the task**: Raise exception so task status = 'failed' and retries occur
2. **Better error structure**: Return `{'driver_analysis': {'status': 'error', 'message': str(e)}}`
3. **Add monitoring**: Log error with `logger.error(exc_info=True)` for stack trace

---

## Additional Findings

### Security Assessment ✅
Recent security fixes (557fd1e, fc22783) correctly implemented:
- ✅ Task ownership validation via cache
- ✅ JWT authentication in task polling
- ✅ Household ID scoping
- ✅ 404 for expired tasks, 403 for unauthorized
- ❌ **Missing**: Onboarding code path (Issue #1)

### No Distributed Locking ❌
- **Finding**: Zero Redis locks or distributed locks in codebase
- **Search**: `grep -r "cache.lock\|redis.lock\|Lock(" backend/apps/` returned no results
- **Impact**: All race conditions (Issues #3, #4) have no protection

### Limited Transaction Usage ❌
- **Finding**: Only 2 files use `@transaction.atomic`:
  - `backend/apps/accounts/views.py`
  - `backend/apps/core/management/commands/seed_sample_data.py`
- **Tasks using transactions**: Reality event processing (inline, not decorator)
- **Tasks NOT using transactions**: All other 10 tasks

### No Idempotency Keys ❌
- **Finding**: No idempotency or deduplication mechanisms
- **Impact**: Duplicate task dispatch can cause duplicate work
- **Example**: User clicks "Refresh Baseline" twice → 2 tasks dispatched

---

## Recommendations

### CRITICAL (Fix Immediately)
1. **[Issue #1]** Add `cache.set()` to onboarding baseline refresh (1 line fix)
2. **[Issue #3]** Add `@transaction.atomic()` to flow regeneration tasks
3. **[Issue #4]** Add distributed locking to reality event processing

### HIGH PRIORITY (Fix This Sprint)
4. **[Issue #2]** Refactor batch stress tests to use `chord` instead of `.get()`
5. **Add distributed locking pattern** - Create reusable decorator for task locking
6. **Add idempotency** - Use idempotency keys for user-initiated tasks

### MEDIUM PRIORITY (Fix Next Sprint)
7. **[Issue #5]** Increase result expiration to 2 hours OR reduce task timeout to 20 min
8. **[Issue #6]** Create dedicated status endpoints for flows and onboarding
9. **Add integration tests** - Test race conditions, concurrent task execution
10. **Add monitoring** - Track task failures, retries, and execution times

### LOW PRIORITY (Technical Debt)
11. **[Issue #7]** Handle driver analysis errors properly (raise exception)
12. **Document patterns** - Create async task development guide
13. **Add task metadata** - Track user_id, request_id for better debugging

---

## File Reference Summary

### Task Definitions
- `/home/user/effluent/backend/apps/scenarios/tasks.py` - 6 tasks
- `/home/user/effluent/backend/apps/flows/tasks.py` - 2 tasks
- `/home/user/effluent/backend/apps/stress_tests/tasks.py` - 3 tasks

### Configuration
- `/home/user/effluent/backend/config/celery.py` - Celery config, Beat schedule
- `/home/user/effluent/backend/config/settings/base.py` - Django settings

### Views with Async Dispatch
- `/home/user/effluent/backend/apps/scenarios/views.py:75-91` - Compute projection
- `/home/user/effluent/backend/apps/scenarios/views.py:179-194` - Refresh baseline
- `/home/user/effluent/backend/apps/scenarios/views.py:782-798` - Compare scenarios
- `/home/user/effluent/backend/apps/scenarios/views.py:1107-1123` - Apply life event
- `/home/user/effluent/backend/apps/flows/views.py:53-60` - Regenerate system flows
- `/home/user/effluent/backend/apps/flows/views.py:88-95` - Recalculate tax withholding
- `/home/user/effluent/backend/apps/stress_tests/views.py:75-91` - Run stress test
- `/home/user/effluent/backend/apps/stress_tests/views.py:156-172` - Batch stress tests

### Critical Code Paths
- `/home/user/effluent/backend/apps/onboarding/services.py:939-941` - ❌ **ISSUE #1**
- `/home/user/effluent/backend/apps/stress_tests/tasks.py:108-109` - ❌ **ISSUE #2**
- `/home/user/effluent/backend/apps/flows/tasks.py:98-105` - ❌ **ISSUE #3**
- `/home/user/effluent/backend/apps/scenarios/reality_events.py:126-131` - ❌ **ISSUE #4**

### Frontend
- `/home/user/effluent/frontend/lib/task-polling.ts` - Task polling utilities
- `/home/user/effluent/frontend/app/(app)/admin/tasks/page.tsx` - Admin tasks UI

---

## Testing Recommendations

### Race Condition Tests
```python
# Test concurrent flow regeneration
def test_concurrent_flow_regeneration():
    household_id = create_test_household()

    # Dispatch 2 tasks simultaneously
    task1 = recalculate_tax_withholding_task.apply_async(
        kwargs={'household_id': household_id}
    )
    task2 = recalculate_tax_withholding_task.apply_async(
        kwargs={'household_id': household_id}
    )

    # Wait for both to complete
    result1 = task1.get()
    result2 = task2.get()

    # Verify no duplicate flows
    flows = RecurringFlow.objects.filter(
        household_id=household_id,
        system_flow_kind='tax_withholding'
    )
    assert flows.count() == expected_count  # Should not have duplicates
```

### Task Ownership Tests
```python
# Test onboarding task ownership (Issue #1)
def test_onboarding_task_ownership():
    service = OnboardingService(household, user)
    service.advance_step(OnboardingStep.COMPLETE)

    # Should have cached task ownership
    task_id = ...  # Get from service
    cached_household = cache.get(f'task_household:{task_id}')
    assert cached_household == str(household.id)
```

---

## Conclusion

The async task implementation has **solid foundations** (Celery, proper configuration, good error handling in most places), but the **rapid addition of async endpoints** has introduced race conditions and missed security checks.

**Most Critical**: Issue #1 breaks user experience for all new signups. This should be fixed immediately.

**Most Dangerous**: Issues #3 and #4 can corrupt financial data through duplicate flows. Add locking ASAP.

**Next Steps**:
1. Fix Issue #1 (onboarding cache) - 5 minutes
2. Add distributed locking decorator - 1 hour
3. Apply locking to Issues #3 and #4 - 30 minutes
4. Fix Issue #2 (batch tasks) - 2 hours
5. Add integration tests - 4 hours

Total estimated fix time: **~8 hours** to address all critical and high severity issues.
