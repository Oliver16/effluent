"""
Celery tasks for stress tests app.

Handles async execution of stress test runs which are expensive
operations involving:
- Baseline refresh
- Scenario creation with modified parameters
- Full projection computation
- Results analysis and breach detection
"""
import logging
from celery import shared_task, group, chord

logger = logging.getLogger(__name__)


@shared_task(
    name='apps.stress_tests.tasks.run_stress_test_task',
    bind=True,
    max_retries=2,
    time_limit=1800,  # 30 minute timeout
)
def run_stress_test_task(self, household_id, test_type, parameters=None):
    """
    Run a stress test for a household.

    This is an expensive operation that:
    1. Ensures baseline scenario exists and is current
    2. Creates a temporary scenario with modified parameters
    3. Computes full projection (60 months)
    4. Analyzes results for breaches and issues
    5. Cleans up temporary scenario

    Args:
        household_id: UUID of the household
        test_type: Type of stress test (e.g., 'income_loss', 'market_downturn')
        parameters: Dict of stress test parameters (optional)

    Returns:
        dict: Stress test results
    """
    from apps.core.models import Household
    from .services import StressTestService

    try:
        household = Household.objects.get(id=household_id)
        logger.info(
            f"Running {test_type} stress test for household {household_id}"
        )

        service = StressTestService(household)
        results = service.run_stress_test(test_type, parameters or {})

        logger.info(
            f"Stress test complete for household {household_id}: "
            f"{test_type}, breach={results.get('has_breach', False)}"
        )

        return results
    except Household.DoesNotExist:
        logger.error(f"Household {household_id} not found")
        raise
    except Exception as exc:
        logger.error(
            f"Failed to run stress test for household {household_id}: {exc}",
            exc_info=True
        )
        raise self.retry(exc=exc)


@shared_task(
    name='apps.stress_tests.tasks.collect_batch_results_task',
    bind=True,
)
def collect_batch_results_task(self, results, household_id):
    """
    Callback task to collect and aggregate batch stress test results.

    This is called automatically by the chord after all parallel stress tests complete.

    Args:
        results: List of results from individual stress tests
        household_id: UUID of the household

    Returns:
        dict: Aggregated batch results
    """
    logger.info(
        f"Collecting batch stress test results for household {household_id}: "
        f"{len(results)} tests completed"
    )

    # Filter out any None results (from failed tasks)
    valid_results = [r for r in results if r is not None]

    return {
        'household_id': str(household_id),
        'test_count': len(valid_results),
        'results': valid_results,
        'failed_count': len(results) - len(valid_results),
    }


@shared_task(
    name='apps.stress_tests.tasks.run_batch_stress_tests_task',
    bind=True,
    max_retries=1,
)
def run_batch_stress_tests_task(self, household_id, test_configs):
    """
    Run multiple stress tests in parallel using Celery chord.

    This task dispatches a group of parallel stress test tasks and uses a callback
    to collect results. This avoids blocking a worker thread while waiting for
    all subtasks to complete.

    Args:
        household_id: UUID of the household
        test_configs: List of dicts with 'test_type' and 'parameters'

    Returns:
        dict: Task dispatch information with chord task ID
    """
    from apps.core.models import Household

    try:
        household = Household.objects.get(id=household_id)
        logger.info(
            f"Dispatching batch of {len(test_configs)} stress tests "
            f"for household {household_id}"
        )

        # Create a chord: group of parallel tasks + callback
        callback = collect_batch_results_task.s(household_id=str(household_id))
        job = chord(
            run_stress_test_task.s(
                household_id=str(household_id),
                test_type=config['test_type'],
                parameters=config.get('parameters')
            )
            for config in test_configs
        )(callback)

        logger.info(
            f"Batch stress tests dispatched for household {household_id}, "
            f"chord task ID: {job.id}"
        )

        # Return immediately with task ID (non-blocking)
        return {
            'household_id': str(household_id),
            'test_count': len(test_configs),
            'chord_task_id': job.id,
            'status': 'dispatched',
            'message': 'Stress tests running in parallel. Poll task status for results.'
        }
    except Household.DoesNotExist:
        logger.error(f"Household {household_id} not found")
        raise
    except Exception as exc:
        logger.error(
            f"Failed to dispatch batch stress tests for household {household_id}: {exc}",
            exc_info=True
        )
        raise self.retry(exc=exc)


@shared_task(
    name='apps.stress_tests.tasks.analyze_stress_test_results_task',
    bind=True,
)
def analyze_stress_test_results_task(self, stress_test_results):
    """
    Analyze stress test results to identify patterns and risk levels.

    This can be used for post-processing stress test results
    to provide insights and recommendations.

    Args:
        stress_test_results: List of stress test result dicts

    Returns:
        dict: Analysis summary
    """
    try:
        logger.info(f"Analyzing {len(stress_test_results)} stress test results")

        # Count breaches by type
        breach_counts = {}
        total_breaches = 0

        for result in stress_test_results:
            test_type = result.get('test_type')
            has_breach = result.get('has_breach', False)

            if has_breach:
                total_breaches += 1
                breach_counts[test_type] = breach_counts.get(test_type, 0) + 1

        # Calculate risk level
        breach_rate = total_breaches / len(stress_test_results) if stress_test_results else 0

        if breach_rate >= 0.75:
            risk_level = 'high'
        elif breach_rate >= 0.4:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        analysis = {
            'total_tests': len(stress_test_results),
            'total_breaches': total_breaches,
            'breach_rate': round(breach_rate, 2),
            'breach_counts_by_type': breach_counts,
            'risk_level': risk_level,
        }

        logger.info(
            f"Stress test analysis complete: {total_breaches} breaches, "
            f"risk level={risk_level}"
        )

        return analysis
    except Exception as exc:
        logger.error(f"Failed to analyze stress test results: {exc}", exc_info=True)
        raise
