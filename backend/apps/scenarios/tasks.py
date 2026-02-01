"""
Celery tasks for scenarios app.

Handles async execution of expensive scenario operations:
- Baseline scenario refresh
- Scenario projections
- Scenario comparisons
- Reality change event processing
"""
import logging
from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(
    name='apps.scenarios.tasks.process_reality_changes_task',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def process_reality_changes_task(self, batch_size=100):
    """
    Process pending reality change events.

    This task is scheduled to run periodically via Celery Beat.
    It processes pending events and triggers baseline refreshes.

    Args:
        batch_size: Maximum number of events to process

    Returns:
        dict: Processing statistics
    """
    from .reality_events import process_reality_changes

    try:
        logger.info(f"Processing reality changes (batch_size={batch_size})")
        stats = process_reality_changes(batch_size=batch_size)

        logger.info(
            f"Reality changes processed: {stats['events_processed']} events, "
            f"{stats['households_refreshed']} households refreshed"
        )

        return stats
    except Exception as exc:
        logger.error(f"Failed to process reality changes: {exc}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=exc)


@shared_task(
    name='apps.scenarios.tasks.cleanup_old_reality_events_task',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def cleanup_old_reality_events_task(self):
    """
    Clean up old reality change events.

    This task is scheduled to run periodically (daily) via Celery Beat.
    It prevents infinite accumulation of events by:
    1. Deleting old processed/failed events
    2. Marking stuck pending events as failed

    Returns:
        dict: Cleanup statistics
    """
    from .reality_events import cleanup_old_events

    try:
        logger.info("Cleaning up old reality change events")
        stats = cleanup_old_events()

        logger.info(
            f"Reality event cleanup complete: {stats['deleted_count']} events deleted, "
            f"{stats['stuck_events_failed']} stuck events marked as failed"
        )

        return stats
    except Exception as exc:
        logger.error(f"Failed to cleanup reality events: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.scenarios.tasks.refresh_baseline_task',
    bind=True,
    max_retries=2,
    time_limit=1800,  # 30 minute timeout
)
def refresh_baseline_task(self, household_id):
    """
    Refresh the baseline scenario for a household.

    This is an expensive operation that:
    1. Deletes existing baseline projections
    2. Runs ScenarioEngine.compute_projection() for 120 months
    3. Saves projections to database

    Args:
        household_id: UUID of the household

    Returns:
        dict: Refresh statistics
    """
    from apps.core.models import Household
    from .baseline import BaselineScenarioService

    try:
        household = Household.objects.get(id=household_id)
        logger.info(f"Refreshing baseline for household {household_id}")

        baseline = BaselineScenarioService.refresh_baseline(household)

        logger.info(
            f"Baseline refreshed for household {household_id}: "
            f"{baseline.projections.count()} projections created"
        )

        return {
            'household_id': str(household_id),
            'scenario_id': str(baseline.id),
            'projection_count': baseline.projections.count(),
        }
    except Household.DoesNotExist:
        logger.error(f"Household {household_id} not found")
        raise
    except Exception as exc:
        logger.error(
            f"Failed to refresh baseline for household {household_id}: {exc}",
            exc_info=True
        )
        raise self.retry(exc=exc)


@shared_task(
    name='apps.scenarios.tasks.compute_projection_task',
    bind=True,
    max_retries=2,
    time_limit=1800,  # 30 minute timeout
)
def compute_projection_task(self, scenario_id, horizon_months=None, in_memory=False):
    """
    Compute projections for a scenario.

    This is an expensive operation that iterates over months
    applying flows, growth rates, and calculating financial positions.

    Args:
        scenario_id: UUID of the scenario
        horizon_months: Number of months to project (default from scenario)
        in_memory: If True, return projections without saving to DB

    Returns:
        dict: Projection statistics or projection data if in_memory
    """
    from .models import Scenario
    from .services import ScenarioEngine

    try:
        scenario = Scenario.objects.select_related('household').get(id=scenario_id)
        logger.info(f"Computing projection for scenario {scenario_id}")

        engine = ScenarioEngine(scenario)

        if in_memory:
            projections = engine.compute_projection(
                horizon_months=horizon_months,
                in_memory=True
            )
            return {
                'scenario_id': str(scenario_id),
                'projection_count': len(projections),
                'projections': projections,
            }
        else:
            result = engine.compute_projection(horizon_months=horizon_months)

            logger.info(
                f"Projection computed for scenario {scenario_id}: "
                f"{scenario.projections.count()} projections saved"
            )

            return {
                'scenario_id': str(scenario_id),
                'projection_count': scenario.projections.count(),
            }
    except Scenario.DoesNotExist:
        logger.error(f"Scenario {scenario_id} not found")
        raise
    except Exception as exc:
        logger.error(
            f"Failed to compute projection for scenario {scenario_id}: {exc}",
            exc_info=True
        )
        raise self.retry(exc=exc)


@shared_task(
    name='apps.scenarios.tasks.compare_scenarios_task',
    bind=True,
    max_retries=2,
    time_limit=1800,  # 30 minute timeout
)
def compare_scenarios_task(self, household_id, scenario_ids, horizon_months=None, include_drivers=True):
    """
    Compare multiple scenarios side-by-side.

    May trigger re-projection if scenarios don't have enough
    projection months for the requested horizon.

    Args:
        household_id: UUID of the household
        scenario_ids: List of scenario UUIDs to compare
        horizon_months: Comparison horizon (default 120)
        include_drivers: Whether to include driver decomposition (default True)

    Returns:
        dict: Comparison results with projections and optional driver analysis
    """
    from apps.core.models import Household
    from .models import Scenario
    from .serializers import ScenarioSerializer, ScenarioProjectionSerializer
    from .comparison import ScenarioComparisonService
    from .services import ScenarioEngine

    try:
        logger.info(f"Comparing {len(scenario_ids)} scenarios for household {household_id}")

        household = Household.objects.get(id=household_id)

        # Fetch scenarios with ownership validation
        scenarios = list(Scenario.objects.filter(
            household=household,
            id__in=scenario_ids
        ))

        if len(scenarios) != len(scenario_ids):
            raise ValueError('One or more scenarios not found or not accessible')

        # Build comparison results
        comparisons = []
        for scenario in scenarios:
            if horizon_months and scenario.projection_months < horizon_months:
                # Compute extended projections in-memory
                original_months = scenario.projection_months
                scenario.projection_months = horizon_months
                engine = ScenarioEngine(scenario)
                projections = engine.compute_projection(in_memory=True)
                scenario.projection_months = original_months
                projections = projections[:horizon_months]
            else:
                # Use existing projections from DB
                projections = scenario.projections.all()
                if horizon_months:
                    projections = projections[:horizon_months]

            comparisons.append({
                'scenario': ScenarioSerializer(scenario).data,
                'projections': ScenarioProjectionSerializer(projections, many=True).data,
            })

        result = {'results': comparisons}

        # Add driver decomposition if requested and we have multiple scenarios
        if include_drivers and len(scenarios) >= 2:
            service = ScenarioComparisonService(household)
            driver_analysis = service.compare_multiple(
                scenarios,
                horizon_months=horizon_months
            )

            # Convert driver objects to dicts
            result['driver_analysis'] = {
                'baseline_id': driver_analysis['baseline_id'],
                'baseline_name': driver_analysis['baseline_name'],
                'comparisons': [
                    {
                        'scenario_id': c.scenario_id,
                        'horizon_months': c.horizon_months,
                        'baseline_end_nw': float(c.baseline_end_nw),
                        'scenario_end_nw': float(c.scenario_end_nw),
                        'net_worth_delta': float(c.net_worth_delta),
                        'drivers': [
                            {
                                'name': d.name,
                                'amount': float(d.amount),
                                'description': d.description,
                            }
                            for d in c.drivers
                        ],
                        'reconciliation_error_percent': float(c.reconciliation_error_percent),
                    }
                    for c in driver_analysis['comparisons']
                ],
            }

        logger.info(f"Scenario comparison complete: {len(scenario_ids)} scenarios")

        return result
    except Household.DoesNotExist:
        logger.error(f"Household {household_id} not found")
        raise
    except Exception as exc:
        logger.error(f"Failed to compare scenarios: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.scenarios.tasks.apply_life_event_task',
    bind=True,
    max_retries=2,
    time_limit=1800,  # 30 minute timeout
)
def apply_life_event_task(self, template_id, household_id, name, inputs):
    """
    Apply a life event template to create a new scenario.

    This creates a scenario with multiple changes and computes
    the full projection.

    Args:
        template_id: UUID of the life event template
        household_id: UUID of the household
        name: Name for the new scenario
        inputs: Dict of user inputs for the template

    Returns:
        dict: Created scenario info
    """
    from apps.core.models import Household
    from .models import LifeEventTemplate
    from .services import ScenarioEngine

    try:
        household = Household.objects.get(id=household_id)
        template = LifeEventTemplate.objects.get(id=template_id)

        logger.info(
            f"Applying life event '{template.name}' for household {household_id}"
        )

        # Create scenario from template
        scenario = template.create_scenario(household, name, inputs)

        # Compute projection
        engine = ScenarioEngine(scenario)
        engine.compute_projection()

        logger.info(
            f"Life event applied: scenario {scenario.id} created with "
            f"{scenario.projections.count()} projections"
        )

        return {
            'scenario_id': str(scenario.id),
            'scenario_name': scenario.name,
            'projection_count': scenario.projections.count(),
        }
    except (Household.DoesNotExist, LifeEventTemplate.DoesNotExist) as exc:
        logger.error(f"Resource not found: {exc}")
        raise
    except Exception as exc:
        logger.error(f"Failed to apply life event: {exc}", exc_info=True)
        raise self.retry(exc=exc)
