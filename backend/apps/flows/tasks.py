"""
Celery tasks for flows app.

Handles async execution of system flow generation which recalculates:
- Tax withholding expenses
- Pre-tax deductions (401k, HSA, etc.)
- Debt payment flows
- Insurance premium flows

All tasks use generate_system_flows_for_household() which includes
distributed locking to prevent concurrent regeneration.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name='apps.flows.tasks.regenerate_system_flows_task',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def regenerate_system_flows_task(self, household_id):
    """
    Regenerate all system-generated flows for a household.

    This deletes and recreates flows for:
    - Tax withholding from income sources
    - Pre-tax deductions (401k, HSA, FSA, etc.)
    - Debt payments based on liability details
    - Insurance premiums

    This is triggered when:
    - Income sources change
    - Tax configuration changes
    - Account details change
    - Pre-tax deductions are modified

    Locking is handled by generate_system_flows_for_household() itself,
    which uses distributed locking to prevent concurrent regeneration.

    Args:
        household_id: UUID of the household

    Returns:
        dict: Regeneration statistics (or {'skipped': True} if lock held)
    """
    from .services import generate_system_flows_for_household

    try:
        logger.info(f"Regenerating system flows for household {household_id}")

        result = generate_system_flows_for_household(household_id)

        logger.info(
            f"System flows regenerated for household {household_id}: "
            f"{result.get('flows_created', 0)} flows created"
        )

        return {
            'household_id': str(household_id),
            'flows_created': result.get('flows_created', 0),
            'flows_deleted': result.get('flows_deleted', 0),
        }
    except Exception as exc:
        logger.error(
            f"Failed to regenerate system flows for household {household_id}: {exc}",
            exc_info=True
        )
        raise self.retry(exc=exc)


@shared_task(
    name='apps.flows.tasks.recalculate_tax_withholding_task',
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def recalculate_tax_withholding_task(self, household_id):
    """
    Recalculate tax withholding flows for all income sources.

    This is a subset of system flow regeneration focused only
    on tax-related flows. Useful when only tax configuration changes.

    Transaction ensures atomicity of delete+create operations.
    Note: This regenerates ALL flows, not just tax withholding, because
    generate_system_flows_for_household() handles all flows together.

    Args:
        household_id: UUID of the household

    Returns:
        dict: Recalculation statistics (or {'skipped': True} if lock held)
    """
    from .services import generate_system_flows_for_household

    try:
        logger.info(f"Recalculating tax withholding for household {household_id}")

        # Note: We regenerate ALL flows, not just tax withholding, because:
        # 1. Tax withholding affects net pay deposits
        # 2. Prevents partial/inconsistent state
        # 3. Centralized locking in generate_system_flows_for_household()
        result = generate_system_flows_for_household(household_id)

        if result.get('skipped'):
            logger.info(f"Tax withholding recalculation skipped for household {household_id}: {result.get('reason')}")
            return result

        logger.info(f"Tax withholding recalculated for household {household_id}")

        return {
            'household_id': str(household_id),
            'flows_regenerated': True,
        }
    except Exception as exc:
        logger.error(
            f"Failed to recalculate tax withholding for household {household_id}: {exc}",
            exc_info=True
        )
        raise self.retry(exc=exc)
