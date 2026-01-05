"""
Internal development settings for running behind plain HTTP (no TLS).

Use this when developing internally without HAProxy/TLS termination.
Set DJANGO_SETTINGS_MODULE=config.settings.internal in your compose file.
"""
from .prod import *

# Disable secure cookies for plain HTTP internal access
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Disable COOP header which requires HTTPS
SECURE_CROSS_ORIGIN_OPENER_POLICY = None

# Ensure no SSL redirect
SECURE_SSL_REDIRECT = False
