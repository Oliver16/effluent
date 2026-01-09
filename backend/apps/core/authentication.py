"""
Custom authentication classes for secure JWT handling.

This module provides HttpOnly cookie-based JWT authentication as an
alternative to Authorization header-based auth. HttpOnly cookies are
more secure against XSS attacks because JavaScript cannot access them.

Usage:
    Configure in settings.py:
        REST_FRAMEWORK = {
            'DEFAULT_AUTHENTICATION_CLASSES': [
                'apps.core.authentication.CookieJWTAuthentication',
                'rest_framework_simplejwt.authentication.JWTAuthentication',
            ],
        }

    The authentication classes will be tried in order, so Cookie auth
    is preferred, but Authorization header auth still works for API clients.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings


# Cookie names for JWT tokens
ACCESS_TOKEN_COOKIE = 'access_token'
REFRESH_TOKEN_COOKIE = 'refresh_token'

# Cookie settings (can be overridden in Django settings)
COOKIE_SECURE = getattr(settings, 'JWT_COOKIE_SECURE', not settings.DEBUG)
COOKIE_HTTPONLY = getattr(settings, 'JWT_COOKIE_HTTPONLY', True)
COOKIE_SAMESITE = getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
COOKIE_PATH = getattr(settings, 'JWT_COOKIE_PATH', '/')
COOKIE_DOMAIN = getattr(settings, 'JWT_COOKIE_DOMAIN', None)


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT authentication using HttpOnly cookies instead of Authorization header.

    This is more secure against XSS attacks because:
    1. HttpOnly cookies cannot be read by JavaScript
    2. Cookies are automatically included in requests by the browser
    3. Combined with SameSite attribute, provides CSRF protection

    The authentication process:
    1. Check for access_token cookie
    2. Validate the token
    3. Return the user if valid

    Note: This class falls back to header-based auth if no cookie is present,
    allowing the same codebase to support both web (cookie) and API (header) clients.
    """

    def authenticate(self, request):
        """
        Authenticate the request using JWT from cookie or header.

        First checks for the access_token cookie. If not present,
        falls back to the standard Authorization header authentication.

        Args:
            request: The incoming HTTP request.

        Returns:
            Tuple of (user, validated_token) if authenticated, None otherwise.
        """
        # Try cookie authentication first
        raw_token = request.COOKIES.get(ACCESS_TOKEN_COOKIE)

        if raw_token is not None:
            # Validate the token from cookie
            try:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token
            except (InvalidToken, TokenError):
                # Cookie token is invalid, try header auth
                pass

        # Fall back to header-based authentication
        return super().authenticate(request)


def set_jwt_cookies(response, access_token, refresh_token=None):
    """
    Set JWT tokens as HttpOnly cookies on a response.

    This function should be called after successful authentication
    (login, token refresh) to set the JWT cookies.

    Args:
        response: The HTTP response object.
        access_token: The access token string.
        refresh_token: Optional refresh token string.

    Returns:
        The modified response with cookies set.

    Usage:
        response = Response({'status': 'logged_in'})
        refresh = RefreshToken.for_user(user)
        set_jwt_cookies(response, str(refresh.access_token), str(refresh))
        return response
    """
    from django.conf import settings

    # Calculate max_age from SIMPLE_JWT settings
    jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
    access_lifetime = jwt_settings.get('ACCESS_TOKEN_LIFETIME')
    refresh_lifetime = jwt_settings.get('REFRESH_TOKEN_LIFETIME')

    access_max_age = int(access_lifetime.total_seconds()) if access_lifetime else 3600
    refresh_max_age = int(refresh_lifetime.total_seconds()) if refresh_lifetime else 604800

    # Set access token cookie
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=access_max_age,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
        domain=COOKIE_DOMAIN,
    )

    # Set refresh token cookie if provided
    if refresh_token:
        response.set_cookie(
            key=REFRESH_TOKEN_COOKIE,
            value=refresh_token,
            max_age=refresh_max_age,
            httponly=COOKIE_HTTPONLY,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            path=COOKIE_PATH,
            domain=COOKIE_DOMAIN,
        )

    return response


def clear_jwt_cookies(response):
    """
    Clear JWT cookies from a response.

    This should be called on logout to remove the authentication cookies.

    Args:
        response: The HTTP response object.

    Returns:
        The modified response with cookies cleared.

    Usage:
        response = Response({'status': 'logged_out'})
        clear_jwt_cookies(response)
        return response
    """
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE,
        path=COOKIE_PATH,
        domain=COOKIE_DOMAIN,
    )
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path=COOKIE_PATH,
        domain=COOKIE_DOMAIN,
    )

    return response


def get_refresh_token_from_cookie(request):
    """
    Extract the refresh token from the request cookie.

    Args:
        request: The incoming HTTP request.

    Returns:
        RefreshToken instance if valid, None otherwise.

    Usage:
        refresh = get_refresh_token_from_cookie(request)
        if refresh:
            new_access = str(refresh.access_token)
    """
    raw_token = request.COOKIES.get(REFRESH_TOKEN_COOKIE)

    if raw_token is None:
        return None

    try:
        return RefreshToken(raw_token)
    except (InvalidToken, TokenError):
        return None
