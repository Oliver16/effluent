"""
Reality Change Event Processor

Handles emitting and processing reality change events that trigger
baseline scenario recomputation.
"""
import logging
from collections import defaultdict

from django.db import transaction
from django.utils import timezone

from apps.core.models import Household
from .models import RealityChangeEvent, RealityChangeEventType, RealityChangeEventStatus
from .baseline import BaselineScenarioService

logger = logging.getLogger(__name__)


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

        try:
            with transaction.atomic():
                # Refresh baseline for this household
                BaselineScenarioService.refresh_baseline(household)

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

    logger.info(
        f"Reality change processing complete: {stats['events_processed']} events processed, "
        f"{stats['households_refreshed']} households refreshed, "
        f"{stats['events_failed']} events failed"
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
