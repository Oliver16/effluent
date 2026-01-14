"""
Health check endpoints for monitoring system status.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from celery import current_app
from django.conf import settings


class CeleryHealthCheckView(APIView):
    """
    Health check endpoint for Celery workers.

    Returns 200 if Celery workers are responsive, 503 if not.
    """
    permission_classes = []  # Public endpoint for monitoring

    def get(self, request):
        """Check if Celery workers are running and responsive."""
        try:
            # Inspect active workers
            inspect = current_app.control.inspect()

            # Try to ping workers (timeout after 1 second)
            active_workers = inspect.ping(timeout=1.0)

            if not active_workers:
                return Response({
                    'status': 'unhealthy',
                    'celery': {
                        'workers': 0,
                        'status': 'no workers responding'
                    },
                    'broker': settings.CELERY_BROKER_URL.split('@')[-1]  # Hide credentials
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Count active workers
            worker_count = len(active_workers)
            worker_names = list(active_workers.keys())

            return Response({
                'status': 'healthy',
                'celery': {
                    'workers': worker_count,
                    'worker_names': worker_names,
                    'status': 'workers responding'
                },
                'broker': settings.CELERY_BROKER_URL.split('@')[-1]  # Hide credentials
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'status': 'error',
                'celery': {
                    'workers': 0,
                    'status': 'error checking workers',
                    'error': str(e)
                }
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class HealthCheckView(APIView):
    """
    General health check endpoint.

    Checks database, Celery, and other critical services.
    """
    permission_classes = []  # Public endpoint for monitoring

    def get(self, request):
        """Perform health checks on all services."""
        health_status = {
            'status': 'healthy',
            'services': {}
        }

        # Check database
        try:
            from django.db import connection
            connection.ensure_connection()
            health_status['services']['database'] = {
                'status': 'healthy',
                'backend': connection.settings_dict['ENGINE'].split('.')[-1]
            }
        except Exception as e:
            health_status['status'] = 'degraded'
            health_status['services']['database'] = {
                'status': 'unhealthy',
                'error': str(e)
            }

        # Check Celery workers
        try:
            inspect = current_app.control.inspect()
            active_workers = inspect.ping(timeout=1.0)

            if active_workers:
                health_status['services']['celery'] = {
                    'status': 'healthy',
                    'workers': len(active_workers)
                }
            else:
                health_status['status'] = 'degraded'
                health_status['services']['celery'] = {
                    'status': 'unhealthy',
                    'workers': 0
                }
        except Exception as e:
            health_status['status'] = 'degraded'
            health_status['services']['celery'] = {
                'status': 'error',
                'error': str(e)
            }

        # Determine HTTP status code
        if health_status['status'] == 'healthy':
            http_status = status.HTTP_200_OK
        else:
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(health_status, status=http_status)
