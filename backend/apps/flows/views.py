from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import RecurringFlow
from .serializers import RecurringFlowSerializer


class RecurringFlowViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['flow_type', 'is_active', 'is_baseline']

    def get_queryset(self):
        return RecurringFlow.objects.filter(household=self.request.household)

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
