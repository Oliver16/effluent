"""URL Configuration for Effluent backend."""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Import views
from apps.core.views import ProfileView, PasswordChangeView
from apps.households.views import HouseholdViewSet, HouseholdMemberViewSet
from apps.accounts.views import AccountViewSet
from apps.flows.views import RecurringFlowViewSet
from apps.taxes.views import (
    IncomeSourceViewSet, W2WithholdingViewSet,
    PreTaxDeductionViewSet, PostTaxDeductionViewSet,
    SelfEmploymentTaxViewSet, TaxSummaryView
)
from apps.metrics.views import (
    MetricSnapshotViewSet, CurrentMetricsView, MetricsHistoryView,
    InsightViewSet, MetricThresholdViewSet, DataQualityView
)
from apps.onboarding.views import (
    OnboardingCurrentView, OnboardingSaveView, OnboardingCompleteView,
    OnboardingSkipView, OnboardingBackView
)
from apps.scenarios.views import (
    ScenarioViewSet, ScenarioChangeViewSet, LifeEventTemplateViewSet
)
from apps.decisions.views import DecisionTemplateViewSet, DecisionRunViewSet
from apps.goals.views import GoalViewSet, GoalStatusView, GoalSolutionViewSet
from apps.actions.views import NextActionsView, ApplyActionView, ActionTemplatesView
from apps.stress_tests.views import StressTestListView, StressTestRunView, StressTestBatchRunView

# Create routers
router = DefaultRouter()
router.register('households', HouseholdViewSet, basename='household')
router.register('members', HouseholdMemberViewSet, basename='member')
router.register('accounts', AccountViewSet, basename='account')
router.register('flows', RecurringFlowViewSet, basename='flow')
router.register('income-sources', IncomeSourceViewSet, basename='income-source')
router.register('w2-withholding', W2WithholdingViewSet, basename='w2-withholding')
router.register('pretax-deductions', PreTaxDeductionViewSet, basename='pretax-deduction')
router.register('posttax-deductions', PostTaxDeductionViewSet, basename='posttax-deduction')
router.register('self-employment-tax', SelfEmploymentTaxViewSet, basename='self-employment-tax')
router.register('metric-snapshots', MetricSnapshotViewSet, basename='metric-snapshot')
router.register('insights', InsightViewSet, basename='insight')
router.register('thresholds', MetricThresholdViewSet, basename='threshold')
router.register('scenarios', ScenarioViewSet, basename='scenario')
router.register('scenario-changes', ScenarioChangeViewSet, basename='scenario-change')
router.register('life-event-templates', LifeEventTemplateViewSet, basename='life-event-template')
router.register('goals', GoalViewSet, basename='goal')
router.register('goal-solutions', GoalSolutionViewSet, basename='goal-solution')

# Decision router
decision_router = DefaultRouter()
decision_router.register('templates', DecisionTemplateViewSet, basename='decision-template')
decision_router.register('runs', DecisionRunViewSet, basename='decision-run')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API v1
    path('api/v1/', include(router.urls)),

    # Profile
    path('api/v1/profile/', ProfileView.as_view(), name='profile'),
    path('api/v1/profile/change-password/', PasswordChangeView.as_view(), name='password-change'),

    # Metrics
    path('api/v1/metrics/current/', CurrentMetricsView.as_view(), name='metrics-current'),
    path('api/v1/metrics/history/', MetricsHistoryView.as_view(), name='metrics-history'),
    path('api/v1/metrics/data-quality/', DataQualityView.as_view(), name='data-quality'),

    # Onboarding
    path('api/v1/onboarding/current/', OnboardingCurrentView.as_view(), name='onboarding-current'),
    path('api/v1/onboarding/save/', OnboardingSaveView.as_view(), name='onboarding-save'),
    path('api/v1/onboarding/complete/', OnboardingCompleteView.as_view(), name='onboarding-complete'),
    path('api/v1/onboarding/skip/', OnboardingSkipView.as_view(), name='onboarding-skip'),
    path('api/v1/onboarding/back/', OnboardingBackView.as_view(), name='onboarding-back'),

    # Decisions
    path('api/v1/decisions/', include(decision_router.urls)),
    path('api/v1/decisions/run/', DecisionRunViewSet.as_view({'post': 'run_decision'}), name='decision-run'),
    path('api/v1/decisions/draft/', DecisionRunViewSet.as_view({'post': 'save_draft'}), name='decision-draft'),

    # Goals
    path('api/v1/goals/status/', GoalStatusView.as_view(), name='goal-status'),

    # Taxes
    path('api/v1/taxes/summary/', TaxSummaryView.as_view(), name='tax-summary'),

    # Actions (TASK-14)
    path('api/v1/actions/next/', NextActionsView.as_view(), name='actions-next'),
    path('api/v1/actions/apply/', ApplyActionView.as_view(), name='actions-apply'),
    path('api/v1/actions/templates/', ActionTemplatesView.as_view(), name='actions-templates'),

    # Stress Tests (TASK-15)
    path('api/v1/stress-tests/', StressTestListView.as_view(), name='stress-test-list'),
    path('api/v1/stress-tests/run/', StressTestRunView.as_view(), name='stress-test-run'),
    path('api/v1/stress-tests/batch/', StressTestBatchRunView.as_view(), name='stress-test-batch'),
]
