import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.core.models import User, Household, HouseholdMembership


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        email='test@example.com',
        username='testuser',
        password='testpass123'
    )


@pytest.fixture
def other_user(db):
    """Create a second test user (for cross-tenant testing)."""
    return User.objects.create_user(
        email='other@example.com',
        username='otheruser',
        password='testpass123'
    )


@pytest.fixture
def household(db, user):
    """Create a test household with the user as owner."""
    h = Household.objects.create(name='Test Household', slug='test-household')
    HouseholdMembership.objects.create(user=user, household=h, role='owner', is_default=True)
    return h


@pytest.fixture
def other_household(db, other_user):
    """Create a second household (for cross-tenant testing)."""
    h = Household.objects.create(name='Other Household', slug='other-household')
    HouseholdMembership.objects.create(user=other_user, household=h, role='owner', is_default=True)
    return h


@pytest.fixture
def authenticated_client(client, user):
    """Return an authenticated test client."""
    client.force_login(user)
    return client


@pytest.fixture
def api_client():
    """Return a DRF API test client."""
    return APIClient()


@pytest.fixture
def authenticated_api_client(api_client, user):
    """Return an authenticated DRF API test client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def jwt_tokens(user):
    """Generate JWT tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@pytest.fixture
def jwt_authenticated_client(api_client, user, jwt_tokens):
    """Return a JWT authenticated API client."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {jwt_tokens['access']}")
    return api_client


@pytest.fixture
def household_authenticated_client(jwt_authenticated_client, household):
    """Return a JWT authenticated client with household context."""
    jwt_authenticated_client.credentials(
        HTTP_AUTHORIZATION=jwt_authenticated_client._credentials.get('HTTP_AUTHORIZATION', ''),
        HTTP_X_HOUSEHOLD_ID=str(household.id)
    )
    return jwt_authenticated_client


@pytest.fixture
def other_jwt_tokens(other_user):
    """Generate JWT tokens for the other user."""
    refresh = RefreshToken.for_user(other_user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@pytest.fixture
def other_authenticated_client(api_client, other_user, other_jwt_tokens, other_household):
    """Return a JWT authenticated client for the other user with their household context."""
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {other_jwt_tokens['access']}",
        HTTP_X_HOUSEHOLD_ID=str(other_household.id)
    )
    return api_client
