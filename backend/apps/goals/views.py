"""Goals API views."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone

from apps.core.mixins import (
    HouseholdScopedModelViewSet,
    HouseholdScopedReadOnlyViewSet,
    HouseholdScopedViewMixin
)
from apps.core.permissions import HouseholdRequired
from apps.goals.models import Goal, GoalSolution
from apps.goals.serializers import (
    GoalSerializer, GoalStatusSerializer,
    GoalSolutionSerializer, GoalSolveOptionsSerializer, GoalApplySolutionSerializer
)
from apps.goals.services import GoalEvaluator, GoalSeekSolver


class GoalViewSet(HouseholdScopedModelViewSet):
    """
    ViewSet for managing household goals.

    Provides CRUD operations for goals and goal status evaluation.

    Uses HouseholdScopedModelViewSet for automatic:
    - Queryset filtering by household
    - Household context requirement
    - Household assignment on create
    - Object-level permission checking
    """
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer

    def get_queryset(self):
        """Return active goals for the current household."""
        qs = super().get_queryset()
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            qs = qs.filter(is_active=True)
        return qs.order_by('-is_primary', '-created_at')

    def perform_create(self, serializer):
        """Set household when creating a goal."""
        household = self.get_household()
        # If setting as primary, unset any existing primary goal
        if serializer.validated_data.get('is_primary', False):
            Goal.objects.for_household(household).filter(
                is_primary=True,
                is_active=True
            ).update(is_primary=False)

        serializer.save(household=household)

    def perform_update(self, serializer):
        """Handle primary goal updates."""
        if serializer.validated_data.get('is_primary', False):
            Goal.objects.for_household(self.get_household()).filter(
                is_primary=True,
                is_active=True
            ).exclude(id=self.get_object().id).update(is_primary=False)

        serializer.save()

    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def solve(self, request, pk=None):
        """
        Solve for required changes to achieve this goal.

        POST /api/v1/goals/{id}/solve/
        """
        goal = self.get_object()

        serializer = GoalSolveOptionsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        options = serializer.validated_data

        # Run solver
        solver = GoalSeekSolver(self.get_household())
        solution = solver.solve_goal(goal, options)

        return Response(GoalSolutionSerializer(solution).data)

    @action(detail=True, methods=['post'], url_path='apply-solution')
    def apply_solution(self, request, pk=None):
        """
        Apply a solution plan as a scenario.

        POST /api/v1/goals/{id}/apply-solution/
        """
        goal = self.get_object()

        serializer = GoalApplySolutionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan = serializer.validated_data['plan']
        scenario_name = serializer.validated_data.get('scenario_name', f"Achieve: {goal.display_name}")

        # Import here to avoid circular imports
        from apps.scenarios.decision_builder import run_decision_plan

        try:
            result = run_decision_plan(
                household=self.get_household(),
                plan=plan,
                scenario_name=scenario_name,
                goal=goal
            )
        except Exception as e:
            return Response(
                {'error': 'scenario_creation_failed', 'message': str(e)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        # Update latest solution with applied scenario
        solution = goal.solutions.order_by('-computed_at').first()
        if solution:
            solution.applied_scenario = result['scenario']
            solution.applied_at = timezone.now()
            solution.save()

        # Import serializer for proper JSON serialization
        from apps.scenarios.serializers import ScenarioChangeSerializer

        # Serialize the changes properly - they are model instances, not dicts
        changes = result.get('changes', [])
        if changes and hasattr(changes[0], 'id'):
            # They're model instances, serialize them
            changes_data = ScenarioChangeSerializer(changes, many=True).data
        else:
            changes_data = changes

        response_data = {
            'scenario': {
                'id': str(result['scenario'].id),
                'name': result['scenario'].name,
                'created_at': result['scenario'].created_at.isoformat(),
            },
            'changes': changes_data,
            'summary': result.get('summary', {}),
            'redirect_url': f"/scenarios/{result['scenario'].id}"
        }

        # Include skipped steps and warnings if present
        if result.get('skipped_steps'):
            response_data['skipped_steps'] = result['skipped_steps']
        if result.get('warnings'):
            response_data['warnings'] = result['warnings']

        return Response(response_data)


class GoalStatusView(HouseholdScopedViewMixin, APIView):
    """
    API endpoint for evaluating goal status.

    Returns current status of all active goals with recommendations.
    """
    permission_classes = [IsAuthenticated, HouseholdRequired]

    def get(self, request):
        """Get goal status for all active goals."""
        household = self.get_household()
        scenario_id = request.query_params.get('scenario_id')

        evaluator = GoalEvaluator(household)

        try:
            statuses = evaluator.evaluate_goals(scenario_id=scenario_id)
        except Exception as e:
            return Response(
                {'error': 'evaluation_error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Convert dataclass to dict for serialization
        results = []
        for s in statuses:
            results.append({
                'goal_id': s.goal_id,
                'goal_type': s.goal_type,
                'goal_name': s.goal_name,
                'target_value': s.target_value,
                'target_unit': s.target_unit,
                'current_value': s.current_value,
                'status': s.status,
                'delta_to_target': s.delta_to_target,
                'percentage_complete': s.percentage_complete,
                'recommendation': s.recommendation,
            })

        return Response({'results': results, 'count': len(results)})


class GoalSolutionViewSet(HouseholdScopedReadOnlyViewSet):
    """
    ViewSet for viewing goal solutions.

    Uses HouseholdScopedReadOnlyViewSet for automatic:
    - Queryset filtering by household (via goal relationship)
    - Household context requirement
    - Object-level permission checking
    """
    queryset = GoalSolution.objects.all()
    serializer_class = GoalSolutionSerializer

    # Disable automatic household filtering since we filter via goal__household
    auto_filter_by_household = False

    def get_queryset(self):
        """Filter solutions by household via goal relationship."""
        goal_id = self.request.query_params.get('goal')
        qs = GoalSolution.objects.filter(goal__household=self.get_household())
        if goal_id:
            qs = qs.filter(goal_id=goal_id)
        return qs.select_related('goal', 'applied_scenario')
