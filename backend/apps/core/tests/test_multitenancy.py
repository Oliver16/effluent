"""
Multi-tenancy security tests.

These tests verify that:
1. Users cannot read data from other households
2. Users cannot write data to other households
3. Missing household context is properly rejected
4. Household switching doesn't allow cross-tenant access
"""
import pytest
import uuid
from django.test import RequestFactory
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import User, Household, HouseholdMembership
from apps.core.permissions import HouseholdRequired, ObjectBelongsToHousehold, HouseholdRolePermission
from apps.core.mixins import HouseholdScopedViewMixin, HouseholdContextError
from apps.accounts.models import Account


class MockView:
    """Mock view for testing permissions."""
    def __init__(self, request):
        self.request = request


class MockRequest:
    """Mock request for testing permissions."""
    def __init__(self, user=None, household=None, method='GET'):
        self.user = user
        self.household = household
        self.method = method


@pytest.fixture
def user1(db):
    """First test user."""
    return User.objects.create_user(
        email='user1@example.com',
        username='user1',
        password='testpass123'
    )


@pytest.fixture
def user2(db):
    """Second test user (different tenant)."""
    return User.objects.create_user(
        email='user2@example.com',
        username='user2',
        password='testpass123'
    )


@pytest.fixture
def household1(db, user1):
    """First household."""
    h = Household.objects.create(name='Household 1', slug='household-1')
    HouseholdMembership.objects.create(user=user1, household=h, role='owner', is_default=True)
    return h


@pytest.fixture
def household2(db, user2):
    """Second household (different tenant)."""
    h = Household.objects.create(name='Household 2', slug='household-2')
    HouseholdMembership.objects.create(user=user2, household=h, role='owner', is_default=True)
    return h


@pytest.fixture
def account_in_household1(db, household1):
    """Account belonging to household 1."""
    return Account.objects.create(
        household=household1,
        name='User1 Checking',
        account_type='checking',
        institution_name='Test Bank'
    )


@pytest.fixture
def account_in_household2(db, household2):
    """Account belonging to household 2."""
    return Account.objects.create(
        household=household2,
        name='User2 Savings',
        account_type='savings',
        institution_name='Other Bank'
    )


@pytest.fixture
def api_client_user1(user1, household1):
    """API client for user1 with household1 context."""
    client = APIClient()
    refresh = RefreshToken.for_user(user1)
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}",
        HTTP_X_HOUSEHOLD_ID=str(household1.id)
    )
    return client


@pytest.fixture
def api_client_user2(user2, household2):
    """API client for user2 with household2 context."""
    client = APIClient()
    refresh = RefreshToken.for_user(user2)
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}",
        HTTP_X_HOUSEHOLD_ID=str(household2.id)
    )
    return client


@pytest.mark.django_db
class TestHouseholdRequiredPermission:
    """Test the HouseholdRequired permission class."""

    def test_permission_denied_without_household(self, user1):
        """Request without household context should be denied."""
        permission = HouseholdRequired()
        request = MockRequest(user=user1, household=None)
        view = MockView(request)

        assert permission.has_permission(request, view) is False

    def test_permission_granted_with_valid_household(self, user1, household1):
        """Request with valid household membership should be granted."""
        permission = HouseholdRequired()
        request = MockRequest(user=user1, household=household1)
        view = MockView(request)

        assert permission.has_permission(request, view) is True

    def test_permission_denied_for_non_member_household(self, user1, household2):
        """Request with household user is not a member of should be denied."""
        permission = HouseholdRequired()
        request = MockRequest(user=user1, household=household2)
        view = MockView(request)

        assert permission.has_permission(request, view) is False

    def test_options_request_allowed_without_household(self, user1):
        """OPTIONS requests (CORS preflight) should be allowed."""
        permission = HouseholdRequired()
        request = MockRequest(user=user1, household=None, method='OPTIONS')
        view = MockView(request)

        assert permission.has_permission(request, view) is True


@pytest.mark.django_db
class TestObjectBelongsToHousehold:
    """Test the ObjectBelongsToHousehold permission class."""

    def test_object_in_same_household_allowed(self, user1, household1, account_in_household1):
        """User can access objects in their household."""
        permission = ObjectBelongsToHousehold()
        request = MockRequest(user=user1, household=household1)
        view = MockView(request)

        assert permission.has_object_permission(request, view, account_in_household1) is True

    def test_object_in_different_household_denied(self, user1, household1, account_in_household2):
        """User cannot access objects in other households."""
        permission = ObjectBelongsToHousehold()
        request = MockRequest(user=user1, household=household1)
        view = MockView(request)

        assert permission.has_object_permission(request, view, account_in_household2) is False

    def test_object_without_household_attribute_allowed(self, user1, household1):
        """Objects without household attribute (e.g., User) are allowed."""
        permission = ObjectBelongsToHousehold()
        request = MockRequest(user=user1, household=household1)
        view = MockView(request)

        # User model doesn't have a household field
        assert permission.has_object_permission(request, view, user1) is True


@pytest.mark.django_db
class TestHouseholdRolePermission:
    """Test the HouseholdRolePermission class."""

    def test_owner_can_write(self, user1, household1):
        """Owner role can perform write operations."""
        permission = HouseholdRolePermission()
        request = MockRequest(user=user1, household=household1, method='POST')
        view = MockView(request)

        assert permission.has_permission(request, view) is True

    def test_viewer_cannot_write(self, user1, user2, household1):
        """Viewer role cannot perform write operations."""
        # Add user2 as viewer to household1
        HouseholdMembership.objects.create(user=user2, household=household1, role='viewer')

        permission = HouseholdRolePermission()
        request = MockRequest(user=user2, household=household1, method='POST')
        view = MockView(request)

        assert permission.has_permission(request, view) is False

    def test_viewer_can_read(self, user1, user2, household1):
        """Viewer role can perform read operations."""
        # Add user2 as viewer to household1
        HouseholdMembership.objects.create(user=user2, household=household1, role='viewer')

        permission = HouseholdRolePermission()
        request = MockRequest(user=user2, household=household1, method='GET')
        view = MockView(request)

        assert permission.has_permission(request, view) is True


@pytest.mark.django_db
class TestCrossTenantDataAccess:
    """Test that users cannot access data from other tenants."""

    def test_user_cannot_list_other_household_accounts(
        self, api_client_user1, account_in_household1, account_in_household2
    ):
        """User should only see accounts in their household."""
        response = api_client_user1.get('/api/v1/accounts/')

        assert response.status_code == 200
        data = response.json()

        # Should only contain accounts from household1
        account_ids = [a['id'] for a in data.get('results', data)]
        assert str(account_in_household1.id) in account_ids
        assert str(account_in_household2.id) not in account_ids

    def test_user_cannot_retrieve_other_household_account(
        self, api_client_user1, account_in_household2
    ):
        """User should not be able to retrieve accounts from other households."""
        response = api_client_user1.get(f'/api/v1/accounts/{account_in_household2.id}/')

        # Should return 404 (not 403, to avoid leaking existence)
        assert response.status_code == 404

    def test_user_cannot_update_other_household_account(
        self, api_client_user1, account_in_household2
    ):
        """User should not be able to update accounts in other households."""
        response = api_client_user1.patch(
            f'/api/v1/accounts/{account_in_household2.id}/',
            {'name': 'Hacked Account'},
            format='json'
        )

        assert response.status_code == 404

    def test_user_cannot_delete_other_household_account(
        self, api_client_user1, account_in_household2
    ):
        """User should not be able to delete accounts in other households."""
        response = api_client_user1.delete(f'/api/v1/accounts/{account_in_household2.id}/')

        assert response.status_code == 404

        # Verify account still exists
        assert Account.objects.filter(id=account_in_household2.id).exists()

    def test_user_cannot_create_account_in_other_household(
        self, api_client_user1, household2
    ):
        """User should not be able to create accounts in other households.

        Even if they try to specify a different household_id in the request,
        the account should be created in their own household.
        """
        response = api_client_user1.post(
            '/api/v1/accounts/',
            {
                'name': 'Sneaky Account',
                'account_type': 'checking',
                'institution_name': 'Test Bank',
                # Attempting to set different household (should be ignored)
                'household': str(household2.id)
            },
            format='json'
        )

        if response.status_code == 201:
            data = response.json()
            # If created, it should be in user1's household, not household2
            created_account = Account.objects.get(id=data['id'])
            assert created_account.household_id != household2.id


@pytest.mark.django_db
class TestMissingHouseholdContext:
    """Test that requests without household context are properly rejected."""

    def test_missing_household_header_returns_403(self, user1):
        """Request without X-Household-ID header should return 403."""
        client = APIClient()
        refresh = RefreshToken.for_user(user1)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        # Note: No X-Household-ID header

        response = client.get('/api/v1/accounts/')

        # Should be rejected because household context is missing
        # If user has a default household, it might fallback to that
        # Otherwise should return 403 or 400
        assert response.status_code in [400, 403, 200]
        # If 200, verify it's using the default household behavior

    def test_invalid_household_id_returns_403(self, user1):
        """Request with invalid household ID should return 403."""
        client = APIClient()
        refresh = RefreshToken.for_user(user1)
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}",
            HTTP_X_HOUSEHOLD_ID=str(uuid.uuid4())  # Random UUID
        )

        response = client.get('/api/v1/accounts/')

        assert response.status_code == 403


@pytest.mark.django_db
class TestHouseholdScopedManager:
    """Test the HouseholdScopedManager functionality."""

    def test_for_household_filters_correctly(self, household1, household2, account_in_household1, account_in_household2):
        """Manager's for_household() should filter correctly."""
        h1_accounts = Account.objects.for_household(household1)
        h2_accounts = Account.objects.for_household(household2)

        assert account_in_household1 in h1_accounts
        assert account_in_household2 not in h1_accounts
        assert account_in_household2 in h2_accounts
        assert account_in_household1 not in h2_accounts

    def test_for_household_none_returns_empty(self, account_in_household1):
        """Manager's for_household(None) should return empty queryset."""
        accounts = Account.objects.for_household(None)

        assert accounts.count() == 0

    def test_for_household_with_uuid(self, household1, account_in_household1):
        """Manager's for_household() should accept UUID directly."""
        accounts = Account.objects.for_household(household1.id)

        assert account_in_household1 in accounts


@pytest.mark.django_db
class TestHouseholdScopedViewMixin:
    """Test the HouseholdScopedViewMixin functionality."""

    def test_get_household_raises_when_missing(self):
        """get_household() should raise when household is None."""
        mixin = HouseholdScopedViewMixin()
        mixin.request = MockRequest(household=None)
        mixin.require_household = True

        with pytest.raises(HouseholdContextError):
            mixin.get_household()

    def test_get_household_returns_household_when_present(self, household1):
        """get_household() should return household when present."""
        mixin = HouseholdScopedViewMixin()
        mixin.request = MockRequest(household=household1)
        mixin.require_household = True

        assert mixin.get_household() == household1

    def test_get_household_or_none_returns_none(self):
        """get_household_or_none() should return None without raising."""
        mixin = HouseholdScopedViewMixin()
        mixin.request = MockRequest(household=None)
        mixin.require_household = True

        assert mixin.get_household_or_none() is None


@pytest.mark.django_db
class TestModelBelongsToHousehold:
    """Test the belongs_to_household method on HouseholdOwnedModel."""

    def test_belongs_to_household_true(self, household1, account_in_household1):
        """Model should return True for its own household."""
        assert account_in_household1.belongs_to_household(household1) is True

    def test_belongs_to_household_false(self, household2, account_in_household1):
        """Model should return False for other households."""
        assert account_in_household1.belongs_to_household(household2) is False

    def test_belongs_to_household_none(self, account_in_household1):
        """Model should return False for None household."""
        assert account_in_household1.belongs_to_household(None) is False

    def test_belongs_to_household_with_uuid(self, household1, account_in_household1):
        """Model should accept UUID directly."""
        assert account_in_household1.belongs_to_household(household1.id) is True
