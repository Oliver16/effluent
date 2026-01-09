import pytest
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
def household(db, user):
    """Create a test household with the user as owner."""
    h = Household.objects.create(name='Test Household', slug='test-household')
    HouseholdMembership.objects.create(user=user, household=h, role='owner')
    return h


@pytest.fixture
def authenticated_client(client, user):
    """Return an authenticated test client."""
    client.force_login(user)
    return client
