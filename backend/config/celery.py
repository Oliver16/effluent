"""
Celery configuration for Effluent.

This module configures Celery for async task processing including:
- Baseline scenario recalculation
- Scenario projections
- Stress test execution
- Reality change event processing
- System flow regeneration
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

app = Celery('effluent')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Configure Celery
app.conf.update(
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,

    # Task execution settings
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes hard limit
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit

    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,  # Store additional task metadata

    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,

    # Routing
    task_routes={
        'apps.scenarios.tasks.*': {'queue': 'scenarios'},
        'apps.stress_tests.tasks.*': {'queue': 'stress_tests'},
        'apps.flows.tasks.*': {'queue': 'flows'},
    },

    # Beat schedule (for periodic tasks)
    beat_schedule={
        # Process reality change events every 30 seconds
        'process-reality-changes': {
            'task': 'apps.scenarios.tasks.process_reality_changes_task',
            'schedule': 30.0,  # Every 30 seconds
        },
        # Clean up old reality change events daily
        'cleanup-old-reality-events': {
            'task': 'apps.scenarios.tasks.cleanup_old_reality_events_task',
            'schedule': crontab(hour=3, minute=0),  # 3 AM daily
        },
        # Optional: Run data quality checks nightly
        # 'run-data-quality-checks': {
        #     'task': 'apps.metrics.tasks.run_data_quality_checks',
        #     'schedule': crontab(hour=2, minute=0),  # 2 AM daily
        # },
    },
)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery configuration."""
    print(f'Request: {self.request!r}')
