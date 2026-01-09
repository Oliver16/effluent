import os

from .base import *

DEBUG = False

def _parse_env_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(',') if item.strip()]


# Parse ALLOWED_HOSTS, filtering out empty strings
ALLOWED_HOSTS = _parse_env_list(os.environ.get('ALLOWED_HOSTS', ''))

# Fallback if empty
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['localhost']

# Parse CORS origins, filtering out empty strings
CORS_ALLOWED_ORIGINS = _parse_env_list(os.environ.get('CORS_ORIGINS', ''))

# Security settings for production
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# If behind a reverse proxy (like Traefik), trust the X-Forwarded-* headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# HTTPS/SSL redirect (enable when not behind proxy that handles TLS termination)
# Set SECURE_SSL_REDIRECT_ENABLED=true in environment to enable
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT_ENABLED', 'false').lower() == 'true'

# HSTS (HTTP Strict Transport Security)
# Tells browsers to only access site over HTTPS
_enable_hsts = os.environ.get('SECURE_COOKIES', 'false').lower() == 'true'
SECURE_HSTS_SECONDS = 31536000 if _enable_hsts else 0  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = _enable_hsts
SECURE_HSTS_PRELOAD = _enable_hsts

# Session and CSRF settings
# Enable secure cookies only when TLS is terminated upstream (set SECURE_COOKIES=true)
_secure_cookies = os.environ.get('SECURE_COOKIES', 'false').lower() == 'true'
SESSION_COOKIE_SECURE = _secure_cookies
CSRF_COOKIE_SECURE = _secure_cookies
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()

# Add the backend API domain itself for admin login CSRF validation
# When submitting the admin form, the Origin header is from the admin domain
for host in ALLOWED_HOSTS:
    if host and host not in ('localhost', '127.0.0.1') and not host.startswith('192.168.'):
        https_origin = f'https://{host}'
        if https_origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(https_origin)

# Cross-Origin-Opener-Policy header (requires HTTPS, disabled when not using secure cookies)
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin' if _secure_cookies else None

# WhiteNoise for static file serving with compression
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

# Logging for debugging deployment issues
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
