# Task 9: REST API Endpoints

## Objective
Create comprehensive REST API endpoints using Django REST Framework for all models.

## Prerequisites
- Tasks 1-5 completed

## Deliverables
1. ViewSets for all models
2. Serializers with nested relationships
3. Household-scoped querysets
4. Custom actions (balance update, metrics calculation)
5. URL routing

---

## apps/core/views.py

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.text import slugify
import uuid

from .models import Household, HouseholdMember, HouseholdMembership
from .serializers import (
    HouseholdSerializer, HouseholdDetailSerializer,
    HouseholdMemberSerializer, HouseholdMembershipSerializer
)


class HouseholdViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Household.objects.filter(memberships__user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return HouseholdDetailSerializer
        return HouseholdSerializer
    
    def perform_create(self, serializer):
        household = serializer.save(
            slug=slugify(serializer.validated_data['name']) + '-' + str(uuid.uuid4())[:8]
        )
        HouseholdMembership.objects.create(
            user=self.request.user,
            household=household,
            role='owner',
            is_default=True
        )
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        household = self.get_object()
        HouseholdMembership.objects.filter(user=request.user).update(is_default=False)
        HouseholdMembership.objects.filter(user=request.user, household=household).update(is_default=True)
        return Response({'status': 'set as default'})


class HouseholdMemberViewSet(viewsets.ModelViewSet):
    serializer_class = HouseholdMemberSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return HouseholdMember.objects.filter(household=self.request.household)
    
    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
```

---

## apps/accounts/views.py

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import date
from decimal import Decimal

from .models import Account, BalanceSnapshot, AssetGroup, LiabilityDetails, AssetDetails
from .serializers import (
    AccountSerializer, AccountDetailSerializer,
    BalanceSnapshotSerializer, AssetGroupSerializer
)


class AccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = Account.objects.filter(household=self.request.household)
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            qs = qs.filter(is_active=True)
        account_type = self.request.query_params.get('type')
        if account_type:
            qs = qs.filter(account_type=account_type)
        return qs.select_related('asset_group', 'owner').prefetch_related('snapshots')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AccountDetailSerializer
        return AccountSerializer
    
    def perform_create(self, serializer):
        account = serializer.save(household=self.request.household)
        # Create initial balance snapshot if provided
        balance = self.request.data.get('initial_balance')
        if balance:
            BalanceSnapshot.objects.create(
                account=account,
                as_of_date=date.today(),
                balance=Decimal(str(balance))
            )
    
    @action(detail=True, methods=['post'])
    def balance(self, request, pk=None):
        """Update account balance with new snapshot."""
        account = self.get_object()
        serializer = BalanceSnapshotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(account=account)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get balance history for account."""
        account = self.get_object()
        snapshots = account.snapshots.all()[:30]
        serializer = BalanceSnapshotSerializer(snapshots, many=True)
        return Response(serializer.data)


class AssetGroupViewSet(viewsets.ModelViewSet):
    serializer_class = AssetGroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AssetGroup.objects.filter(household=self.request.household)
    
    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
```

---

## apps/flows/views.py

```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import RecurringFlow
from .serializers import RecurringFlowSerializer


class RecurringFlowViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['flow_type', 'is_active', 'is_baseline']
    
    def get_queryset(self):
        return RecurringFlow.objects.filter(household=self.request.household)
    
    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
```

---

## apps/taxes/views.py

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import IncomeSource, PreTaxDeduction
from .serializers import IncomeSourceSerializer, IncomeSourceDetailSerializer, PreTaxDeductionSerializer
from .services import PaycheckCalculator


class IncomeSourceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return IncomeSource.objects.filter(household=self.request.household)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return IncomeSourceDetailSerializer
        return IncomeSourceSerializer
    
    def perform_create(self, serializer):
        serializer.save(household=self.request.household)
    
    @action(detail=True, methods=['get'])
    def paycheck(self, request, pk=None):
        """Calculate paycheck breakdown."""
        income_source = self.get_object()
        calc = PaycheckCalculator(income_source)
        breakdown = calc.calculate_paycheck()
        return Response({
            'gross_pay': str(breakdown.gross_pay),
            'pretax_retirement': str(breakdown.pretax_retirement),
            'pretax_health': str(breakdown.pretax_health),
            'pretax_other': str(breakdown.pretax_other),
            'federal_withholding': str(breakdown.federal_withholding),
            'social_security_tax': str(breakdown.social_security_tax),
            'medicare_tax': str(breakdown.medicare_tax),
            'state_withholding': str(breakdown.state_withholding),
            'total_taxes': str(breakdown.total_taxes),
            'net_pay': str(breakdown.net_pay),
            'employer_match': str(breakdown.employer_match),
            'effective_tax_rate': str(breakdown.effective_tax_rate),
        })
```

---

## apps/metrics/views.py

```python
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
        metrics = calc.calculate_all()
        return Response({
            'as_of_date': date.today().isoformat(),
            **{k: str(getattr(metrics, k)) for k in metrics.__dataclass_fields__}
        })
    
    def post(self, request):
        """Calculate and save metrics snapshot."""
        household = request.household
        calc = MetricsCalculator(household)
        snapshot = calc.save_snapshot()
        
        # Generate insights
        metrics = calc.calculate_all()
        gen = InsightGenerator(household, metrics)
        gen.save_insights()
        
        serializer = MetricSnapshotSerializer(snapshot)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MetricsHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        days = int(request.query_params.get('days', 90))
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
```

---

## apps/onboarding/views.py

```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .services import OnboardingService


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_step(request):
    service = OnboardingService(request.household)
    return Response(service.get_current_step())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_draft(request):
    service = OnboardingService(request.household)
    result = service.save_draft(request.data)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_step(request):
    service = OnboardingService(request.household)
    result = service.complete_step(request.data)
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def skip_step(request):
    service = OnboardingService(request.household)
    result = service.skip_step()
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def go_back(request):
    service = OnboardingService(request.household)
    result = service.go_back()
    if result['success']:
        return Response(result)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)
```

---

## config/urls.py

```python
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.views import HouseholdViewSet, HouseholdMemberViewSet
from apps.accounts.views import AccountViewSet, AssetGroupViewSet
from apps.flows.views import RecurringFlowViewSet
from apps.taxes.views import IncomeSourceViewSet
from apps.metrics.views import (
    MetricSnapshotViewSet, CurrentMetricsView, MetricsHistoryView,
    InsightViewSet, MetricThresholdViewSet
)
from apps.onboarding import views as onboarding_views

router = DefaultRouter()
router.register('households', HouseholdViewSet, basename='household')
router.register('members', HouseholdMemberViewSet, basename='member')
router.register('accounts', AccountViewSet, basename='account')
router.register('asset-groups', AssetGroupViewSet, basename='asset-group')
router.register('flows', RecurringFlowViewSet, basename='flow')
router.register('income-sources', IncomeSourceViewSet, basename='income-source')
router.register('metric-snapshots', MetricSnapshotViewSet, basename='metric-snapshot')
router.register('insights', InsightViewSet, basename='insight')
router.register('thresholds', MetricThresholdViewSet, basename='threshold')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API v1
    path('api/v1/', include(router.urls)),
    
    # Metrics endpoints
    path('api/v1/metrics/current/', CurrentMetricsView.as_view(), name='metrics-current'),
    path('api/v1/metrics/history/', MetricsHistoryView.as_view(), name='metrics-history'),
    
    # Onboarding endpoints
    path('api/v1/onboarding/current/', onboarding_views.get_current_step, name='onboarding-current'),
    path('api/v1/onboarding/save/', onboarding_views.save_draft, name='onboarding-save'),
    path('api/v1/onboarding/complete/', onboarding_views.complete_step, name='onboarding-complete'),
    path('api/v1/onboarding/skip/', onboarding_views.skip_step, name='onboarding-skip'),
    path('api/v1/onboarding/back/', onboarding_views.go_back, name='onboarding-back'),
]
```

---

## API Endpoint Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/households/` | GET, POST | List/create households |
| `/api/v1/households/{id}/` | GET, PUT, DELETE | Household detail |
| `/api/v1/households/{id}/set_default/` | POST | Set as default |
| `/api/v1/members/` | GET, POST | Household members |
| `/api/v1/accounts/` | GET, POST | List/create accounts |
| `/api/v1/accounts/{id}/balance/` | POST | Update balance |
| `/api/v1/accounts/{id}/history/` | GET | Balance history |
| `/api/v1/flows/` | GET, POST | Recurring flows |
| `/api/v1/income-sources/` | GET, POST | Income sources |
| `/api/v1/income-sources/{id}/paycheck/` | GET | Calculate paycheck |
| `/api/v1/metrics/current/` | GET, POST | Current metrics |
| `/api/v1/metrics/history/` | GET | Metrics history |
| `/api/v1/insights/` | GET | Active insights |
| `/api/v1/insights/{id}/dismiss/` | POST | Dismiss insight |
| `/api/v1/onboarding/current/` | GET | Current step |
| `/api/v1/onboarding/complete/` | POST | Complete step |

---

## Acceptance Criteria
- [ ] All endpoints return correct data
- [ ] Household scoping works (users only see their data)
- [ ] Balance update creates snapshot
- [ ] Paycheck calculation endpoint works
- [ ] Metrics calculation endpoint works
- [ ] Onboarding endpoints work
- [ ] JWT authentication required
