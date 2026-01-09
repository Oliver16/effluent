from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from datetime import date, timedelta

from .models import MetricSnapshot, MetricThreshold, Insight
from .serializers import MetricSnapshotSerializer, MetricThresholdSerializer, InsightSerializer
from .services import MetricsCalculator, InsightGenerator
from .data_quality import DataQualityService


class MetricSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MetricSnapshotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MetricSnapshot.objects.filter(household=self.request.household)


class CurrentMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current calculated metrics."""
        household = request.household
        calc = MetricsCalculator(household)
        snapshot = calc.calculate_all_metrics()
        serializer = MetricSnapshotSerializer(snapshot)
        return Response(serializer.data)

    def post(self, request):
        """Calculate and save metrics snapshot."""
        household = request.household
        calc = MetricsCalculator(household)
        snapshot = calc.calculate_all_metrics()

        # Generate insights
        gen = InsightGenerator(household)
        gen.generate_insights(snapshot)

        serializer = MetricSnapshotSerializer(snapshot)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MetricsHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 90))
            # Validate range: 1-3650 days (up to 10 years)
            days = max(1, min(days, 3650))
        except (ValueError, TypeError):
            days = 90
        since = date.today() - timedelta(days=days)
        snapshots = MetricSnapshot.objects.filter(
            household=request.household,
            as_of_date__gte=since
        ).order_by('-as_of_date')
        serializer = MetricSnapshotSerializer(snapshots, many=True)
        return Response({'results': serializer.data})


class InsightViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InsightSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Insight.objects.filter(household=self.request.household)
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            qs = qs.filter(is_dismissed=False)
        return qs

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        insight = self.get_object()
        insight.is_dismissed = True
        insight.save()
        return Response({'status': 'dismissed'})


class MetricThresholdViewSet(viewsets.ModelViewSet):
    serializer_class = MetricThresholdSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MetricThreshold.objects.filter(household=self.request.household)

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)


class DataQualityView(APIView):
    """
    API endpoint for data quality and model confidence assessment.

    Returns a report indicating data completeness and confidence level.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get data quality report for the household."""
        household = request.household
        service = DataQualityService(household)
        report = service.build_report()

        return Response({
            'confidence_level': report.confidence_level,
            'confidence_score': report.confidence_score,
            'missing': [
                {
                    'key': item.key,
                    'severity': item.severity,
                    'title': item.title,
                    'description': item.description,
                    'cta': item.cta,
                }
                for item in report.missing
            ],
            'warnings': [
                {
                    'key': item.key,
                    'severity': item.severity,
                    'title': item.title,
                    'description': item.description,
                    'cta': item.cta,
                }
                for item in report.warnings
            ],
        })
