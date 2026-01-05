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

# Session and CSRF settings
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()

# Cross-Origin-Opener-Policy header (requires HTTPS)
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'

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
