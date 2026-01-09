from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import RecurringFlow
from .serializers import RecurringFlowSerializer
from .services import generate_system_flows_for_household
from apps.scenarios.reality_events import emit_flows_changed


class RecurringFlowViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['flow_type', 'is_active', 'is_baseline']

    def get_queryset(self):
        return RecurringFlow.objects.filter(household=self.request.household)

    def perform_create(self, serializer):
        flow = serializer.save(household=self.request.household)
        # Emit reality change event
        emit_flows_changed(self.request.household, str(flow.id))

    def perform_update(self, serializer):
        flow = serializer.save()
        # Emit reality change event
        emit_flows_changed(self.request.household, str(flow.id))

    def perform_destroy(self, instance):
        household = instance.household
        flow_id = str(instance.id)
        instance.delete()
        # Emit reality change event
        emit_flows_changed(household, flow_id)

    @action(detail=False, methods=['post'])
    def regenerate_system_flows(self, request):
        """
        Regenerate all system-generated flows for the household.

        This recalculates tax withholding, net pay deposits, and other
        system-generated flows based on current income sources and accounts.
        User-created flows are not affected.
        """
        generate_system_flows_for_household(request.household.id)
        # Emit reality change event
        emit_flows_changed(request.household, 'regenerate')
        return Response({
            'status': 'success',
            'message': 'System flows regenerated successfully'
        }, status=status.HTTP_200_OK)
