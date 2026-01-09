from django.core.management.base import BaseCommand
from apps.decisions.templates import load_default_templates


class Command(BaseCommand):
    help = 'Load default decision templates into the database'

    def handle(self, *args, **options):
        created, updated = load_default_templates()
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully loaded decision templates: {created} created, {updated} updated'
            )
        )
