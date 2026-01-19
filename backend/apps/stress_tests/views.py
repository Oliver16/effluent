"""
TASK-15: Stress Test Views

API endpoints for running and managing stress tests.
"""
from dataclasses import asdict
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from celery.result import AsyncResult

from apps.scenarios.throttles import ExpensiveComputationThrottle
from .services import StressTestService
from .templates import get_stress_test_templates, get_stress_test_by_key
from .tasks import run_stress_test_task, run_batch_stress_tests_task, analyze_stress_test_results_task


class StressTestListView(APIView):
    """List available stress tests."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all available stress test templates."""
        household = request.household or request.user.get_default_household()
        if not household:
            return Response(
                {'error': 'No household available. Please select or create a household.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        service = StressTestService(household)
        tests = service.list_available_tests()

        return Response({
            'tests': tests,
            'count': len(tests)
        })


class StressTestRunView(APIView):
    """Run a stress test."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ExpensiveComputationThrottle]

    def post(self, request):
        """Run a stress test against the household's baseline scenario (async)."""
        household = request.household or request.user.get_default_household()
        if not household:
            return Response(
                {'error': 'No household available. Please select or create a household.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        test_key = request.data.get('test_key')
        custom_inputs = request.data.get('inputs', {})
        horizon_months = request.data.get('horizon_months', 60)
        run_async = request.data.get('async', True)  # Default to async

        if not test_key:
            return Response(
                {'error': 'test_key is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        template = get_stress_test_by_key(test_key)
        if not template:
            return Response(
                {'error': f'Unknown stress test: {test_key}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If async, dispatch to Celery
        if run_async:
            task = run_stress_test_task.apply_async(
                kwargs={
                    'household_id': str(household.id),
                    'test_type': test_key,
                    'parameters': custom_inputs or {},
                }
            )

            return Response({
                'task_id': task.id,
                'status': 'pending',
                'test_key': test_key,
                'message': 'Stress test started. Poll /api/stress-tests/status/{task_id}/ for results.'
            }, status=status.HTTP_202_ACCEPTED)

        # Otherwise run synchronously (for backwards compatibility)
        service = StressTestService(household)

        try:
            result = service.run_stress_test(
                test_key=test_key,
                custom_inputs=custom_inputs,
                horizon_months=horizon_months
            )

            return Response({
                'test_key': result.test_key,
                'test_name': result.test_name,
                'scenario_id': result.scenario_id,
                'summary': {
                    'status': result.summary.status,
                    'first_negative_cash_flow_month': result.summary.first_negative_cash_flow_month,
                    'first_liquidity_breach_month': result.summary.first_liquidity_breach_month,
                    'min_liquidity_months': float(result.summary.min_liquidity_months),
                    'min_dscr': float(result.summary.min_dscr),
                    'max_net_worth_drawdown_percent': float(result.summary.max_net_worth_drawdown_percent),
                    'breached_thresholds_count': result.summary.breached_thresholds_count,
                },
                'breaches': result.breaches,
                'monthly_comparison': result.monthly_comparison,
                'computed_at': result.computed_at,
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class StressTestBatchRunView(APIView):
    """Run multiple stress tests in batch."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ExpensiveComputationThrottle]

    def post(self, request):
        """Run multiple stress tests in batch (async by default)."""
        household = request.household or request.user.get_default_household()
        if not household:
            return Response(
                {'error': 'No household available. Please select or create a household.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        test_keys = request.data.get('test_keys', [])
        horizon_months = request.data.get('horizon_months', 60)
        run_async = request.data.get('async', True)  # Default to async

        if not test_keys:
            # Run all tests if none specified
            test_keys = list(get_stress_test_templates().keys())

        # If async, dispatch batch task
        if run_async:
            test_configs = [
                {'test_type': test_key, 'parameters': {}}
                for test_key in test_keys
            ]

            task = run_batch_stress_tests_task.apply_async(
                kwargs={
                    'household_id': str(household.id),
                    'test_configs': test_configs,
                }
            )

            return Response({
                'task_id': task.id,
                'status': 'pending',
                'test_count': len(test_keys),
                'message': 'Batch stress tests started. Poll /api/stress-tests/status/{task_id}/ for results.'
            }, status=status.HTTP_202_ACCEPTED)

        # Otherwise run synchronously
        service = StressTestService(household)
        results = []
        errors = []

        # Refresh baseline once before running all tests
        # This avoids redundant refreshes for each test
        try:
            from apps.scenarios.baseline import BaselineScenarioService
            BaselineScenarioService.get_or_create_baseline(household)
            BaselineScenarioService.refresh_baseline(household)
        except Exception as e:
            return Response(
                {'error': f'Failed to initialize baseline scenario: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        for test_key in test_keys:
            try:
                result = service.run_stress_test(
                    test_key=test_key,
                    horizon_months=horizon_months,
                    skip_baseline_refresh=True  # Already refreshed above
                )
                results.append({
                    'test_key': result.test_key,
                    'test_name': result.test_name,
                    'scenario_id': result.scenario_id,
                    'summary': {
                        'status': result.summary.status,
                        'first_negative_cash_flow_month': result.summary.first_negative_cash_flow_month,
                        'first_liquidity_breach_month': result.summary.first_liquidity_breach_month,
                        'min_liquidity_months': float(result.summary.min_liquidity_months),
                        'min_dscr': float(result.summary.min_dscr),
                        'max_net_worth_drawdown_percent': float(result.summary.max_net_worth_drawdown_percent),
                        'breached_thresholds_count': result.summary.breached_thresholds_count,
                    },
                    'computed_at': result.computed_at,
                })
            except Exception as e:
                # Catch all exceptions to prevent batch failure
                errors.append({
                    'test_key': test_key,
                    'error': str(e)
                })

        # Compute overall resilience score and analysis
        passed_count = sum(1 for r in results if r['summary']['status'] == 'passed')
        warning_count = sum(1 for r in results if r['summary']['status'] == 'warning')
        failed_count = sum(1 for r in results if r['summary']['status'] == 'failed')

        total = len(results)
        if total > 0:
            # Score: passed=100, warning=50, failed=0
            resilience_score = round(
                (passed_count * 100 + warning_count * 50) / total
            )
        else:
            resilience_score = 0

        # Prepare results for analysis task
        analysis_input = []
        for result in results:
            analysis_input.append({
                'test_type': result['test_key'],
                'has_breach': result['summary']['breached_thresholds_count'] > 0,
                'status': result['summary']['status'],
                'breaches': result['summary']['breached_thresholds_count'],
            })

        # Run analysis task
        try:
            analysis = analyze_stress_test_results_task(analysis_input)
        except Exception as e:
            # If analysis fails, just log and continue
            analysis = {'error': str(e)}

        return Response({
            'results': results,
            'errors': errors,
            'summary': {
                'total_tests': total,
                'passed': passed_count,
                'warning': warning_count,
                'failed': failed_count,
                'resilience_score': resilience_score,
            },
            'analysis': analysis,
        })


class StressTestTaskStatusView(APIView):
    """Check status of an async stress test task."""
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        """Get the status and result of a stress test task."""
        task_result = AsyncResult(task_id)

        if task_result.ready():
            if task_result.successful():
                result = task_result.result
                return Response({
                    'task_id': task_id,
                    'status': 'completed',
                    'result': result
                })
            else:
                return Response({
                    'task_id': task_id,
                    'status': 'failed',
                    'error': str(task_result.result)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({
                'task_id': task_id,
                'status': 'pending',
                'state': task_result.state
            })


class StressTestAnalysisView(APIView):
    """Analyze stress test results to identify patterns and risk levels."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Analyze provided stress test results.

        POST /api/stress-tests/analyze/
        {
            "results": [
                {"test_type": "income_loss", "has_breach": true, "status": "failed", "breaches": 3},
                {"test_type": "market_downturn", "has_breach": false, "status": "passed", "breaches": 0},
                ...
            ]
        }

        Returns analysis summary with risk level and breach patterns.
        """
        stress_test_results = request.data.get('results', [])

        if not stress_test_results:
            return Response(
                {'error': 'results array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analysis = analyze_stress_test_results_task(stress_test_results)
            return Response(analysis)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
