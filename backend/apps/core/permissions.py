"""
Custom permissions for enforcing multi-tenancy and household access control.

These permissions provide security at the DRF level, ensuring that
requests without proper household context are rejected rather than
silently defaulting to potentially incorrect data.
"""
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


class HouseholdRequired(permissions.BasePermission):
    """
    Permission that requires a valid household context.

    This permission ensures that:
    1. The request has a household attached (via middleware)
    2. The household is not None
    3. The user has access to that household

    If household context is missing, returns HTTP 400 Bad Request instead
    of silently defaulting, which could lead to data leaks.

    Usage:
        class AccountViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HouseholdRequired]
    """

    message = 'Household context is required. Please provide X-Household-ID header or select a household.'
    code = 'household_required'

    def has_permission(self, request, view):
        # Allow OPTIONS requests for CORS preflight
        if request.method == 'OPTIONS':
            return True

        # Check if household is attached to request
        household = getattr(request, 'household', None)

        if household is None:
            return False

        # Verify user has access to this household
        if request.user.is_authenticated:
            has_access = request.user.household_memberships.filter(
                household=household
            ).exists()
            if not has_access:
                self.message = 'You do not have access to this household.'
                self.code = 'household_access_denied'
                return False

        return True


class HouseholdRolePermission(permissions.BasePermission):
    """
    Permission that checks the user's role within the household.

    This permission builds on HouseholdRequired and additionally checks
    that the user has sufficient privileges (owner, admin, etc.) for
    the requested action.

    Class attributes:
        allowed_roles: List of roles allowed to perform actions
        read_roles: List of roles allowed for safe methods (GET, HEAD, OPTIONS)
        write_roles: List of roles allowed for unsafe methods

    Usage:
        class HouseholdSettingsViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HouseholdRolePermission]

            # Override at view level:
            allowed_roles = ['owner', 'admin']
    """

    # Default: all roles can read, owner/admin can write
    read_roles = ['owner', 'admin', 'member', 'viewer']
    write_roles = ['owner', 'admin']

    message = 'You do not have the required role to perform this action.'
    code = 'insufficient_role'

    def has_permission(self, request, view):
        # First check if household context exists
        household = getattr(request, 'household', None)
        if household is None:
            self.message = 'Household context is required.'
            self.code = 'household_required'
            return False

        if not request.user.is_authenticated:
            return False

        # Get allowed roles from view or use defaults
        if request.method in permissions.SAFE_METHODS:
            allowed_roles = getattr(view, 'read_roles', self.read_roles)
        else:
            allowed_roles = getattr(view, 'write_roles', self.write_roles)

        # Check user's role in this household
        membership = request.user.household_memberships.filter(
            household=household
        ).first()

        if membership is None:
            self.message = 'You are not a member of this household.'
            self.code = 'not_a_member'
            return False

        if membership.role not in allowed_roles:
            self.message = f'This action requires one of these roles: {", ".join(allowed_roles)}'
            return False

        return True


class HouseholdOwnerRequired(permissions.BasePermission):
    """
    Permission that requires the user to be the owner of the household.

    Use this for sensitive operations like:
    - Deleting the household
    - Transferring ownership
    - Managing billing/subscription

    Usage:
        class HouseholdDeleteView(views.APIView):
            permission_classes = [IsAuthenticated, HouseholdOwnerRequired]
    """

    message = 'Only the household owner can perform this action.'
    code = 'owner_required'

    def has_permission(self, request, view):
        household = getattr(request, 'household', None)
        if household is None:
            self.message = 'Household context is required.'
            self.code = 'household_required'
            return False

        if not request.user.is_authenticated:
            return False

        membership = request.user.household_memberships.filter(
            household=household,
            role='owner'
        ).exists()

        return membership


class ObjectBelongsToHousehold(permissions.BasePermission):
    """
    Object-level permission that verifies the object belongs to the request's household.

    This provides an additional layer of security for object-level access,
    ensuring that even if a queryset somehow returns an object from another
    household, it cannot be accessed.

    Usage:
        class AccountViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HouseholdRequired, ObjectBelongsToHousehold]
    """

    message = 'This object does not belong to your household.'
    code = 'cross_household_access'

    def has_object_permission(self, request, view, obj):
        household = getattr(request, 'household', None)
        if household is None:
            return False

        # Get the object's household - handle direct and indirect relationships
        obj_household = getattr(obj, 'household', None)

        # For models with indirect household relationship (e.g., via account)
        if obj_household is None:
            # Try common relationship patterns
            for attr in ['account', 'scenario', 'goal']:
                related = getattr(obj, attr, None)
                if related and hasattr(related, 'household'):
                    obj_household = related.household
                    break

        if obj_household is None:
            # Object doesn't have household association - allow
            # (This handles User model and other non-tenant models)
            return True

        return obj_household.id == household.id
