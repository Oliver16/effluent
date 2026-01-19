"""URL Configuration for Effluent backend."""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView

# Import views
from apps.core.views import (
    UserProfileView, ChangePasswordView, UserRegistrationView, TokenRefreshView,
    HouseholdViewSet, HouseholdMemberViewSet,
    NotificationSettingsView, TwoFactorSettingsView, SessionsView, DataExportView
)
from apps.core.views_health import HealthCheckView, CeleryHealthCheckView
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
    get_current_step as onboarding_current,
    save_draft as onboarding_save,
    complete_step as onboarding_complete,
    skip_step as onboarding_skip,
    go_back as onboarding_back
)
from apps.scenarios.views import (
    ScenarioViewSet, ScenarioChangeViewSet, LifeEventTemplateViewSet, BaselineView, ScenarioTaskStatusView, TaskManagementView, TaskControlView, AdminTasksView
)
from apps.decisions.views import DecisionTemplateViewSet, DecisionRunViewSet
from apps.goals.views import GoalViewSet, GoalStatusView, GoalSolutionViewSet
from apps.actions.views import NextActionsView, ApplyActionView, ActionTemplatesView
from apps.stress_tests.views import StressTestListView, StressTestRunView, StressTestBatchRunView, StressTestTaskStatusView, StressTestAnalysisView

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
    # Health checks (public endpoints for monitoring)
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('health/celery/', CeleryHealthCheckView.as_view(), name='celery-health-check'),

    # Admin
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', UserRegistrationView.as_view(), name='user_register'),

    # API v1
    path('api/v1/', include(router.urls)),

    # Profile
    path('api/v1/profile/', UserProfileView.as_view(), name='profile'),
    path('api/v1/profile/change-password/', ChangePasswordView.as_view(), name='password-change'),

    # Settings
    path('api/v1/settings/notifications/', NotificationSettingsView.as_view(), name='settings-notifications'),
    path('api/v1/settings/two-factor/', TwoFactorSettingsView.as_view(), name='settings-two-factor'),
    path('api/v1/settings/sessions/', SessionsView.as_view(), name='settings-sessions'),
    path('api/v1/settings/export/', DataExportView.as_view(), name='settings-export'),

    # Metrics
    path('api/v1/metrics/current/', CurrentMetricsView.as_view(), name='metrics-current'),
    path('api/v1/metrics/history/', MetricsHistoryView.as_view(), name='metrics-history'),
    path('api/v1/metrics/data-quality/', DataQualityView.as_view(), name='data-quality'),

    # Onboarding
    path('api/v1/onboarding/current/', onboarding_current, name='onboarding-current'),
    path('api/v1/onboarding/save/', onboarding_save, name='onboarding-save'),
    path('api/v1/onboarding/complete/', onboarding_complete, name='onboarding-complete'),
    path('api/v1/onboarding/skip/', onboarding_skip, name='onboarding-skip'),
    path('api/v1/onboarding/back/', onboarding_back, name='onboarding-back'),

    # Decisions
    path('api/v1/decisions/', include(decision_router.urls)),
    path('api/v1/decisions/run/', DecisionRunViewSet.as_view({'post': 'run_decision'}), name='decision-run'),
    path('api/v1/decisions/draft/', DecisionRunViewSet.as_view({'post': 'save_draft'}), name='decision-draft'),
    path('api/v1/decisions/runs/', DecisionRunViewSet.as_view({'get': 'list_runs'}), name='decision-runs-list'),
    path('api/v1/decisions/runs/<uuid:pk>/', DecisionRunViewSet.as_view({'get': 'get_run'}), name='decision-run-detail'),
    path('api/v1/decisions/runs/<uuid:pk>/complete/', DecisionRunViewSet.as_view({'post': 'complete_draft'}), name='decision-complete'),
    path('api/v1/decisions/runs/<uuid:pk>/delete/', DecisionRunViewSet.as_view({'delete': 'delete_draft'}), name='decision-delete'),

    # Baseline Scenario
    path('api/v1/scenarios/baseline/', BaselineView.as_view(), name='baseline'),

    # Scenario Task Status and Control
    path('api/v1/scenarios/tasks/', TaskManagementView.as_view(), name='task-management'),
    path('api/v1/scenarios/tasks/<str:task_id>/', ScenarioTaskStatusView.as_view(), name='scenario-task-status'),
    path('api/v1/scenarios/tasks/<str:task_id>/control/', TaskControlView.as_view(), name='task-control'),

    # Admin Tasks (manual triggers for scheduled background tasks)
    path('api/v1/scenarios/admin-tasks/', AdminTasksView.as_view(), name='admin-tasks'),

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
    path('api/v1/stress-tests/analyze/', StressTestAnalysisView.as_view(), name='stress-test-analyze'),
    path('api/v1/stress-tests/status/<str:task_id>/', StressTestTaskStatusView.as_view(), name='stress-test-task-status'),
]
