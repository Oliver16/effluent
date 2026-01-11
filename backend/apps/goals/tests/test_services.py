"""Tests for goal evaluation and solver services."""

import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone

from apps.core.models import User, Household, HouseholdMember, HouseholdMembership
from apps.goals.models import Goal, GoalType
from apps.goals.services import GoalEvaluator


@pytest.mark.django_db
class TestGoalEvaluatorRetirementAge:
    """Test retirement age evaluation with different birthdate configurations."""

    @pytest.fixture
    def household(self):
        """Create a test household."""
        return Household.objects.create(
            name='Test Household',
            slug='test-household'
        )

    @pytest.fixture
    def user(self):
        """Create a test user with a birthdate."""
        return User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='password123',
            date_of_birth=date(1985, 6, 15)  # User is ~39 years old
        )

    @pytest.fixture
    def membership(self, user, household):
        """Create household membership linking user to household."""
        return HouseholdMembership.objects.create(
            user=user,
            household=household,
            role='owner',
            is_default=True
        )

    def test_get_primary_member_age_from_household_member(self, household):
        """Test that age is correctly retrieved from HouseholdMember.date_of_birth."""
        # Create a household member with date_of_birth set
        member = HouseholdMember.objects.create(
            household=household,
            name='John Doe',
            relationship='self',
            is_primary=True,
            date_of_birth=date(1985, 6, 15)
        )

        evaluator = GoalEvaluator(household)
        age = evaluator._get_primary_member_age()

        assert age is not None
        # Age should be around 39 (depending on current date)
        assert 38 <= age <= 40

    def test_get_primary_member_age_from_user_profile(self, user, household, membership):
        """Test that age falls back to User.date_of_birth when HouseholdMember has no birthdate.

        This is the fix for the retirement solver bug where users set their birthdate
        in Account settings (which updates User.date_of_birth) but the solver only
        checked HouseholdMember.date_of_birth.
        """
        # Create a household member WITHOUT date_of_birth
        # (simulating when user hasn't filled it in the Members tab)
        member = HouseholdMember.objects.create(
            household=household,
            name='John Doe',
            relationship='self',
            is_primary=True,
            date_of_birth=None  # Not set on member
        )

        evaluator = GoalEvaluator(household)
        age = evaluator._get_primary_member_age()

        # Should still get age from User.date_of_birth
        assert age is not None
        assert 38 <= age <= 40

    def test_get_primary_member_age_prefers_household_member(self, user, household, membership):
        """Test that HouseholdMember.date_of_birth takes precedence over User.date_of_birth."""
        # Create member with different birthdate than user
        member = HouseholdMember.objects.create(
            household=household,
            name='John Doe',
            relationship='self',
            is_primary=True,
            date_of_birth=date(1990, 1, 1)  # Different from user's 1985
        )

        evaluator = GoalEvaluator(household)
        age = evaluator._get_primary_member_age()

        # Should use member's birthdate (1990), not user's (1985)
        assert age is not None
        assert 33 <= age <= 35  # Around 34 years old

    def test_get_primary_member_age_returns_none_when_no_birthdate(self, household):
        """Test that None is returned when no birthdate is found anywhere."""
        # Create member without birthdate, and no user
        member = HouseholdMember.objects.create(
            household=household,
            name='John Doe',
            relationship='self',
            is_primary=True,
            date_of_birth=None
        )

        evaluator = GoalEvaluator(household)
        age = evaluator._get_primary_member_age()

        assert age is None

    def test_retirement_goal_solver_with_user_birthdate(self, user, household, membership):
        """Test that retirement goal solver works when only User.date_of_birth is set.

        This is the integration test for the bug fix.
        """
        # Create member without birthdate (common when user skips Members tab)
        member = HouseholdMember.objects.create(
            household=household,
            name='Test User',
            relationship='self',
            is_primary=True,
            date_of_birth=None
        )

        # Create a retirement goal
        goal = Goal.objects.create(
            household=household,
            goal_type=GoalType.RETIREMENT_AGE,
            display_name='Retire at 65',
            target_value=Decimal('65'),
            target_unit='age',
            is_active=True
        )

        evaluator = GoalEvaluator(household)

        # This should NOT return "date of birth not set" error
        # It should find the birthdate from User.date_of_birth
        age = evaluator._get_primary_member_age()
        assert age is not None

        # Verify the recommendation message doesn't say "Add your date of birth"
        # (We can't fully test the solver without metrics data, but we can test age retrieval)
