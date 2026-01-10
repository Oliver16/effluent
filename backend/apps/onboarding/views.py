from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .services import OnboardingService


def _get_household_or_error(request):
    """Get household from request or return error response."""
    if not request.household:
        return None, Response(
            {'error': 'No household context available'},
            status=status.HTTP_400_BAD_REQUEST
        )
    return request.household, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_step(request):
    household, error = _get_household_or_error(request)
    if error:
        return error
    service = OnboardingService(household)
    return Response(service.get_current_step())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_draft(request):
    household, error = _get_household_or_error(request)
    if error:
        return error
    service = OnboardingService(household)
    result = service.save_draft(request.data)
    if result.get('success', True):
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_step(request):
    household, error = _get_household_or_error(request)
    if error:
        return error
    service = OnboardingService(household)
    result = service.complete_step(request.data)
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def skip_step(request):
    household, error = _get_household_or_error(request)
    if error:
        return error
    service = OnboardingService(household)
    result = service.skip_step()
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def go_back(request):
    household, error = _get_household_or_error(request)
    if error:
        return error
    service = OnboardingService(household)
    result = service.go_back()
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)
