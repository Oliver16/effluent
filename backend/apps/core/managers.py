"""
Household-scoped managers for enforcing multi-tenancy at the database layer.

This module provides managers that automatically filter querysets by household,
ensuring that tenant data isolation is enforced even if view code forgets to
filter. This is a critical security layer for multi-tenancy.
"""
from django.db import models


class HouseholdScopedQuerySet(models.QuerySet):
    """
    QuerySet that can be automatically scoped to a household.

    This provides a for_household() method that MUST be called before any
    list/retrieve operations to ensure proper tenant isolation.
    """

    def for_household(self, household):
        """
        Filter the queryset to only include objects belonging to the given household.

        Args:
            household: The Household instance or household ID to filter by.
                      If None, returns an empty queryset for safety.

        Returns:
            QuerySet filtered to the specified household.
        """
        if household is None:
            # Return empty queryset for safety - never leak data if no household
            return self.none()

        # Handle both Household instance and UUID
        household_id = getattr(household, 'id', household)
        return self.filter(household_id=household_id)

    def for_request(self, request):
        """
        Filter the queryset based on the request's household context.

        This is a convenience method that extracts the household from the
        request and applies the filter.

        Args:
            request: The HTTP request with household attached by middleware.

        Returns:
            QuerySet filtered to the request's household.
        """
        household = getattr(request, 'household', None)
        return self.for_household(household)


class HouseholdScopedManager(models.Manager):
    """
    Manager that provides household-scoped querysets.

    Usage:
        class Account(HouseholdOwnedModel):
            objects = HouseholdScopedManager()

        # In views:
        accounts = Account.objects.for_household(request.household)
        # or
        accounts = Account.objects.for_request(request)

    Warning:
        Using .all() directly without .for_household() bypasses tenant isolation.
        Always use for_household() or for_request() in view code.
    """

    def get_queryset(self):
        return HouseholdScopedQuerySet(self.model, using=self._db)

    def for_household(self, household):
        """Convenience method to filter by household."""
        return self.get_queryset().for_household(household)

    def for_request(self, request):
        """Convenience method to filter by request's household."""
        return self.get_queryset().for_request(request)


class IndirectHouseholdScopedManager(models.Manager):
    """
    Manager for models that access household through a related model.

    For example, BalanceSnapshot belongs to Account, which belongs to Household.

    Usage:
        class BalanceSnapshot(models.Model):
            account = models.ForeignKey(Account, ...)
            objects = IndirectHouseholdScopedManager(household_path='account__household')
    """

    def __init__(self, household_path='household'):
        super().__init__()
        self.household_path = household_path

    def get_queryset(self):
        return IndirectHouseholdScopedQuerySet(
            self.model,
            using=self._db,
            household_path=self.household_path
        )

    def for_household(self, household):
        return self.get_queryset().for_household(household)

    def for_request(self, request):
        return self.get_queryset().for_request(request)


class IndirectHouseholdScopedQuerySet(models.QuerySet):
    """
    QuerySet for models with indirect household relationships.
    """

    def __init__(self, *args, household_path='household', **kwargs):
        super().__init__(*args, **kwargs)
        self.household_path = household_path

    def _clone(self):
        clone = super()._clone()
        clone.household_path = self.household_path
        return clone

    def for_household(self, household):
        if household is None:
            return self.none()

        household_id = getattr(household, 'id', household)
        filter_kwargs = {f'{self.household_path}_id': household_id}
        return self.filter(**filter_kwargs)

    def for_request(self, request):
        household = getattr(request, 'household', None)
        return self.for_household(household)
