from datetime import date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied

from .models import Scenario, ScenarioChange, ScenarioProjection, ScenarioComparison, LifeEventTemplate, LifeEventCategory
from .serializers import (
    ScenarioSerializer, ScenarioDetailSerializer, ScenarioChangeSerializer,
    ScenarioProjectionSerializer, ScenarioComparisonSerializer, LifeEventTemplateSerializer
)
from .services import ScenarioEngine


class ScenarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Scenario.objects.filter(household=self.request.household)
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            qs = qs.filter(is_active=True, is_archived=False)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ScenarioDetailSerializer
        return ScenarioSerializer

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)

    @action(detail=True, methods=['post'])
    def compute(self, request, pk=None):
        """Compute projections for this scenario."""
        scenario = self.get_object()
        engine = ScenarioEngine(scenario)
        projections = engine.compute_projection()
        return Response({
            'status': 'computed',
            'projection_count': len(projections)
        })

    @action(detail=True, methods=['get'])
    def projections(self, request, pk=None):
        """Get all projections for this scenario."""
        scenario = self.get_object()
        projections = scenario.projections.all()
        serializer = ScenarioProjectionSerializer(projections, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def compare(self, request):
        """Compare projections across scenarios."""
        scenario_ids = request.data.get('scenario_ids', [])
        scenarios = Scenario.objects.filter(
            household=request.household,
            id__in=scenario_ids
        )

        comparisons = []
        for scenario in scenarios:
            projections = scenario.projections.all()
            comparisons.append({
                'scenario': ScenarioSerializer(scenario).data,
                'projections': ScenarioProjectionSerializer(projections, many=True).data,
            })

        return Response({'results': comparisons})


class ScenarioChangeViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioChangeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        scenario_id = self.request.query_params.get('scenario')
        if scenario_id:
            return ScenarioChange.objects.filter(
                scenario_id=scenario_id,
                scenario__household=self.request.household
            )
        return ScenarioChange.objects.filter(scenario__household=self.request.household)

    def perform_create(self, serializer):
        # Ensure the scenario belongs to the user's household
        scenario = serializer.validated_data['scenario']
        if scenario.household != self.request.household:
            raise PermissionDenied("Cannot add changes to scenarios in other households")
        serializer.save()


class ScenarioComparisonViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioComparisonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScenarioComparison.objects.filter(household=self.request.household)

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)


class LifeEventTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for life event templates (read-only)."""
    serializer_class = LifeEventTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = LifeEventTemplate.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs

    def list(self, request, *args, **kwargs):
        """List templates, grouped by category."""
        queryset = self.get_queryset()

        # If no templates exist in DB, return defaults
        if not queryset.exists():
            templates = LifeEventTemplate.get_default_templates()
            # Group by category
            grouped = {}
            for t in templates:
                cat = t['category']
                cat_display = LifeEventCategory(cat).label
                if cat not in grouped:
                    grouped[cat] = {
                        'category': cat,
                        'category_display': cat_display,
                        'templates': []
                    }
                grouped[cat]['templates'].append(t)

            return Response({
                'results': list(grouped.values()),
                'count': len(templates)
            })

        serializer = self.get_serializer(queryset, many=True)

        # Group by category
        grouped = {}
        for t in serializer.data:
            cat = t['category']
            cat_display = t['category_display']
            if cat not in grouped:
                grouped[cat] = {
                    'category': cat,
                    'category_display': cat_display,
                    'templates': []
                }
            grouped[cat]['templates'].append(t)

        return Response({
            'results': list(grouped.values()),
            'count': len(serializer.data)
        })

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """List available life event categories."""
        return Response({
            'categories': [
                {'value': choice[0], 'label': choice[1]}
                for choice in LifeEventCategory.choices
            ]
        })

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply a template to a scenario, creating changes."""
        template_data = None

        # Try to get from DB first
        try:
            template = self.get_object()
            template_data = {
                'name': template.name,
                'suggested_changes': template.suggested_changes,
            }
        except Exception:
            # Fall back to defaults
            templates = LifeEventTemplate.get_default_templates()
            for t in templates:
                if str(t.get('id', '')) == pk or t['name'] == pk:
                    template_data = t
                    break

        if not template_data:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        scenario_id = request.data.get('scenario_id')
        effective_date = request.data.get('effective_date', str(date.today()))
        change_values = request.data.get('change_values', {})  # User-provided values

        try:
            scenario = Scenario.objects.get(
                id=scenario_id,
                household=request.household
            )
        except Scenario.DoesNotExist:
            return Response(
                {'error': 'Scenario not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        created_changes = []
        suggested_changes = template_data.get('suggested_changes', [])

        for idx, change_template in enumerate(suggested_changes):
            # Get user values for this change (by index or name)
            user_values = change_values.get(str(idx), change_values.get(change_template['name'], {}))

            # Skip if user explicitly disabled this change
            if user_values.get('_skip', False):
                continue

            # Merge template parameters with user values
            parameters = {**change_template.get('parameters_template', {}), **user_values}

            # Remove internal flags
            parameters.pop('_skip', None)

            change = ScenarioChange.objects.create(
                scenario=scenario,
                change_type=change_template['change_type'],
                name=change_template['name'],
                description=change_template.get('description', ''),
                effective_date=effective_date,
                parameters=parameters,
                display_order=idx,
                is_enabled=True,
            )
            created_changes.append(change)

        return Response({
            'status': 'applied',
            'template_name': template_data['name'],
            'changes_created': len(created_changes),
            'changes': ScenarioChangeSerializer(created_changes, many=True).data
        })
