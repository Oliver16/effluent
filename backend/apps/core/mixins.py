"""Mixins for household-scoped views."""


class HouseholdScopedViewMixin:
    """
    Mixin for views that need access to the current household.

    Requires HouseholdMiddleware to be installed, which sets
    request.household based on headers, session, or user default.
    """

    def get_household(self):
        """Get the current household from the request."""
        return getattr(self.request, 'household', None)
