#!/usr/bin/env python
"""
Script to reset Django migration history when migrations are inconsistent.
Run this with: python reset_migrations.py

This script:
1. Deletes all migration records from django_migrations table
2. Then you should run: python manage.py makemigrations
3. Then run: python manage.py migrate --fake-initial
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.db import connection

def reset_migrations():
    """Delete all migration records to allow fresh migration creation."""
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'django_migrations'
            );
        """)
        exists = cursor.fetchone()[0]

        if exists:
            # Delete all migration records for our apps
            apps_to_reset = [
                'core', 'households', 'accounts', 'flows',
                'taxes', 'metrics', 'onboarding', 'scenarios'
            ]
            for app in apps_to_reset:
                cursor.execute(
                    "DELETE FROM django_migrations WHERE app = %s",
                    [app]
                )
                print(f"Cleared migration history for: {app}")

            print("\nMigration history cleared!")
            print("\nNext steps:")
            print("1. Run: python manage.py makemigrations")
            print("2. Run: python manage.py migrate --fake-initial")
        else:
            print("django_migrations table doesn't exist yet.")
            print("Just run: python manage.py makemigrations && python manage.py migrate")

if __name__ == '__main__':
    reset_migrations()
