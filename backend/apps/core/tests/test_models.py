import pytest
from apps.core.models import User, Household, HouseholdMembership, HouseholdMember


@pytest.mark.django_db
class TestUser:
    def test_create_user(self):
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='pass123'
        )
        assert user.email == 'test@example.com'
        assert user.username == 'testuser'
        assert user.check_password('pass123')

    def test_user_email_unique(self):
        User.objects.create_user(
            email='test@example.com',
            username='testuser1',
            password='pass123'
        )
        with pytest.raises(Exception):
            User.objects.create_user(
                email='test@example.com',
                username='testuser2',
                password='pass123'
            )


@pytest.mark.django_db
class TestHousehold:
    def test_create_household(self):
        household = Household.objects.create(
            name='Test Household',
            slug='test-household'
        )
        assert household.name == 'Test Household'
        assert household.slug == 'test-household'
        assert household.plan == 'free'
        assert household.currency == 'USD'

    def test_household_slug_unique(self):
        Household.objects.create(name='Test 1', slug='test-slug')
        with pytest.raises(Exception):
            Household.objects.create(name='Test 2', slug='test-slug')


@pytest.mark.django_db
class TestHouseholdMembership:
    def test_create_membership(self, user, household):
        # Membership is already created by the household fixture
        membership = HouseholdMembership.objects.get(user=user, household=household)
        assert membership.role == 'owner'

    def test_user_can_get_households(self, user, household):
        households = user.get_households()
        assert household in households

    def test_user_can_get_default_household(self, user, household):
        # Set the membership as default
        membership = HouseholdMembership.objects.get(user=user, household=household)
        membership.is_default = True
        membership.save()

        default = user.get_default_household()
        assert default == household


@pytest.mark.django_db
class TestHouseholdMember:
    def test_create_member(self, household):
        member = HouseholdMember.objects.create(
            household=household,
            name='John Doe',
            relationship='self',
            is_primary=True
        )
        assert member.name == 'John Doe'
        assert member.relationship == 'self'
        assert member.is_primary is True
