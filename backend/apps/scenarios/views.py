from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import Scenario, ScenarioChange, ScenarioProjection, ScenarioComparison
from .serializers import (
    ScenarioSerializer, ScenarioDetailSerializer, ScenarioChangeSerializer,
    ScenarioProjectionSerializer, ScenarioComparisonSerializer
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
