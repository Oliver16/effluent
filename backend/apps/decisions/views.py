from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import DecisionTemplate, DecisionRun, DecisionCategory
from .serializers import (
    DecisionTemplateListSerializer,
    DecisionTemplateDetailSerializer,
    DecisionRunInputSerializer,
    DecisionDraftInputSerializer,
    DecisionRunSerializer,
    DecisionRunResponseSerializer,
)
from .compiler import compile_decision, DecisionCompilerError
from apps.scenarios.models import Scenario, ScenarioProjection
from apps.goals.services import GoalEvaluationService


class DecisionTemplateViewSet(ViewSet):
    """
    ViewSet for decision templates.

    GET /api/decisions/templates/
        List all active templates grouped by category

    GET /api/decisions/templates/{key}/
        Get a specific template by key
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List all active decision templates grouped by category."""
        templates = DecisionTemplate.objects.filter(is_active=True).order_by('category', 'sort_order', 'name')

        # Group by category
        grouped = {}
        for template in templates:
            category = template.category
            if category not in grouped:
                grouped[category] = {
                    'category': category,
                    'category_display': DecisionCategory(category).label,
                    'templates': [],
                }
            grouped[category]['templates'].append(
                DecisionTemplateListSerializer(template).data
            )

        # Convert to list and sort by category
        result = list(grouped.values())
        category_order = [c.value for c in DecisionCategory]
        result.sort(key=lambda x: category_order.index(x['category']) if x['category'] in category_order else 999)

        return Response({
            'results': result,
            'count': templates.count(),
        })

    def retrieve(self, request, pk=None):
        """Get a specific template by key."""
        template = DecisionTemplate.objects.filter(key=pk, is_active=True).first()
        if not template:
            return Response(
                {'detail': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DecisionTemplateDetailSerializer(template)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of available categories."""
        categories = [
            {'value': c.value, 'label': c.label}
            for c in DecisionCategory
        ]
        return Response({'categories': categories})


class DecisionRunViewSet(ViewSet):
    """
    ViewSet for decision runs.

    POST /api/decisions/run/
        Execute a decision template and create a scenario

    POST /api/decisions/draft/
        Save a decision as a draft for later

    GET /api/decisions/runs/
        List user's decision runs

    GET /api/decisions/runs/{id}/
        Get a specific decision run

    POST /api/decisions/runs/{id}/complete/
        Complete a draft decision run
    """
    permission_classes = [IsAuthenticated]

    def get_household(self, request):
        """Get the household from the request."""
        return getattr(request, 'household', None)

    def _build_comparison_summary(self, household, scenario):
        """Build baseline vs scenario comparison summary."""
        # Get baseline scenario
        baseline = Scenario.objects.filter(
            household=household,
            is_baseline=True
        ).first()

        if not baseline:
            return None

        # Get last projection from both scenarios
        baseline_proj = ScenarioProjection.objects.filter(
            scenario=baseline
        ).order_by('-month_number').first()

        scenario_proj = ScenarioProjection.objects.filter(
            scenario=scenario
        ).order_by('-month_number').first()

        if not baseline_proj or not scenario_proj:
            return None

        # Build metric comparison
        def get_metrics(proj):
            return {
                'net_worth': str(proj.net_worth),
                'liquidity_months': str(proj.liquidity_months),
                'dscr': str(proj.dscr),
                'savings_rate': str(proj.savings_rate),
                'monthly_surplus': str(proj.net_cash_flow),
            }

        # Get goal status for both
        goal_service = GoalEvaluationService(household)
        baseline_goals = goal_service.evaluate_goals()
        scenario_goals = goal_service.evaluate_goals(scenario_id=str(scenario.id))

        # Convert to serializable format
        def serialize_goal_status(statuses):
            return [
                {
                    'goal_id': str(s.goal_id),
                    'goal_type': s.goal_type,
                    'goal_name': s.goal_name,  # Fixed: was 's.name' which doesn't exist on GoalStatusDTO
                    'target_value': s.target_value,
                    'current_value': s.current_value,
                    'status': s.status,
                    'delta_to_target': s.delta_to_target,
                }
                for s in statuses
            ]

        # Generate takeaways
        takeaways = self._generate_takeaways(baseline_proj, scenario_proj)

        return {
            'baseline': get_metrics(baseline_proj),
            'scenario': get_metrics(scenario_proj),
            'goal_status': {
                'baseline': serialize_goal_status(baseline_goals),
                'scenario': serialize_goal_status(scenario_goals),
            },
            'takeaways': takeaways,
        }

    def _generate_takeaways(self, baseline_proj, scenario_proj):
        """Generate human-readable takeaways from comparison."""
        takeaways = []

        # Net worth comparison
        baseline_nw = Decimal(str(baseline_proj.net_worth))
        scenario_nw = Decimal(str(scenario_proj.net_worth))
        nw_diff = scenario_nw - baseline_nw

        if nw_diff > 0:
            takeaways.append(f"Net worth +${nw_diff:,.0f} by month {scenario_proj.month_number}")
        elif nw_diff < 0:
            takeaways.append(f"Net worth ${nw_diff:,.0f} by month {scenario_proj.month_number}")

        # Savings rate comparison
        baseline_sr = Decimal(str(baseline_proj.savings_rate))
        scenario_sr = Decimal(str(scenario_proj.savings_rate))
        sr_diff = scenario_sr - baseline_sr

        if sr_diff > 1:
            takeaways.append(f"Savings rate improves by {sr_diff:.1f}%")
        elif sr_diff < -1:
            takeaways.append(f"Savings rate decreases by {abs(sr_diff):.1f}%")

        # Cash flow comparison
        baseline_cf = Decimal(str(baseline_proj.net_cash_flow))
        scenario_cf = Decimal(str(scenario_proj.net_cash_flow))
        cf_diff = scenario_cf - baseline_cf

        if cf_diff > 100:
            takeaways.append(f"Monthly cash flow +${cf_diff:,.0f}")
        elif cf_diff < -100:
            takeaways.append(f"Monthly cash flow ${cf_diff:,.0f}")

        return takeaways[:3]  # Return max 3 takeaways

    @action(detail=False, methods=['post'], url_path='run')
    def run_decision(self, request):
        """Execute a decision template and create a scenario."""
        serializer = DecisionRunInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        household = self.get_household(request)
        if not household:
            return Response(
                {'detail': 'Household not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        template_key = serializer.validated_data['template_key']
        inputs = serializer.validated_data['inputs']
        scenario_name_override = serializer.validated_data.get('scenario_name_override', '')

        # Get the template
        template = DecisionTemplate.objects.filter(key=template_key, is_active=True).first()
        if not template:
            return Response(
                {'detail': f"Template '{template_key}' not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Compile the decision
            scenario, changes = compile_decision(
                template_key=template_key,
                inputs=inputs,
                household=household,
                scenario_name_override=scenario_name_override or None,
            )

            # Create the decision run record
            run = DecisionRun.objects.create(
                household=household,
                template=template,
                template_key=template_key,
                inputs=inputs,
                created_scenario=scenario,
                scenario_name_override=scenario_name_override,
                is_draft=False,
                completed_at=timezone.now(),
            )

            # Build comparison summary
            summary = self._build_comparison_summary(household, scenario)

            # Build response
            response_data = {
                'scenario_id': scenario.id,
                'scenario_name': scenario.name,
                'decision_run_id': run.id,
                'changes_created': len(changes),
                'scenario': scenario,  # For projections serializer
                'summary': summary,
            }

            response_serializer = DecisionRunResponseSerializer(response_data)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except DecisionCompilerError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'detail': f'Error creating scenario: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='draft')
    def save_draft(self, request):
        """Save a decision as a draft for later."""
        serializer = DecisionDraftInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        household = self.get_household(request)
        if not household:
            return Response(
                {'detail': 'Household not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        template_key = serializer.validated_data['template_key']
        inputs = serializer.validated_data['inputs']

        # Get the template
        template = DecisionTemplate.objects.filter(key=template_key, is_active=True).first()

        # Create or update draft
        run, created = DecisionRun.objects.update_or_create(
            household=household,
            template_key=template_key,
            is_draft=True,
            created_scenario__isnull=True,
            defaults={
                'template': template,
                'inputs': inputs,
            }
        )

        return Response({
            'id': run.id,
            'saved': True,
            'created': created,
        })

    @action(detail=False, methods=['get'], url_path='runs')
    def list_runs(self, request):
        """List user's decision runs."""
        household = self.get_household(request)
        if not household:
            return Response({'results': []})

        runs = DecisionRun.objects.filter(household=household).order_by('-created_at')
        serializer = DecisionRunSerializer(runs, many=True)
        return Response({
            'results': serializer.data,
            'count': runs.count(),
        })

    @action(detail=True, methods=['get'], url_path='detail')
    def get_run(self, request, pk=None):
        """Get a specific decision run."""
        household = self.get_household(request)
        if not household:
            return Response(
                {'detail': 'Household not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            run = DecisionRun.objects.get(id=pk, household=household)
        except DecisionRun.DoesNotExist:
            return Response(
                {'detail': 'Decision run not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DecisionRunSerializer(run)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_draft(self, request, pk=None):
        """Complete a draft decision run."""
        household = self.get_household(request)
        if not household:
            return Response(
                {'detail': 'Household not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            run = DecisionRun.objects.get(id=pk, household=household, is_draft=True)
        except DecisionRun.DoesNotExist:
            return Response(
                {'detail': 'Draft not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Allow updating inputs if provided
        if 'inputs' in request.data:
            run.inputs = request.data['inputs']
            run.save()

        scenario_name_override = request.data.get('scenario_name_override', run.scenario_name_override)

        try:
            # Compile the decision
            scenario, changes = compile_decision(
                template_key=run.template_key,
                inputs=run.inputs,
                household=household,
                scenario_name_override=scenario_name_override or None,
            )

            # Update the run
            run.created_scenario = scenario
            run.scenario_name_override = scenario_name_override or ''
            run.is_draft = False
            run.completed_at = timezone.now()
            run.save()

            # Build response
            response_data = {
                'scenario_id': scenario.id,
                'scenario_name': scenario.name,
                'decision_run_id': run.id,
                'changes_created': len(changes),
                'scenario': scenario,
            }

            response_serializer = DecisionRunResponseSerializer(response_data)
            return Response(response_serializer.data)

        except DecisionCompilerError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_draft(self, request, pk=None):
        """Delete a draft decision run."""
        household = self.get_household(request)
        if not household:
            return Response(
                {'detail': 'Household not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            run = DecisionRun.objects.get(id=pk, household=household, is_draft=True)
        except DecisionRun.DoesNotExist:
            return Response(
                {'detail': 'Draft not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        run.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
