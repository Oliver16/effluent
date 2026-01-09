"""
Authentication views with HttpOnly cookie support.

These views provide a more secure alternative to the standard
simplejwt token views by using HttpOnly cookies instead of
returning tokens in the response body.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import authenticate

from apps.core.authentication import (
    set_jwt_cookies,
    clear_jwt_cookies,
    get_refresh_token_from_cookie,
    REFRESH_TOKEN_COOKIE
)


class CookieTokenObtainView(APIView):
    """
    Authenticate user and set JWT tokens as HttpOnly cookies.

    POST /api/auth/cookie/login/
    {
        "email": "user@example.com",
        "password": "password123"
    }

    Response:
        200: {"status": "authenticated", "user": {"id": "...", "email": "..."}}
        401: {"error": {"code": "invalid_credentials", "detail": "..."}}

    Cookies set:
        access_token: HttpOnly cookie with access JWT
        refresh_token: HttpOnly cookie with refresh JWT
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {
                    'error': {
                        'code': 'validation_error',
                        'detail': 'Email and password are required.',
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate user
        user = authenticate(request, username=email, password=password)

        if user is None:
            return Response(
                {
                    'error': {
                        'code': 'invalid_credentials',
                        'detail': 'Invalid email or password.',
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {
                    'error': {
                        'code': 'account_disabled',
                        'detail': 'This account has been disabled.',
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Get user's default household
        default_household = user.get_default_household()

        response_data = {
            'status': 'authenticated',
            'user': {
                'id': str(user.id),
                'email': user.email,
                'username': user.username,
            }
        }

        if default_household:
            response_data['default_household'] = {
                'id': str(default_household.id),
                'name': default_household.name,
                'slug': default_household.slug,
            }

        response = Response(response_data, status=status.HTTP_200_OK)

        # Set cookies
        set_jwt_cookies(
            response,
            access_token=str(refresh.access_token),
            refresh_token=str(refresh)
        )

        return response


class CookieTokenRefreshView(APIView):
    """
    Refresh access token using refresh token from cookie.

    POST /api/auth/cookie/refresh/

    No request body needed - uses refresh_token from cookie.

    Response:
        200: {"status": "refreshed"}
        401: {"error": {"code": "invalid_token", "detail": "..."}}

    Cookies set:
        access_token: HttpOnly cookie with new access JWT
        refresh_token: HttpOnly cookie with new refresh JWT (if rotation enabled)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Get refresh token from cookie
        refresh = get_refresh_token_from_cookie(request)

        if refresh is None:
            # Try request body as fallback
            refresh_token = request.data.get('refresh')
            if refresh_token:
                try:
                    refresh = RefreshToken(refresh_token)
                except (TokenError, InvalidToken):
                    pass

        if refresh is None:
            return Response(
                {
                    'error': {
                        'code': 'token_not_found',
                        'detail': 'No valid refresh token found.',
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # Generate new access token
            access_token = str(refresh.access_token)

            # Check if rotation is enabled
            from django.conf import settings
            jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
            rotate_refresh = jwt_settings.get('ROTATE_REFRESH_TOKENS', False)

            if rotate_refresh:
                # Blacklist old token and generate new refresh token
                refresh.blacklist()
                new_refresh = RefreshToken.for_user(refresh.payload.get('user_id'))
                refresh_token = str(new_refresh)
            else:
                refresh_token = str(refresh)

            response = Response({'status': 'refreshed'}, status=status.HTTP_200_OK)

            # Set cookies
            set_jwt_cookies(response, access_token, refresh_token)

            return response

        except (TokenError, InvalidToken) as e:
            return Response(
                {
                    'error': {
                        'code': 'invalid_token',
                        'detail': str(e),
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )


class CookieLogoutView(APIView):
    """
    Logout user by clearing JWT cookies and blacklisting refresh token.

    POST /api/auth/cookie/logout/

    Response:
        200: {"status": "logged_out"}

    Cookies cleared:
        access_token: Removed
        refresh_token: Removed
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Try to blacklist the refresh token
        refresh = get_refresh_token_from_cookie(request)

        if refresh:
            try:
                refresh.blacklist()
            except (TokenError, InvalidToken, AttributeError):
                # Token might already be blacklisted or blacklisting not enabled
                pass

        response = Response({'status': 'logged_out'}, status=status.HTTP_200_OK)

        # Clear cookies
        clear_jwt_cookies(response)

        return response


class CurrentUserView(APIView):
    """
    Get current authenticated user information.

    GET /api/auth/me/

    Response:
        200: {
            "id": "...",
            "email": "...",
            "username": "...",
            "households": [...]
        }
        401: {"error": {...}}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get user's households
        households = []
        for membership in user.household_memberships.select_related('household'):
            households.append({
                'id': str(membership.household.id),
                'name': membership.household.name,
                'slug': membership.household.slug,
                'role': membership.role,
                'is_default': membership.is_default,
            })

        return Response({
            'id': str(user.id),
            'email': user.email,
            'username': user.username,
            'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
            'households': households,
        })
