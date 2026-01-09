from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.views import (
    HouseholdViewSet,
    HouseholdMemberViewSet,
    UserProfileView,
    ChangePasswordView,
    NotificationSettingsView,
    TwoFactorSettingsView,
    SessionsView,
    DataExportView,
)
from apps.accounts.views import AccountViewSet, AssetGroupViewSet
from apps.flows.views import RecurringFlowViewSet
from apps.taxes.views import (
    IncomeSourceViewSet, PreTaxDeductionViewSet,
    PostTaxDeductionViewSet, SelfEmploymentTaxViewSet
)
from apps.metrics.views import (
    MetricSnapshotViewSet, CurrentMetricsView, MetricsHistoryView,
    InsightViewSet, MetricThresholdViewSet
)
from apps.onboarding import views as onboarding_views
from apps.scenarios.views import ScenarioViewSet, ScenarioChangeViewSet, ScenarioComparisonViewSet, LifeEventTemplateViewSet, BaselineView

router = DefaultRouter()
router.register('households', HouseholdViewSet, basename='household')
router.register('members', HouseholdMemberViewSet, basename='member')
router.register('accounts', AccountViewSet, basename='account')
router.register('asset-groups', AssetGroupViewSet, basename='asset-group')
router.register('flows', RecurringFlowViewSet, basename='flow')
router.register('income-sources', IncomeSourceViewSet, basename='income-source')
router.register('pretax-deductions', PreTaxDeductionViewSet, basename='pretax-deduction')
router.register('posttax-deductions', PostTaxDeductionViewSet, basename='posttax-deduction')
router.register('self-employment-tax', SelfEmploymentTaxViewSet, basename='self-employment-tax')
router.register('metric-snapshots', MetricSnapshotViewSet, basename='metric-snapshot')
router.register('insights', InsightViewSet, basename='insight')
router.register('thresholds', MetricThresholdViewSet, basename='threshold')
router.register('scenarios', ScenarioViewSet, basename='scenario')
router.register('scenario-changes', ScenarioChangeViewSet, basename='scenario-change')
router.register('scenario-comparisons', ScenarioComparisonViewSet, basename='scenario-comparison')
router.register('life-event-templates', LifeEventTemplateViewSet, basename='life-event-template')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API v1
    path('api/v1/', include(router.urls)),
    path('api/v1/profile/', UserProfileView.as_view(), name='user-profile'),
    path('api/v1/profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/v1/settings/notifications/', NotificationSettingsView.as_view(), name='notification-settings'),
    path('api/v1/settings/two-factor/', TwoFactorSettingsView.as_view(), name='two-factor-settings'),
    path('api/v1/settings/sessions/', SessionsView.as_view(), name='sessions'),
    path('api/v1/settings/export/', DataExportView.as_view(), name='data-export'),

    # Metrics endpoints
    path('api/v1/metrics/current/', CurrentMetricsView.as_view(), name='metrics-current'),
    path('api/v1/metrics/history/', MetricsHistoryView.as_view(), name='metrics-history'),

    # Onboarding endpoints
    path('api/v1/onboarding/current/', onboarding_views.get_current_step, name='onboarding-current'),
    path('api/v1/onboarding/save/', onboarding_views.save_draft, name='onboarding-save'),
    path('api/v1/onboarding/complete/', onboarding_views.complete_step, name='onboarding-complete'),
    path('api/v1/onboarding/skip/', onboarding_views.skip_step, name='onboarding-skip'),
    path('api/v1/onboarding/back/', onboarding_views.go_back, name='onboarding-back'),

    # Baseline scenario endpoint
    path('api/v1/scenarios/baseline/', BaselineView.as_view(), name='baseline-scenario'),
]
