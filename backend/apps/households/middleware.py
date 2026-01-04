from django.utils.functional import SimpleLazyObject
from apps.core.models import Household


def get_household(request):
    if hasattr(request, '_cached_household'):
        return request._cached_household

    household = None

    # Check header
    household_id = request.headers.get('X-Household-ID')
    if household_id:
        household = Household.objects.filter(id=household_id).first()

    # Check session
    if not household and hasattr(request, 'session'):
        household_id = request.session.get('current_household_id')
        if household_id:
            household = Household.objects.filter(id=household_id).first()

    # Fall back to user's default
    if not household and request.user.is_authenticated:
        household = request.user.get_default_household()

    # Verify access
    if household and request.user.is_authenticated:
        if not request.user.household_memberships.filter(household=household).exists():
            household = None

    request._cached_household = household
    return household


class HouseholdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.household = SimpleLazyObject(lambda: get_household(request))
        return self.get_response(request)
