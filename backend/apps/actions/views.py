"""
Actions API views.

Provides endpoints for:
- Next best actions with branching candidates
- Applying actions as scenarios
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.goals.models import Goal
from apps.metrics.services import MetricsCalculator
from apps.scenarios.decision_builder import run_decision_plan
from .templates import get_applicable_actions, compile_action, ACTION_TEMPLATES


class NextActionsView(APIView):
    """
    Get next best actions based on current financial state.

    GET /api/v1/actions/next/

    Returns applicable actions with branching candidates,
    sorted by severity (critical first).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        household = request.household

        # Get current metrics
        calc = MetricsCalculator(household)
        try:
            snapshot = calc.calculate_all_metrics()
        except Exception as e:
            return Response(
                {'error': 'metrics_error', 'message': str(e)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        # Get active goals
        goals = list(Goal.objects.filter(
            household=household,
            is_active=True
        ))

        # Get applicable actions
        suggestions = get_applicable_actions(snapshot, goals)

        # Serialize suggestions
        serialized = []
        for s in suggestions:
            serialized.append({
                'template_id': s.template_id,
                'name': s.name,
                'description': s.description,
                'severity': s.severity,
                'recommended_candidate_id': s.recommended_candidate_id,
                'candidates': [
                    {
                        'id': c.id,
                        'name': c.name,
                        'description': c.description,
                        'change_type': c.change_type,
                        'default_parameters': c.default_parameters,
                        'impact_estimate': c.impact_estimate,
                    }
                    for c in s.candidates
                ],
                'context': s.context,
            })

        return Response({
            'actions': serialized,
            'count': len(serialized),
        })


class ApplyActionView(APIView):
    """
    Apply an action as a scenario.

    POST /api/v1/actions/apply/
    Body: {
        "template_id": "increase_liquidity",
        "candidate_id": "reduce_expenses",
        "parameters": {"monthly_adjustment": "-500"},
        "scenario_name": "Build Emergency Fund"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        template_id = request.data.get('template_id')
        candidate_id = request.data.get('candidate_id')
        parameters = request.data.get('parameters', {})
        scenario_name = request.data.get('scenario_name', 'Action Plan')

        if not template_id or not candidate_id:
            return Response(
                {'error': 'validation_error', 'message': 'template_id and candidate_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Compile the action into a plan step
        try:
            change_spec = compile_action(template_id, candidate_id, parameters)
        except ValueError as e:
            return Response(
                {'error': 'invalid_action', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Run through decision builder
        try:
            result = run_decision_plan(
                household=request.household,
                plan=[change_spec],
                scenario_name=scenario_name,
            )
        except Exception as e:
            return Response(
                {'error': 'scenario_creation_failed', 'message': str(e)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        return Response({
            'scenario': {
                'id': str(result['scenario'].id),
                'name': result['scenario'].name,
                'created_at': result['scenario'].created_at.isoformat(),
            },
            'changes': [
                {
                    'id': str(c.id),
                    'name': c.name,
                    'change_type': c.change_type,
                }
                for c in result.get('changes', [])
            ],
            'summary': result.get('summary', {}),
            'redirect_url': f"/scenarios/{result['scenario'].id}"
        })


class ActionTemplatesView(APIView):
    """
    List all available action templates.

    GET /api/v1/actions/templates/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = []
        for template_id, template in ACTION_TEMPLATES.items():
            templates.append({
                'id': template_id,
                'name': template['name'],
                'description': template['description'],
                'applies_when': template['applies_when'],
                'candidates': [
                    {
                        'id': c.id,
                        'name': c.name,
                        'description': c.description,
                        'change_type': c.change_type,
                        'default_parameters': c.default_parameters,
                        'impact_estimate': c.impact_estimate,
                    }
                    for c in template['candidates']
                ],
            })

        return Response({
            'templates': templates,
            'count': len(templates),
        })
