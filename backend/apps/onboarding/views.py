from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .services import OnboardingService


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_step(request):
    service = OnboardingService(request.household)
    return Response(service.get_current_step())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_draft(request):
    service = OnboardingService(request.household)
    result = service.save_draft(request.data)
    if result.get('success', True):
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_step(request):
    service = OnboardingService(request.household)
    result = service.complete_step(request.data)
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def skip_step(request):
    service = OnboardingService(request.household)
    result = service.skip_step()
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def go_back(request):
    service = OnboardingService(request.household)
    result = service.go_back()
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)
