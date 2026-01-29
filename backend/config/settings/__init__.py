"""
Settings package initialization with production safety checks.
"""
import os
import sys

# SECURITY: Prevent accidental use of development settings in production
# This check ensures that if ENV=production, the settings module cannot be dev settings
env = os.environ.get('ENV', '').lower()
settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', '')

if env == 'production':
    if 'dev' in settings_module or not settings_module.endswith('prod'):
        sys.stderr.write(
            "CRITICAL SECURITY ERROR:\n"
            "Cannot use development settings in production environment.\n"
            f"ENV={env} but DJANGO_SETTINGS_MODULE={settings_module}\n"
            "Set DJANGO_SETTINGS_MODULE=config.settings.prod\n"
        )
        sys.exit(1)
