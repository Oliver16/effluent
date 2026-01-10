from rest_framework import serializers
from .models import (
    UserHelpState,
    TourCompletion,
    LearningPathProgress,
    ArticleRead,
    HelpInteraction,
    InsightDismissal,
)


class UserHelpStateSerializer(serializers.ModelSerializer):
    completed_tours = serializers.SerializerMethodField()
    completed_paths = serializers.SerializerMethodField()
    dismissed_insights = serializers.SerializerMethodField()
    read_articles = serializers.SerializerMethodField()

    class Meta:
        model = UserHelpState
        fields = [
            'active_tour_id',
            'active_tour_step_index',
            'active_tour_started_at',
            'last_interaction_at',
            'completed_tours',
            'completed_paths',
            'dismissed_insights',
            'read_articles',
        ]

    def get_completed_tours(self, obj):
        return list(
            TourCompletion.objects.filter(
                user=obj.user,
                status='completed',
            ).values_list('tour_id', flat=True)
        )

    def get_completed_paths(self, obj):
        return list(
            LearningPathProgress.objects.filter(
                user=obj.user,
                is_completed=True,
            ).values_list('path_id', flat=True)
        )

    def get_dismissed_insights(self, obj):
        return list(
            InsightDismissal.objects.filter(
                user=obj.user,
            ).values_list('insight_rule_id', flat=True)
        )

    def get_read_articles(self, obj):
        return list(
            ArticleRead.objects.filter(
                user=obj.user,
            ).values_list('article_id', flat=True)
        )


class TourCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourCompletion
        fields = [
            'tour_id',
            'status',
            'steps_completed',
            'total_steps',
            'completed_at',
        ]
        read_only_fields = ['completed_at']


class TourProgressUpdateSerializer(serializers.Serializer):
    """Serializer for updating tour progress."""

    tour_id = serializers.CharField(max_length=100)
    step_index = serializers.IntegerField(min_value=0, required=False)
    status = serializers.ChoiceField(
        choices=['in_progress', 'completed', 'skipped', 'dismissed'],
        required=False,
        default='in_progress',
    )
    steps_completed = serializers.IntegerField(min_value=0, required=False)
    total_steps = serializers.IntegerField(min_value=0, required=False)


class LearningPathProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPathProgress
        fields = [
            'path_id',
            'started_at',
            'completed_at',
            'current_item_index',
            'total_items',
            'is_completed',
        ]
        read_only_fields = ['started_at', 'completed_at']


class HelpEventSerializer(serializers.Serializer):
    """Serializer for logging help events."""

    event_type = serializers.ChoiceField(choices=[
        'tour_started',
        'tour_step_viewed',
        'tour_completed',
        'tour_skipped',
        'tour_dismissed',
        'article_viewed',
        'article_completed',
        'tooltip_opened',
        'insight_viewed',
        'insight_action_clicked',
        'insight_dismissed',
        'help_searched',
        'path_started',
        'path_completed',
        'drawer_opened',
    ])
    resource_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    resource_id = serializers.CharField(max_length=200, required=False, allow_blank=True)
    metadata = serializers.DictField(required=False, default=dict)


class InsightDismissalSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsightDismissal
        fields = ['insight_rule_id', 'is_permanent', 'dismissed_at']
        read_only_fields = ['dismissed_at']


class DismissInsightSerializer(serializers.Serializer):
    """Serializer for dismissing an insight."""

    insight_rule_id = serializers.CharField(max_length=100)
    is_permanent = serializers.BooleanField(default=False)
