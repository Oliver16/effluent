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
from celery import shared_task

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
        dict: Stress test results in camelCase format for frontend compatibility
    """
    from apps.core.models import Household
    from .services import StressTestService

    try:
        household = Household.objects.get(id=household_id)
        logger.info(
            f"Running {test_type} stress test for household {household_id}"
        )

        service = StressTestService(household)
        result = service.run_stress_test(
            test_key=test_type,
            custom_inputs=parameters or {}
        )

        logger.info(
            f"Stress test complete for household {household_id}: "
            f"{test_type}, status={result.summary.status}"
        )

        # Return in camelCase format for frontend compatibility
        return {
            'testKey': result.test_key,
            'testName': result.test_name,
            'scenarioId': result.scenario_id,
            'summary': {
                'status': result.summary.status,
                'firstNegativeCashFlowMonth': result.summary.first_negative_cash_flow_month,
                'firstLiquidityBreachMonth': result.summary.first_liquidity_breach_month,
                'minLiquidityMonths': float(result.summary.min_liquidity_months),
                'minDscr': float(result.summary.min_dscr),
                'maxNetWorthDrawdownPercent': float(result.summary.max_net_worth_drawdown_percent),
                'breachedThresholdsCount': result.summary.breached_thresholds_count,
            },
            'hasBreach': result.summary.breached_thresholds_count > 0,
            'breaches': result.breaches,
            'monthlyComparison': result.monthly_comparison,
            'computedAt': result.computed_at,
        }
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
    time_limit=3600,  # 1 hour timeout for batch (multiple tests)
)
def run_batch_stress_tests_task(self, household_id, test_configs):
    """
    Run multiple stress tests sequentially within a single task.

    This task runs tests one by one and returns the aggregated results.
    While sequential, this still runs asynchronously from the frontend's
    perspective and avoids the complexity of chord-based result aggregation.

    Args:
        household_id: UUID of the household
        test_configs: List of dicts with 'test_type' and 'parameters'

    Returns:
        dict: Complete batch results with summary and individual test results
    """
    from apps.core.models import Household
    from apps.scenarios.baseline import BaselineScenarioService
    from .services import StressTestService

    try:
        household = Household.objects.get(id=household_id)
        logger.info(
            f"Running batch of {len(test_configs)} stress tests "
            f"for household {household_id}"
        )

        # Refresh baseline once before running all tests
        try:
            BaselineScenarioService.get_or_create_baseline(household)
            BaselineScenarioService.refresh_baseline(household)
        except Exception as e:
            logger.error(f"Failed to initialize baseline: {e}")
            return {
                'error': f'Failed to initialize baseline scenario: {str(e)}',
                'results': [],
                'errors': [],
                'summary': {
                    'totalTests': 0,
                    'passed': 0,
                    'warning': 0,
                    'failed': 0,
                    'resilienceScore': 0,
                }
            }

        service = StressTestService(household)
        results = []
        errors = []

        for config in test_configs:
            test_type = config['test_type']
            parameters = config.get('parameters', {})

            try:
                result = service.run_stress_test(
                    test_key=test_type,
                    custom_inputs=parameters,
                    skip_baseline_refresh=True  # Already refreshed above
                )
                results.append({
                    'testKey': result.test_key,
                    'testName': result.test_name,
                    'scenarioId': result.scenario_id,
                    'summary': {
                        'status': result.summary.status,
                        'firstNegativeCashFlowMonth': result.summary.first_negative_cash_flow_month,
                        'firstLiquidityBreachMonth': result.summary.first_liquidity_breach_month,
                        'minLiquidityMonths': float(result.summary.min_liquidity_months),
                        'minDscr': float(result.summary.min_dscr),
                        'maxNetWorthDrawdownPercent': float(result.summary.max_net_worth_drawdown_percent),
                        'breachedThresholdsCount': result.summary.breached_thresholds_count,
                    },
                    'computedAt': result.computed_at,
                })
                logger.info(f"Completed stress test: {test_type}")
            except Exception as e:
                logger.error(f"Stress test {test_type} failed: {e}")
                errors.append({
                    'testKey': test_type,
                    'error': str(e)
                })

        # Compute overall summary
        passed_count = sum(1 for r in results if r['summary']['status'] == 'passed')
        warning_count = sum(1 for r in results if r['summary']['status'] == 'warning')
        failed_count = sum(1 for r in results if r['summary']['status'] == 'failed')
        total = len(results)

        if total > 0:
            resilience_score = round((passed_count * 100 + warning_count * 50) / total)
        else:
            resilience_score = 0

        logger.info(
            f"Batch stress tests complete for household {household_id}: "
            f"{passed_count} passed, {warning_count} warning, {failed_count} failed"
        )

        return {
            'results': results,
            'errors': errors,
            'summary': {
                'totalTests': total,
                'passed': passed_count,
                'warning': warning_count,
                'failed': failed_count,
                'resilienceScore': resilience_score,
            }
        }
    except Household.DoesNotExist:
        logger.error(f"Household {household_id} not found")
        raise
    except Exception as exc:
        logger.error(
            f"Failed to run batch stress tests for household {household_id}: {exc}",
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
