from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.text import slugify
import uuid

from .models import Household, HouseholdMember, HouseholdMembership
from .serializers import (
    HouseholdSerializer, HouseholdDetailSerializer,
    HouseholdMemberSerializer, HouseholdMembershipSerializer
)


class HouseholdViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Household.objects.filter(memberships__user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return HouseholdDetailSerializer
        return HouseholdSerializer

    def perform_create(self, serializer):
        household = serializer.save(
            slug=slugify(serializer.validated_data['name']) + '-' + str(uuid.uuid4())[:8]
        )
        HouseholdMembership.objects.create(
            user=self.request.user,
            household=household,
            role='owner',
            is_default=True
        )

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        household = self.get_object()
        HouseholdMembership.objects.filter(user=request.user).update(is_default=False)
        HouseholdMembership.objects.filter(user=request.user, household=household).update(is_default=True)
        return Response({'status': 'set as default'})


class HouseholdMemberViewSet(viewsets.ModelViewSet):
    serializer_class = HouseholdMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HouseholdMember.objects.filter(household=self.request.household)

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
