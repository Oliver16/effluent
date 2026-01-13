from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import RecurringFlow
from .serializers import RecurringFlowSerializer
from .services import generate_system_flows_for_household
from .tasks import regenerate_system_flows_task
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
        Regenerate all system-generated flows for the household (async by default).

        This recalculates tax withholding, net pay deposits, and other
        system-generated flows based on current income sources and accounts.
        User-created flows are not affected.
        """
        run_async = request.data.get('async', True)  # Default to async

        if run_async:
            task = regenerate_system_flows_task.apply_async(
                kwargs={'household_id': str(request.household.id)}
            )

            # Still emit reality change event (will be processed by celery beat)
            emit_flows_changed(request.household, 'regenerate')

            return Response({
                'task_id': task.id,
                'status': 'pending',
                'message': 'System flow regeneration started. This will complete shortly.'
            }, status=status.HTTP_202_ACCEPTED)

        # Synchronous for backwards compatibility
        generate_system_flows_for_household(request.household.id)
        emit_flows_changed(request.household, 'regenerate')
        return Response({
            'status': 'success',
            'message': 'System flows regenerated successfully'
        }, status=status.HTTP_200_OK)
