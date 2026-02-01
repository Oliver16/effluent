"""
Reality Change Event Processor

Handles emitting and processing reality change events that trigger
baseline scenario recomputation.
"""
import logging
from collections import defaultdict
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.core.models import Household
from apps.core.task_utils import get_household_lock, release_household_lock
from apps.flows.services import generate_system_flows_for_household
from .models import RealityChangeEvent, RealityChangeEventType, RealityChangeEventStatus
from .baseline import BaselineScenarioService

logger = logging.getLogger(__name__)

# Configuration constants
MAX_EVENT_AGE_DAYS = 7  # Delete processed/failed events older than this
MAX_PENDING_AGE_HOURS = 24  # Mark pending events as failed if older than this
CLEANUP_BATCH_SIZE = 1000  # Delete this many old events per cleanup run


# Event types that should trigger system flow regeneration before baseline refresh.
# These events indicate changes to income, taxes, or accounts that affect expense flows
# (e.g., tax withholding, liability payments, insurance premiums).
FLOW_AFFECTING_EVENT_TYPES = {
    RealityChangeEventType.TAXES_CHANGED,
    RealityChangeEventType.ACCOUNTS_CHANGED,
    RealityChangeEventType.ONBOARDING_COMPLETED,
}


def emit_reality_change(
    household: Household,
    event_type: str,
    payload: dict | None = None
) -> RealityChangeEvent:
    """
    Emit a reality change event for a household.

    This creates a pending event that will trigger a baseline
    refresh when processed.

    Args:
        household: The household that had a reality change
        event_type: Type of change (from RealityChangeEventType)
        payload: Optional additional data about the change

    Returns:
        The created RealityChangeEvent
    """
    event = RealityChangeEvent.objects.create(
        household=household,
        event_type=event_type,
        payload=payload or {},
        status=RealityChangeEventStatus.PENDING,
    )

    logger.info(
        f"Reality change event emitted: {event_type} for household {household.id}"
    )

    return event


def process_reality_changes(batch_size: int = 100) -> dict:
    """
    Process pending reality change events.

    This function:
    1. Fetches pending events ordered by created_at
    2. Coalesces multiple events per household (only need 1 refresh)
    3. Calls BaselineScenarioService.refresh_baseline for each household
    4. Marks events as processed or failed

    Args:
        batch_size: Maximum number of events to process in one batch

    Returns:
        Dictionary with processing statistics
    """
    stats = {
        'events_processed': 0,
        'events_failed': 0,
        'households_refreshed': 0,
        'errors': [],
    }

    # Fetch pending events
    pending_events = RealityChangeEvent.objects.filter(
        status=RealityChangeEventStatus.PENDING
    ).select_related('household').order_by('created_at')[:batch_size]

    # Group events by household (coalesce multiple events)
    events_by_household = defaultdict(list)
    for event in pending_events:
        events_by_household[event.household_id].append(event)

    # Process each household's events
    for household_id, events in events_by_household.items():
        household = events[0].household
        event_types = [e.event_type for e in events]

        logger.info(
            f"Processing {len(events)} reality change events for household {household_id}: {event_types}"
        )

        # Try to acquire lock for this household
        # Skip if another task is already processing this household's events
        if not get_household_lock(str(household_id), 'reality_processing', timeout=300):
            logger.info(
                f"Household {household_id} already being processed by another task, skipping"
            )
            # Events will be picked up in the next Beat cycle
            continue

        # Detect potential conflicts - multiple events affecting the same account/flow
        # Use last-write-wins semantics: most recent event takes precedence
        _detect_and_log_conflicts(events)

        try:
            with transaction.atomic():
                # Check if any events require system flow regeneration
                needs_flow_regen = any(
                    e.event_type in FLOW_AFFECTING_EVENT_TYPES for e in events
                )

                # Regenerate system flows if needed (e.g., tax withholding expenses)
                # This must happen BEFORE baseline refresh so the projection sees
                # the updated expense flows
                if needs_flow_regen:
                    logger.info(f"Regenerating system flows for household {household_id}")
                    generate_system_flows_for_household(household_id)

                # Refresh baseline for this household
                # Note: baseline_refresh lock is different from reality_processing lock
                result = BaselineScenarioService.refresh_baseline(household, skip_if_locked=True)

                if isinstance(result, dict) and result.get('skipped'):
                    # Baseline refresh was skipped due to lock contention
                    # Do NOT mark events as processed - leave them pending for next run
                    # This ensures events are fully processed (flows + baseline) before marking done
                    logger.warning(
                        f"Baseline refresh skipped for household {household_id} - "
                        f"another baseline refresh is in progress. "
                        f"Events will remain pending for next processing cycle."
                    )
                    stats['events_skipped'] = stats.get('events_skipped', 0) + len(events)
                else:
                    # Baseline refresh completed successfully
                    # Mark all events as processed
                    now = timezone.now()
                    for event in events:
                        event.status = RealityChangeEventStatus.PROCESSED
                        event.processed_at = now
                        event.save(update_fields=['status', 'processed_at'])

                    stats['events_processed'] += len(events)
                    stats['households_refreshed'] += 1

        except Exception as e:
            error_msg = f"Failed to process events for household {household_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            stats['errors'].append(error_msg)

            # Mark events as failed
            for event in events:
                event.status = RealityChangeEventStatus.FAILED
                event.error = str(e)
                event.save(update_fields=['status', 'error'])

            stats['events_failed'] += len(events)

        finally:
            # Always release the lock, even if processing failed
            release_household_lock(str(household_id), 'reality_processing')

    skipped = stats.get('events_skipped', 0)
    skipped_msg = f", {skipped} events deferred" if skipped else ""
    logger.info(
        f"Reality change processing complete: {stats['events_processed']} events processed, "
        f"{stats['households_refreshed']} households refreshed, "
        f"{stats['events_failed']} events failed{skipped_msg}"
    )

    return stats


def emit_accounts_changed(household: Household, account_id: str | None = None) -> RealityChangeEvent:
    """Convenience function to emit an accounts_changed event."""
    payload = {'account_id': account_id} if account_id else {}
    return emit_reality_change(
        household,
        RealityChangeEventType.ACCOUNTS_CHANGED,
        payload
    )


def emit_flows_changed(household: Household, flow_id: str | None = None) -> RealityChangeEvent:
    """Convenience function to emit a flows_changed event."""
    payload = {'flow_id': flow_id} if flow_id else {}
    return emit_reality_change(
        household,
        RealityChangeEventType.FLOWS_CHANGED,
        payload
    )


def emit_taxes_changed(household: Household) -> RealityChangeEvent:
    """Convenience function to emit a taxes_changed event."""
    return emit_reality_change(
        household,
        RealityChangeEventType.TAXES_CHANGED,
    )


def emit_onboarding_completed(household: Household) -> RealityChangeEvent:
    """Convenience function to emit an onboarding_completed event."""
    return emit_reality_change(
        household,
        RealityChangeEventType.ONBOARDING_COMPLETED,
    )


def emit_manual_refresh(household: Household) -> RealityChangeEvent:
    """Convenience function to emit a manual_refresh event."""
    return emit_reality_change(
        household,
        RealityChangeEventType.MANUAL_REFRESH,
    )


def cleanup_old_events() -> dict:
    """
    Clean up old reality change events to prevent infinite accumulation.

    This function:
    1. Deletes processed/failed events older than MAX_EVENT_AGE_DAYS
    2. Marks pending events older than MAX_PENDING_AGE_HOURS as failed (stuck events)

    Should be run periodically (e.g., daily via cron/celery beat).

    Returns:
        Dictionary with cleanup statistics
    """
    stats = {
        'deleted_count': 0,
        'stuck_events_failed': 0,
    }

    now = timezone.now()

    # Delete old processed/failed events
    old_threshold = now - timedelta(days=MAX_EVENT_AGE_DAYS)
    deleted = RealityChangeEvent.objects.filter(
        status__in=[RealityChangeEventStatus.PROCESSED, RealityChangeEventStatus.FAILED],
        created_at__lt=old_threshold
    )[:CLEANUP_BATCH_SIZE].delete()

    stats['deleted_count'] = deleted[0] if deleted else 0

    logger.info(f"Deleted {stats['deleted_count']} old reality change events")

    # Mark stuck pending events as failed
    # If an event has been pending for more than MAX_PENDING_AGE_HOURS, it's likely stuck
    stuck_threshold = now - timedelta(hours=MAX_PENDING_AGE_HOURS)
    stuck_events = RealityChangeEvent.objects.filter(
        status=RealityChangeEventStatus.PENDING,
        created_at__lt=stuck_threshold
    )

    stuck_count = stuck_events.update(
        status=RealityChangeEventStatus.FAILED,
        error='Event stuck in pending status for more than 24 hours - marking as failed',
        processed_at=now
    )

    stats['stuck_events_failed'] = stuck_count

    if stuck_count > 0:
        logger.warning(
            f"Marked {stuck_count} stuck pending events as failed. "
            f"These events were created more than {MAX_PENDING_AGE_HOURS} hours ago."
        )

    logger.info(f"Reality change event cleanup complete: {stats}")

    return stats


def _detect_and_log_conflicts(events: list) -> None:
    """
    Detect and log potential conflicts between reality change events.

    Conflicts occur when multiple pending events affect the same account or flow.
    Uses last-write-wins semantics: the most recent event (by created_at) takes precedence.

    Args:
        events: List of RealityChangeEvent objects for a single household

    Side Effects:
        Logs warnings for detected conflicts
    """
    if len(events) <= 1:
        return

    # Track which accounts/flows are affected by which events
    accounts_affected = defaultdict(list)
    flows_affected = defaultdict(list)

    for event in events:
        payload = event.payload or {}

        # Track account changes
        if event.event_type == RealityChangeEventType.ACCOUNTS_CHANGED:
            account_id = payload.get('account_id')
            if account_id:
                accounts_affected[account_id].append(event)
            else:
                # Event affects all accounts (no specific ID)
                accounts_affected['__ALL__'].append(event)

        # Track flow changes
        elif event.event_type == RealityChangeEventType.FLOWS_CHANGED:
            flow_id = payload.get('flow_id')
            if flow_id:
                flows_affected[flow_id].append(event)
            else:
                # Event affects all flows (no specific ID)
                flows_affected['__ALL__'].append(event)

    # Log conflicts for accounts
    for account_id, conflicting_events in accounts_affected.items():
        if len(conflicting_events) > 1:
            event_times = [e.created_at.isoformat() for e in conflicting_events]
            logger.warning(
                f"Conflict detected: {len(conflicting_events)} events affect account {account_id}. "
                f"Event times: {event_times}. Using last-write-wins (most recent event)."
            )

    # Log conflicts for flows
    for flow_id, conflicting_events in flows_affected.items():
        if len(conflicting_events) > 1:
            event_times = [e.created_at.isoformat() for e in conflicting_events]
            logger.warning(
                f"Conflict detected: {len(conflicting_events)} events affect flow {flow_id}. "
                f"Event times: {event_times}. Using last-write-wins (most recent event)."
            )
