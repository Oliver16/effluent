from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DecisionTemplateViewSet, DecisionRunViewSet

router = DefaultRouter()

# Template endpoints
router.register(r'templates', DecisionTemplateViewSet, basename='decision-templates')

urlpatterns = [
    path('', include(router.urls)),
    # Run endpoints (separate from router for cleaner URLs)
    path('run/', DecisionRunViewSet.as_view({'post': 'run_decision'}), name='decision-run'),
    path('draft/', DecisionRunViewSet.as_view({'post': 'save_draft'}), name='decision-draft'),
    path('runs/', DecisionRunViewSet.as_view({'get': 'list_runs'}), name='decision-runs-list'),
    path('runs/<uuid:pk>/', DecisionRunViewSet.as_view({'get': 'get_run'}), name='decision-run-detail'),
    path('runs/<uuid:pk>/complete/', DecisionRunViewSet.as_view({'post': 'complete_draft'}), name='decision-complete'),
    path('runs/<uuid:pk>/delete/', DecisionRunViewSet.as_view({'delete': 'delete_draft'}), name='decision-delete'),
]
