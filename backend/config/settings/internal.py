"""
Internal network settings - for use behind HTTP-only reverse proxy.

Use this when running on an internal network without HTTPS/SSL.
Set DJANGO_SETTINGS_MODULE=config.settings.internal in your compose file.
"""
from .prod import *

# Disable secure cookies for HTTP-only internal access
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Don't require HTTPS
SECURE_SSL_REDIRECT = False

# Don't expect X-Forwarded-Proto: https
SECURE_PROXY_SSL_HEADER = None
