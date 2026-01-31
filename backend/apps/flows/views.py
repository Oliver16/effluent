from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.core.cache import cache
from celery.result import AsyncResult

from .models import RecurringFlow
from .serializers import RecurringFlowSerializer
from .services import generate_system_flows_for_household
from .tasks import regenerate_system_flows_task, recalculate_tax_withholding_task
from apps.scenarios.reality_events import emit_flows_changed
from apps.core.task_utils import register_task_for_household, unregister_task_for_household


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

            # Register task for household tracking and security validation
            register_task_for_household(
                task.id,
                str(request.household.id),
                task_name='regenerate_system_flows'
            )

            # Still emit reality change event (will be processed by celery beat)
            emit_flows_changed(request.household, 'regenerate')

            return Response({
                'task_id': task.id,
                'status': 'pending',
                'message': 'System flow regeneration started. Poll /api/v1/flows/tasks/{task_id}/ for results.'
            }, status=status.HTTP_202_ACCEPTED)

        # Synchronous for backwards compatibility
        generate_system_flows_for_household(request.household.id)
        emit_flows_changed(request.household, 'regenerate')
        return Response({
            'status': 'success',
            'message': 'System flows regenerated successfully'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def recalculate_tax_withholding(self, request):
        """
        Recalculate tax withholding flows for all income sources (async by default).

        This is a subset of system flow regeneration focused only on tax-related flows.
        Useful when only tax configuration changes without affecting other system flows.
        """
        run_async = request.data.get('async', True)  # Default to async

        if run_async:
            task = recalculate_tax_withholding_task.apply_async(
                kwargs={'household_id': str(request.household.id)}
            )

            # Register task for household tracking and security validation
            register_task_for_household(
                task.id,
                str(request.household.id),
                task_name='recalculate_tax_withholding'
            )

            # Still emit reality change event
            emit_flows_changed(request.household, 'tax_recalculation')

            return Response({
                'task_id': task.id,
                'status': 'pending',
                'message': 'Tax withholding recalculation started. Poll /api/v1/flows/tasks/{task_id}/ for results.'
            }, status=status.HTTP_202_ACCEPTED)

        # Synchronous for backwards compatibility
        from .services import SystemFlowGenerator
        generator = SystemFlowGenerator(request.household)

        # Delete existing tax withholding flows
        from .models import ExpenseCategory
        deleted_count, _ = RecurringFlow.objects.filter(
            household=request.household,
            is_system_generated=True,
            system_flow_kind='tax_withholding'
        ).delete()

        # Regenerate tax withholding
        generator._generate_tax_withholding_flows()

        created_count = RecurringFlow.objects.filter(
            household=request.household,
            is_system_generated=True,
            system_flow_kind='tax_withholding'
        ).count()

        emit_flows_changed(request.household, 'tax_recalculation')

        return Response({
            'status': 'success',
            'flows_deleted': deleted_count,
            'flows_created': created_count,
            'message': 'Tax withholding recalculated successfully'
        }, status=status.HTTP_200_OK)


class FlowTaskStatusView(APIView):
    """Check status of an async flow task (regeneration or tax withholding)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        """
        Get the status and result of a flow task.

        Security: Validates that the task belongs to the requesting user's household
        by checking a task_id -> household_id mapping stored in cache.

        This endpoint handles status for:
        - System flow regeneration tasks
        - Tax withholding recalculation tasks
        """
        # Validate task ownership
        cached_household_id = cache.get(f'task_household:{task_id}')

        # SECURITY: Return same error for both "not found" and "access denied" to prevent enumeration
        # Combines cache check and household ownership validation into single check
        if not cached_household_id or not request.household or str(request.household.id) != str(cached_household_id):
            return Response({
                'error': 'Task not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)

        task_result = AsyncResult(task_id)

        if task_result.ready():
            if task_result.successful():
                result = task_result.result
                # Clean up task from registry after successful retrieval
                unregister_task_for_household(task_id, cached_household_id)
                return Response({
                    'task_id': task_id,
                    'status': 'completed',
                    'result': result
                })
            else:
                # Clean up task from registry after failed retrieval
                unregister_task_for_household(task_id, cached_household_id)
                return Response({
                    'task_id': task_id,
                    'status': 'failed',
                    'error': str(task_result.result)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({
                'task_id': task_id,
                'status': 'pending',
                'state': task_result.state
            })
