from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from datetime import date, timedelta

from .models import MetricSnapshot, MetricThreshold, Insight
from .serializers import MetricSnapshotSerializer, MetricThresholdSerializer, InsightSerializer
from .services import MetricsCalculator, InsightGenerator


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
    Data quality report endpoint.

    GET /api/v1/metrics/data-quality/

    Returns a report on data completeness and modeling confidence.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get data quality report for the household."""
        from apps.accounts.models import Account, ASSET_TYPES, LIABILITY_TYPES
        from apps.flows.models import RecurringFlow, FlowType
        from apps.taxes.models import IncomeSource

        household = request.household
        issues = []
        warnings = []

        # Check for accounts
        accounts = Account.objects.filter(household=household, is_active=True)
        asset_count = accounts.filter(account_type__in=ASSET_TYPES).count()
        liability_count = accounts.filter(account_type__in=LIABILITY_TYPES).count()

        if asset_count == 0:
            issues.append({
                'field': 'accounts',
                'message': 'No asset accounts found. Add at least one checking or savings account.',
                'severity': 'critical'
            })

        # Check for stale account balances
        stale_date = date.today() - timedelta(days=30)
        for acct in accounts:
            snapshot = acct.latest_snapshot
            if snapshot and snapshot.snapshot_date < stale_date:
                warnings.append({
                    'field': 'accounts',
                    'message': f'Balance for "{acct.name}" is over 30 days old.',
                    'severity': 'warning',
                    'account_id': str(acct.id)
                })

        # Check for income sources
        income_sources = IncomeSource.objects.filter(household=household, is_active=True)
        if income_sources.count() == 0:
            issues.append({
                'field': 'income',
                'message': 'No income sources found. Add your salary or other income.',
                'severity': 'critical'
            })

        # Check for incomplete income sources
        for source in income_sources:
            if not source.gross_annual or source.gross_annual <= 0:
                issues.append({
                    'field': 'income',
                    'message': f'Income source "{source.name}" has no gross annual amount.',
                    'severity': 'warning',
                    'source_id': str(source.id)
                })

        # Check for expense flows
        expense_flows = RecurringFlow.objects.filter(
            household=household,
            flow_type=FlowType.EXPENSE,
            is_active=True
        )
        if expense_flows.count() == 0:
            warnings.append({
                'field': 'expenses',
                'message': 'No recurring expenses found. Add your regular bills and expenses for better projections.',
                'severity': 'warning'
            })

        # Check for liability details
        liability_accounts = accounts.filter(account_type__in=LIABILITY_TYPES)
        for acct in liability_accounts:
            if not hasattr(acct, 'liability_details') or not acct.liability_details:
                warnings.append({
                    'field': 'liabilities',
                    'message': f'Debt account "{acct.name}" is missing interest rate and payment details.',
                    'severity': 'warning',
                    'account_id': str(acct.id)
                })
            elif acct.liability_details and not acct.liability_details.interest_rate:
                warnings.append({
                    'field': 'liabilities',
                    'message': f'Debt account "{acct.name}" has no interest rate.',
                    'severity': 'info',
                    'account_id': str(acct.id)
                })

        # Calculate confidence score
        total_checks = 10  # Base checks
        failed_critical = len([i for i in issues if i.get('severity') == 'critical'])
        failed_warning = len(warnings)

        confidence = max(0, 100 - (failed_critical * 20) - (failed_warning * 5))

        # Determine confidence tier
        if confidence >= 80:
            tier = 'high'
            tier_description = 'Data is complete and projections are highly reliable.'
        elif confidence >= 50:
            tier = 'medium'
            tier_description = 'Some data is missing. Projections may not be fully accurate.'
        else:
            tier = 'low'
            tier_description = 'Significant data is missing. Please complete your profile for accurate projections.'

        return Response({
            'confidence_score': confidence,
            'confidence_tier': tier,
            'tier_description': tier_description,
            'issues': issues,
            'warnings': warnings,
            'summary': {
                'asset_accounts': asset_count,
                'liability_accounts': liability_count,
                'income_sources': income_sources.count(),
                'expense_flows': expense_flows.count(),
            }
        })
