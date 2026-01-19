"""
Monitoring and error tracking utilities for production.

Provides hooks for integrating with external monitoring services (Sentry, Datadog, etc.)
while maintaining clean separation of concerns.
"""
import logging
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorSeverity(str, Enum):
    """Error severity levels for monitoring."""
    CRITICAL = "critical"  # System down, data loss, security breach
    HIGH = "high"          # Major feature broken, performance degraded
    MEDIUM = "medium"      # Feature partially broken, workaround exists
    LOW = "low"            # Minor issue, cosmetic problem


class MonitoringService:
    """
    Central monitoring service for tracking errors, performance, and events.

    This class provides a unified interface for error tracking and monitoring.
    In production, extend this to integrate with services like:
    - Sentry (error tracking)
    - Datadog (APM, metrics)
    - CloudWatch (AWS monitoring)
    - New Relic (performance monitoring)
    """

    @staticmethod
    def track_error(
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
        severity: ErrorSeverity = ErrorSeverity.HIGH,
        tags: Optional[Dict[str, str]] = None
    ):
        """
        Track an error with context for monitoring.

        Args:
            error: The exception that occurred
            context: Additional context (user_id, household_id, etc.)
            severity: Error severity level
            tags: Key-value pairs for filtering/grouping errors

        Example:
            try:
                process_payment(user_id)
            except PaymentError as e:
                MonitoringService.track_error(
                    e,
                    context={'user_id': user_id, 'amount': 100},
                    severity=ErrorSeverity.CRITICAL,
                    tags={'component': 'payments', 'action': 'charge'}
                )
                raise
        """
        # Default implementation: log to standard logger
        # In production, replace with Sentry/Datadog/etc.
        log_message = f"[{severity.value.upper()}] {type(error).__name__}: {str(error)}"
        extra = {
            'severity': severity.value,
            'error_type': type(error).__name__,
            'context': context or {},
            'tags': tags or {},
        }

        if severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, extra=extra, exc_info=True)
        elif severity == ErrorSeverity.HIGH:
            logger.error(log_message, extra=extra, exc_info=True)
        elif severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message, extra=extra, exc_info=True)
        else:
            logger.info(log_message, extra=extra, exc_info=True)

        # TODO: Add Sentry integration
        # try:
        #     import sentry_sdk
        #     with sentry_sdk.push_scope() as scope:
        #         scope.set_level(severity.value)
        #         if context:
        #             scope.set_context("custom", context)
        #         if tags:
        #             for key, value in tags.items():
        #                 scope.set_tag(key, value)
        #         sentry_sdk.capture_exception(error)
        # except ImportError:
        #     pass  # Sentry not installed

    @staticmethod
    def track_event(
        event_name: str,
        properties: Optional[Dict[str, Any]] = None,
        tags: Optional[Dict[str, str]] = None
    ):
        """
        Track a business event for analytics.

        Args:
            event_name: Name of the event (e.g., 'user_signup', 'projection_computed')
            properties: Event properties (user_id, household_id, duration_ms, etc.)
            tags: Key-value pairs for filtering/grouping

        Example:
            MonitoringService.track_event(
                'projection_computed',
                properties={
                    'household_id': household_id,
                    'duration_ms': 1523,
                    'horizon_months': 60
                },
                tags={'component': 'scenarios'}
            )
        """
        logger.info(
            f"Event: {event_name}",
            extra={
                'event_name': event_name,
                'properties': properties or {},
                'tags': tags or {},
            }
        )

        # TODO: Add analytics integration (Segment, Mixpanel, etc.)

    @staticmethod
    def track_performance(
        operation: str,
        duration_ms: float,
        context: Optional[Dict[str, Any]] = None,
        tags: Optional[Dict[str, str]] = None
    ):
        """
        Track performance metrics for an operation.

        Args:
            operation: Name of the operation (e.g., 'flow_generation', 'baseline_refresh')
            duration_ms: Duration in milliseconds
            context: Additional context
            tags: Key-value pairs for filtering/grouping

        Example:
            start = time.time()
            generate_flows(household_id)
            duration = (time.time() - start) * 1000
            MonitoringService.track_performance(
                'flow_generation',
                duration,
                context={'household_id': household_id},
                tags={'success': 'true'}
            )
        """
        logger.info(
            f"Performance: {operation} took {duration_ms:.2f}ms",
            extra={
                'operation': operation,
                'duration_ms': duration_ms,
                'context': context or {},
                'tags': tags or {},
            }
        )

        # TODO: Add APM integration (Datadog, New Relic, etc.)

    @staticmethod
    def alert(
        message: str,
        severity: ErrorSeverity = ErrorSeverity.HIGH,
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Send an alert to monitoring service for immediate attention.

        Use this for critical issues that require immediate response:
        - System outages
        - Data corruption detected
        - Security breaches
        - Payment processing failures

        Args:
            message: Alert message
            severity: Alert severity
            context: Additional context

        Example:
            if flow_count == 0 and income_sources > 0:
                MonitoringService.alert(
                    f"Flow generation produced 0 flows but {income_sources} income sources exist",
                    severity=ErrorSeverity.CRITICAL,
                    context={'household_id': household_id}
                )
        """
        log_message = f"[ALERT-{severity.value.upper()}] {message}"
        extra = {
            'alert': True,
            'severity': severity.value,
            'context': context or {},
        }

        if severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, extra=extra)
        else:
            logger.error(log_message, extra=extra)

        # TODO: Add alerting integration (PagerDuty, Opsgenie, etc.)
        # TODO: Send Slack/Discord webhook for critical alerts


# Convenience decorators for common monitoring patterns

def track_task_performance(task_name: str):
    """
    Decorator to automatically track Celery task performance.

    Example:
        @shared_task
        @track_task_performance('flow_generation')
        def regenerate_flows_task(household_id):
            ...
    """
    import functools
    import time

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            error_occurred = False

            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                error_occurred = True
                # Track error
                MonitoringService.track_error(
                    e,
                    context={'task': task_name, 'args': str(args)[:200]},
                    severity=ErrorSeverity.HIGH,
                    tags={'component': 'celery', 'task': task_name}
                )
                raise
            finally:
                # Track performance
                duration_ms = (time.time() - start_time) * 1000
                MonitoringService.track_performance(
                    task_name,
                    duration_ms,
                    tags={'success': str(not error_occurred)}
                )

        return wrapper
    return decorator
