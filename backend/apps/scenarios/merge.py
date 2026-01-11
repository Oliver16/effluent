"""
Scenario Merge Service.

Provides functionality to merge changes from one scenario into another,
enabling "branch-like" scenario composition where multiple life events
can be combined into a single scenario.
"""
import hashlib
import json
from datetime import date
from typing import Optional

from django.db import transaction
from django.db.models import Max

from apps.core.models import Household
from .models import Scenario, ScenarioChange
from .services import ScenarioEngine


def _change_signature(change: ScenarioChange) -> str:
    """
    Generate a stable signature for deduplication.

    Two changes with the same signature are considered duplicates
    and can be skipped during merge. The signature excludes name
    and description so renamed changes still dedupe.
    """
    sig_data = {
        'change_type': change.change_type,
        'effective_date': str(change.effective_date) if change.effective_date else None,
        'end_date': str(change.end_date) if change.end_date else None,
        'source_flow_id': str(change.source_flow_id) if change.source_flow_id else None,
        'source_account_id': str(change.source_account_id) if change.source_account_id else None,
        'parameters': json.dumps(change.parameters or {}, sort_keys=True),
    }
    return hashlib.md5(json.dumps(sig_data, sort_keys=True).encode()).hexdigest()


def _date_ranges_overlap(
    start1: Optional[date],
    end1: Optional[date],
    start2: Optional[date],
    end2: Optional[date]
) -> bool:
    """Check if two date ranges overlap."""
    # Handle None dates
    if start1 is None:
        start1 = date.min
    if start2 is None:
        start2 = date.min
    # Treat None end_date as infinite
    if end1 is None:
        end1 = date.max
    if end2 is None:
        end2 = date.max
    return start1 <= end2 and start2 <= end1


def _detect_conflicts(
    source_changes: list[ScenarioChange],
    target_changes: list[ScenarioChange]
) -> list[str]:
    """
    Detect likely conflicts between source and target changes.

    Returns a list of warning messages for potential conflicts.
    This doesn't block the merge but alerts the user to review.
    """
    warnings = []

    for src in source_changes:
        for tgt in target_changes:
            # Check for same change type targeting same flow/account
            same_type = src.change_type == tgt.change_type
            same_flow = src.source_flow_id and src.source_flow_id == tgt.source_flow_id
            same_account = src.source_account_id and src.source_account_id == tgt.source_account_id

            if same_type and (same_flow or same_account):
                if _date_ranges_overlap(
                    src.effective_date, src.end_date,
                    tgt.effective_date, tgt.end_date
                ):
                    target_desc = src.source_flow_id or src.source_account_id or src.name
                    warnings.append(
                        f"Two {src.change_type} changes target '{target_desc}' "
                        f"with overlapping effective dates"
                    )

    return warnings


def merge_scenarios(
    household: Household,
    source: Scenario,
    target: Scenario,
    dedupe: bool = True,
    recompute: bool = True,
    sync_horizon: bool = True,
) -> dict:
    """
    Merge changes from source scenario into target scenario.

    This is the core "combine scenarios" operation that allows users
    to compose multiple life events together. Think of it like merging
    a branch in version control.

    Args:
        household: Household for ownership validation
        source: Scenario to copy changes from
        target: Scenario to copy changes into
        dedupe: Skip duplicate changes based on signature
        recompute: Recompute target projections after merge
        sync_horizon: Upgrade target projection_months to match source if lower

    Returns:
        Dict with merge results including:
        - status: 'merged'
        - target_scenario_id, source_scenario_id
        - changes_copied, changes_skipped counts
        - copied: list of copied change details
        - skipped: list of skipped changes with reasons
        - warnings: list of potential conflict warnings
        - projection_recomputed: bool
        - horizon_synced: bool (if target horizon was upgraded)

    Raises:
        ValueError: If validation fails (ownership, self-merge, archived target)
    """
    # Validation
    if source.household_id != household.id:
        raise ValueError("Source scenario does not belong to household")
    if target.household_id != household.id:
        raise ValueError("Target scenario does not belong to household")
    if source.id == target.id:
        raise ValueError("Cannot merge scenario into itself")
    if target.is_baseline:
        raise ValueError("Cannot merge into baseline scenario. Use 'Adopt' to apply scenario changes as real flows.")
    if target.is_archived:
        raise ValueError("Cannot merge into archived scenario")

    # Sync projection horizon if requested
    horizon_synced = False
    if sync_horizon and source.projection_months > target.projection_months:
        target.projection_months = source.projection_months
        target.save(update_fields=['projection_months'])
        horizon_synced = True

    # Get source changes (only direct, not inherited from parent)
    source_changes = list(source.changes.filter(is_enabled=True).order_by('display_order'))
    target_changes = list(target.changes.filter(is_enabled=True))

    # Detect conflicts (warnings, not blocking)
    warnings = _detect_conflicts(source_changes, target_changes)

    # Build target signature set for deduplication
    target_signatures = set()
    if dedupe:
        target_signatures = {_change_signature(c) for c in target_changes}

    # Determine starting display_order
    max_order = target.changes.aggregate(Max('display_order'))['display_order__max'] or 0
    next_order = max_order + 1

    changes_copied = []
    changes_skipped = []

    with transaction.atomic():
        for src_change in source_changes:
            sig = _change_signature(src_change)

            # Check for duplicate
            if dedupe and sig in target_signatures:
                changes_skipped.append({
                    'source_change_id': str(src_change.id),
                    'name': src_change.name,
                    'reason': 'duplicate'
                })
                continue

            # Create new change in target
            new_change = ScenarioChange.objects.create(
                scenario=target,
                change_type=src_change.change_type,
                name=src_change.name,
                description=src_change.description,
                effective_date=src_change.effective_date,
                end_date=src_change.end_date,
                parameters=src_change.parameters,
                source_flow_id=src_change.source_flow_id,
                source_account_id=src_change.source_account_id,
                display_order=next_order,
                is_enabled=True,
            )

            changes_copied.append({
                'source_change_id': str(src_change.id),
                'new_change_id': str(new_change.id),
                'name': new_change.name,
                'change_type': new_change.change_type,
            })

            next_order += 1
            target_signatures.add(sig)  # Prevent duplicates within source

        # Recompute projections
        projection_recomputed = False
        if recompute and changes_copied:
            target.projections.all().delete()
            ScenarioEngine(target).compute_projection()
            projection_recomputed = True

    return {
        'status': 'merged',
        'target_scenario_id': str(target.id),
        'source_scenario_id': str(source.id),
        'changes_copied': len(changes_copied),
        'changes_skipped': len(changes_skipped),
        'copied': changes_copied,
        'skipped': changes_skipped,
        'warnings': warnings,
        'projection_recomputed': projection_recomputed,
        'horizon_synced': horizon_synced,
    }


def get_next_display_order(scenario: Scenario) -> int:
    """Get the next available display_order for a scenario."""
    max_order = scenario.changes.aggregate(Max('display_order'))['display_order__max']
    return (max_order or 0) + 1
