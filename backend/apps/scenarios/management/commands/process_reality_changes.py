"""
Management command to process pending reality change events.

This command processes pending RealityChangeEvent records and triggers
baseline scenario refreshes for affected households.

Usage:
    python manage.py process_reality_changes
    python manage.py process_reality_changes --batch-size=50
    python manage.py process_reality_changes --continuous --interval=30
"""
import time
from django.core.management.base import BaseCommand

from apps.scenarios.reality_events import process_reality_changes


class Command(BaseCommand):
    help = 'Process pending reality change events and refresh baseline scenarios'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Maximum number of events to process in one batch (default: 100)'
        )
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Run continuously, processing events as they arrive'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Seconds to wait between batches in continuous mode (default: 60)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without actually processing'
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        continuous = options['continuous']
        interval = options['interval']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run mode - no changes will be made'))
            self._show_pending_events(batch_size)
            return

        if continuous:
            self.stdout.write(self.style.SUCCESS(
                f'Starting continuous processing (batch_size={batch_size}, interval={interval}s)'
            ))
            self._run_continuous(batch_size, interval)
        else:
            self._run_once(batch_size)

    def _run_once(self, batch_size):
        """Process a single batch of events."""
        self.stdout.write(f'Processing up to {batch_size} reality change events...')

        stats = process_reality_changes(batch_size=batch_size)

        self.stdout.write(self.style.SUCCESS(
            f'Processed {stats["events_processed"]} events, '
            f'refreshed {stats["households_refreshed"]} households'
        ))

        if stats['events_failed'] > 0:
            self.stdout.write(self.style.ERROR(
                f'Failed to process {stats["events_failed"]} events'
            ))
            for error in stats['errors']:
                self.stdout.write(self.style.ERROR(f'  - {error}'))

    def _run_continuous(self, batch_size, interval):
        """Run continuously, processing events as they arrive."""
        try:
            while True:
                stats = process_reality_changes(batch_size=batch_size)

                if stats['events_processed'] > 0 or stats['events_failed'] > 0:
                    self.stdout.write(
                        f'Processed {stats["events_processed"]} events, '
                        f'refreshed {stats["households_refreshed"]} households, '
                        f'failed {stats["events_failed"]}'
                    )

                time.sleep(interval)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nStopping continuous processing...'))

    def _show_pending_events(self, batch_size):
        """Show pending events without processing them."""
        from apps.scenarios.models import RealityChangeEvent, RealityChangeEventStatus

        pending = RealityChangeEvent.objects.filter(
            status=RealityChangeEventStatus.PENDING
        ).select_related('household')[:batch_size]

        count = pending.count()
        self.stdout.write(f'Found {count} pending events (showing up to {batch_size}):')

        for event in pending:
            self.stdout.write(
                f'  - {event.event_type} for household {event.household.name} '
                f'at {event.created_at}'
            )
