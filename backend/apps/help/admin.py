from django.contrib import admin
from .models import (
    UserHelpState,
    TourCompletion,
    LearningPathProgress,
    ArticleRead,
    HelpInteraction,
    InsightDismissal,
)


@admin.register(UserHelpState)
class UserHelpStateAdmin(admin.ModelAdmin):
    list_display = ['user', 'active_tour_id', 'active_tour_step_index', 'last_interaction_at']
    search_fields = ['user__email', 'active_tour_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TourCompletion)
class TourCompletionAdmin(admin.ModelAdmin):
    list_display = ['user', 'tour_id', 'status', 'steps_completed', 'completed_at']
    list_filter = ['status', 'tour_id']
    search_fields = ['user__email', 'tour_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(LearningPathProgress)
class LearningPathProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'path_id', 'is_completed', 'current_item_index', 'total_items']
    list_filter = ['is_completed', 'path_id']
    search_fields = ['user__email', 'path_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ArticleRead)
class ArticleReadAdmin(admin.ModelAdmin):
    list_display = ['user', 'article_id', 'read_at', 'time_spent_seconds']
    search_fields = ['user__email', 'article_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(HelpInteraction)
class HelpInteractionAdmin(admin.ModelAdmin):
    list_display = ['user', 'event_type', 'resource_type', 'resource_id', 'timestamp']
    list_filter = ['event_type', 'resource_type']
    search_fields = ['user__email', 'resource_id']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'


@admin.register(InsightDismissal)
class InsightDismissalAdmin(admin.ModelAdmin):
    list_display = ['user', 'insight_rule_id', 'is_permanent', 'dismissed_at']
    list_filter = ['is_permanent', 'insight_rule_id']
    search_fields = ['user__email', 'insight_rule_id']
    readonly_fields = ['created_at', 'updated_at']
