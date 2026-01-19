"""
Throttle classes for scenario engine operations.

These throttles prevent DoS attacks from expensive operations like:
- Scenario projection computation
- Scenario comparison
- Stress test batch operations
- Life event template application
- Baseline scenario refresh
"""
from rest_framework.throttling import UserRateThrottle


class ExpensiveComputationThrottle(UserRateThrottle):
    """
    Throttle for expensive projection computation operations.

    Applied to:
    - compute_projection endpoint
    - compare_scenarios endpoint
    - stress test batch operations

    Rate: 20 requests per hour per user
    """
    scope = 'expensive_computation'


class TemplateApplyThrottle(UserRateThrottle):
    """
    Throttle for life event template application.

    Applied to:
    - apply_life_event endpoint

    Rate: 30 requests per hour per user
    """
    scope = 'template_apply'


class BaselineRefreshThrottle(UserRateThrottle):
    """
    Throttle for baseline scenario refresh operations.

    Applied to:
    - refresh_baseline endpoint

    Rate: 10 requests per hour per user
    """
    scope = 'baseline_refresh'
