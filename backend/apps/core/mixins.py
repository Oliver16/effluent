"""
Mixins and base classes for household-scoped views.

These provide enforced multi-tenancy at the view layer, ensuring that:
1. Requests without household context are rejected (not silently defaulted)
2. Querysets are automatically filtered by household
3. Created objects are automatically assigned to the request's household
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import HouseholdRequired, ObjectBelongsToHousehold


class HouseholdContextError(PermissionDenied):
    """
    Raised when household context is missing or invalid.

    This is a distinct exception from generic PermissionDenied to allow
    for specific handling and clearer error messages.
    """
    default_detail = 'Household context is required for this operation.'
    default_code = 'household_required'


class HouseholdScopedViewMixin:
    """
    Mixin for views that need access to the current household.

    This enhanced mixin provides:
    1. get_household() - Returns household or raises if missing
    2. get_household_or_none() - Returns household or None (use carefully)
    3. require_household - Class attribute to enforce household context

    Requires HouseholdMiddleware to be installed, which sets
    request.household based on headers, session, or user default.

    Usage:
        class MyViewSet(HouseholdScopedViewMixin, viewsets.ModelViewSet):
            require_household = True  # Default, raises if no household

            def get_queryset(self):
                return MyModel.objects.filter(household=self.get_household())
    """

    # If True, get_household() raises HouseholdContextError when household is None
    # Set to False only for views that can operate without household context
    require_household = True

    def get_household(self):
        """
        Get the current household from the request.

        Returns:
            Household instance from the request.

        Raises:
            HouseholdContextError: If household is None and require_household is True.
        """
        household = getattr(self.request, 'household', None)

        if household is None and self.require_household:
            raise HouseholdContextError(
                'No household context provided. Please include X-Household-ID header '
                'or select a household.'
            )

        return household

    def get_household_or_none(self):
        """
        Get the current household without raising an exception.

        Use this method only in views that explicitly handle the None case,
        such as views that show content across all households for superusers.

        Returns:
            Household instance or None.
        """
        return getattr(self.request, 'household', None)


class HouseholdAutoFilterMixin(HouseholdScopedViewMixin):
    """
    Mixin that automatically filters querysets by household.

    This mixin extends HouseholdScopedViewMixin to automatically apply
    household filtering to the base queryset. Child classes should define
    queryset_class or base_queryset_name.

    The mixin provides two approaches:
    1. Override get_base_queryset() for custom base querysets
    2. Use the default which calls model.objects.for_household()

    Usage:
        class AccountViewSet(HouseholdAutoFilterMixin, viewsets.ModelViewSet):
            queryset = Account.objects.all()  # Base queryset, will be filtered
            serializer_class = AccountSerializer

            # Optionally override for additional filtering:
            def get_queryset(self):
                qs = super().get_queryset()
                return qs.filter(is_active=True)
    """

    # Set to False to disable automatic household filtering
    # (useful for admin views or cross-household queries)
    auto_filter_by_household = True

    def get_queryset(self):
        """
        Get queryset automatically filtered by household.

        If the model's manager has a for_household() method (from HouseholdScopedManager),
        it will be used. Otherwise, falls back to .filter(household=...).

        Returns:
            QuerySet filtered to the current household.
        """
        if not self.auto_filter_by_household:
            return super().get_queryset()

        household = self.get_household()
        base_qs = super().get_queryset()

        # Prefer using manager's for_household if available
        if hasattr(base_qs, 'for_household'):
            return base_qs.for_household(household)

        # Fall back to direct filtering
        return base_qs.filter(household=household)


class HouseholdCreateMixin:
    """
    Mixin that automatically sets household when creating objects.

    This ensures that new objects are always created in the correct
    household context, preventing accidental data assignment to
    wrong households.

    Usage:
        class AccountViewSet(HouseholdCreateMixin, viewsets.ModelViewSet):
            # household will be set automatically in perform_create
            pass
    """

    def perform_create(self, serializer):
        """
        Set household when creating a new object.

        The household is taken from the request context and cannot be
        overridden by the client, preventing tenant data injection.
        """
        household = self.get_household()
        serializer.save(household=household)


class HouseholdScopedModelViewSet(
    HouseholdAutoFilterMixin,
    HouseholdCreateMixin,
    viewsets.ModelViewSet
):
    """
    Base ViewSet for household-scoped models with full multi-tenancy enforcement.

    This ViewSet provides:
    1. Automatic queryset filtering by household
    2. Automatic household assignment on create
    3. Permission enforcement requiring household context
    4. Object-level permission checking

    This is the recommended base class for all tenant-scoped ViewSets.

    Usage:
        class AccountViewSet(HouseholdScopedModelViewSet):
            queryset = Account.objects.all()
            serializer_class = AccountSerializer

            # Optional: add extra queryset filters
            def get_queryset(self):
                qs = super().get_queryset()
                if self.request.query_params.get('active_only', 'true').lower() == 'true':
                    qs = qs.filter(is_active=True)
                return qs

    Security features:
        - Requests without household context return 403
        - All queries automatically filter by household
        - Created objects automatically assigned to household
        - Object-level permissions verify household ownership
    """

    permission_classes = [IsAuthenticated, HouseholdRequired, ObjectBelongsToHousehold]

    def perform_update(self, serializer):
        """
        Update object, ensuring household cannot be changed.

        The household field is excluded from updates to prevent
        moving objects between households.
        """
        # Remove household from validated_data if present
        # (shouldn't happen with read_only, but defense in depth)
        if 'household' in serializer.validated_data:
            del serializer.validated_data['household']
        serializer.save()


class HouseholdScopedReadOnlyViewSet(
    HouseholdAutoFilterMixin,
    viewsets.ReadOnlyModelViewSet
):
    """
    Read-only ViewSet for household-scoped models.

    Use this for models that should be viewable but not editable via API.

    Usage:
        class MetricSnapshotViewSet(HouseholdScopedReadOnlyViewSet):
            queryset = MetricSnapshot.objects.all()
            serializer_class = MetricSnapshotSerializer
    """

    permission_classes = [IsAuthenticated, HouseholdRequired, ObjectBelongsToHousehold]


def validate_household_ownership(request, obj, field='household'):
    """
    Utility function to validate that an object belongs to the request's household.

    Use this in serializers or views when you need to validate related
    objects belong to the same household.

    Args:
        request: The HTTP request with household context.
        obj: The object to validate.
        field: The name of the household field (default: 'household').

    Raises:
        PermissionDenied: If the object doesn't belong to the request's household.
    """
    household = getattr(request, 'household', None)
    if household is None:
        raise HouseholdContextError()

    obj_household = getattr(obj, field, None)
    if obj_household is None:
        # Try to get household through common relationships
        for attr in ['account', 'scenario', 'goal']:
            related = getattr(obj, attr, None)
            if related and hasattr(related, 'household'):
                obj_household = related.household
                break

    if obj_household and obj_household.id != household.id:
        raise PermissionDenied(
            'The referenced object does not belong to your household.'
        )
