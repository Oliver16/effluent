"""
Goals API views.

Provides endpoints for:
- Goal CRUD operations
- Goal status evaluation
- Goal seek solver
- Apply solution as scenario
"""
from datetime import date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone

from .models import Goal, GoalSolution
from .serializers import (
    GoalSerializer, GoalCreateSerializer, GoalStatusSerializer,
    GoalSolutionSerializer, GoalSolveOptionsSerializer, GoalApplySolutionSerializer
)
from .services import GoalEvaluator, GoalSeekSolver


class GoalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing goals.

    Provides CRUD operations plus status evaluation and solving.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Goal.objects.filter(household=self.request.household)
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GoalCreateSerializer
        return GoalSerializer

    def perform_create(self, serializer):
        # If setting as primary, unset any existing primary goal
        if serializer.validated_data.get('is_primary', False):
            Goal.objects.filter(
                household=self.request.household,
                is_primary=True,
                is_active=True
            ).update(is_primary=False)

        serializer.save(household=self.request.household)

    def perform_update(self, serializer):
        # If setting as primary, unset any existing primary goal
        if serializer.validated_data.get('is_primary', False):
            Goal.objects.filter(
                household=self.request.household,
                is_primary=True,
                is_active=True
            ).exclude(id=self.get_object().id).update(is_primary=False)

        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active=False."""
        goal = self.get_object()
        goal.is_active = False
        goal.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def solve(self, request, pk=None):
        """
        Solve for required changes to achieve this goal.

        POST /api/v1/goals/{id}/solve/
        Body: {
            "allowed_interventions": ["reduce_expenses", "increase_income"],
            "bounds": {
                "max_reduce_expenses_monthly": "1200.00",
                "max_increase_income_monthly": "1500.00"
            },
            "start_date": "2026-02-01",
            "projection_months": 24
        }
        """
        goal = self.get_object()

        serializer = GoalSolveOptionsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        options = serializer.validated_data

        # Convert bounds Decimal values to Decimal
        bounds = {}
        for key, val in options.get('bounds', {}).items():
            bounds[key] = val
        options['bounds'] = bounds

        # Run solver
        solver = GoalSeekSolver(request.household)
        solution = solver.solve_goal(goal, options)

        return Response(GoalSolutionSerializer(solution).data)

    @action(detail=True, methods=['post'], url_path='apply-solution')
    def apply_solution(self, request, pk=None):
        """
        Apply a solution plan as a scenario.

        POST /api/v1/goals/{id}/apply-solution/
        Body: {
            "plan": [...],
            "scenario_name": "Improve Liquidity"
        }
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
                household=request.household,
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

        return Response({
            'scenario': {
                'id': str(result['scenario'].id),
                'name': result['scenario'].name,
                'created_at': result['scenario'].created_at.isoformat(),
            },
            'changes': result.get('changes', []),
            'summary': result.get('summary', {}),
            'redirect_url': f"/scenarios/{result['scenario'].id}"
        })


class GoalStatusView(APIView):
    """
    Evaluate goal status for the household.

    GET /api/v1/goals/status/
    Optional query: ?scenario_id=uuid
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scenario_id = request.query_params.get('scenario_id')

        evaluator = GoalEvaluator(request.household)
        results = evaluator.evaluate_goals(scenario_id=scenario_id)

        # Convert dataclass results to serializable dicts
        serialized = []
        for result in results:
            serialized.append({
                'goal_id': result.goal_id,
                'goal_type': result.goal_type,
                'goal_name': result.goal_name,
                'target_value': str(result.target_value),
                'target_unit': result.target_unit,
                'current_value': str(result.current_value),
                'status': result.status,
                'delta_to_target': str(result.delta_to_target),
                'percentage_complete': str(result.percentage_complete) if result.percentage_complete else None,
                'recommendation': result.recommendation,
            })

        return Response({
            'results': serialized,
            'count': len(serialized)
        })


class GoalSolutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing goal solutions.

    Read-only access to computed solutions.
    """
    serializer_class = GoalSolutionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        goal_id = self.request.query_params.get('goal')
        qs = GoalSolution.objects.filter(goal__household=self.request.household)
        if goal_id:
            qs = qs.filter(goal_id=goal_id)
        return qs.select_related('goal', 'applied_scenario')
