from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.mixins import HouseholdScopedViewMixin
from apps.goals.models import Goal
from apps.goals.serializers import GoalSerializer, GoalStatusSerializer
from apps.goals.services import GoalEvaluationService


class GoalViewSet(HouseholdScopedViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing household goals.

    Provides CRUD operations for goals and goal status evaluation.
    """
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return active goals for the current household."""
        return Goal.objects.filter(
            household=self.get_household(),
            is_active=True
        ).order_by('-is_primary', '-created_at')

    def perform_create(self, serializer):
        """Set household when creating a goal."""
        serializer.save(household=self.get_household())

    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()


class GoalStatusView(HouseholdScopedViewMixin, APIView):
    """
    API endpoint for evaluating goal status.

    Returns current status of all active goals with recommendations.
    Optionally evaluates against a specific scenario.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get goal status for all active goals.

        Query params:
            scenario_id: Optional scenario ID to evaluate against
        """
        household = self.get_household()
        scenario_id = request.query_params.get('scenario_id')

        service = GoalEvaluationService(household)

        try:
            statuses = service.evaluate_goals(scenario_id=scenario_id)
        except Exception as e:
            return Response(
                {'error': 'evaluation_error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = GoalStatusSerializer(statuses, many=True)
        return Response({'results': serializer.data})
