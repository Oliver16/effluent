"""
TASK-15: Stress Test Views

API endpoints for running and managing stress tests.
"""
from dataclasses import asdict
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import StressTestService
from .templates import get_stress_test_templates, get_stress_test_by_key


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

    def post(self, request):
        """Run a stress test against the household's baseline scenario."""
        household = request.household or request.user.get_default_household()
        if not household:
            return Response(
                {'error': 'No household available. Please select or create a household.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        test_key = request.data.get('test_key')
        custom_inputs = request.data.get('inputs', {})
        horizon_months = request.data.get('horizon_months', 60)

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

    def post(self, request):
        """Run multiple stress tests and return combined results."""
        household = request.household or request.user.get_default_household()
        if not household:
            return Response(
                {'error': 'No household available. Please select or create a household.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        test_keys = request.data.get('test_keys', [])
        horizon_months = request.data.get('horizon_months', 60)

        if not test_keys:
            # Run all tests if none specified
            test_keys = list(get_stress_test_templates().keys())

        service = StressTestService(household)
        results = []
        errors = []

        for test_key in test_keys:
            try:
                result = service.run_stress_test(
                    test_key=test_key,
                    horizon_months=horizon_months
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
            except ValueError as e:
                errors.append({
                    'test_key': test_key,
                    'error': str(e)
                })

        # Compute overall resilience score
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

        return Response({
            'results': results,
            'errors': errors,
            'summary': {
                'total_tests': total,
                'passed': passed_count,
                'warning': warning_count,
                'failed': failed_count,
                'resilience_score': resilience_score,
            }
        })
