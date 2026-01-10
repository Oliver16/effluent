from django.utils.functional import SimpleLazyObject
from django.core.exceptions import ValidationError
from apps.core.models import Household


def get_household(request):
    if hasattr(request, '_cached_household'):
        return request._cached_household

    household = None

    # Check header
    household_id = request.headers.get('X-Household-ID')
    if household_id:
        try:
            household = Household.objects.filter(id=household_id).first()
        except (ValidationError, ValueError):
            # Invalid UUID format - ignore and continue
            pass

    # Check session
    if not household and hasattr(request, 'session'):
        household_id = request.session.get('current_household_id')
        if household_id:
            try:
                household = Household.objects.filter(id=household_id).first()
            except (ValidationError, ValueError):
                # Invalid UUID format - ignore and continue
                pass

    # Fall back to user's default
    if not household and request.user.is_authenticated:
        try:
            household = request.user.get_default_household()
        except Exception:
            # Database issues or other errors - ignore and continue
            pass

    # Verify access
    if household and request.user.is_authenticated:
        try:
            if not request.user.household_memberships.filter(household=household).exists():
                household = None
        except Exception:
            # Database issues - ignore and continue
            household = None

    request._cached_household = household
    return household


class HouseholdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.household = SimpleLazyObject(lambda: get_household(request))
        return self.get_response(request)
