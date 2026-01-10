"""
Help System Models

Tracks user progress through tours, learning paths, and help interactions.
"""
import uuid
from django.db import models
from apps.core.models import User, TimestampedModel


class UserHelpState(TimestampedModel):
    """
    Stores a user's overall help system state.
    Single record per user for quick access to progress.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='help_state',
    )

    # Active tour (if any)
    active_tour_id = models.CharField(max_length=100, blank=True, null=True)
    active_tour_step_index = models.PositiveIntegerField(default=0)
    active_tour_started_at = models.DateTimeField(null=True, blank=True)

    # Last interaction
    last_interaction_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'help_user_state'
        verbose_name = 'User Help State'
        verbose_name_plural = 'User Help States'

    def __str__(self):
        return f"HelpState for {self.user.email}"


class TourCompletion(TimestampedModel):
    """
    Records when a user completes or dismisses a tour.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tour_completions',
    )
    tour_id = models.CharField(max_length=100, db_index=True)

    # Completion details
    completed_at = models.DateTimeField(auto_now_add=True)
    steps_completed = models.PositiveIntegerField(default=0)
    total_steps = models.PositiveIntegerField(default=0)

    # Completion type
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
        ('dismissed', 'Dismissed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')

    class Meta:
        db_table = 'help_tour_completion'
        unique_together = [['user', 'tour_id']]
        indexes = [
            models.Index(fields=['user', 'tour_id']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.tour_id} ({self.status})"


class LearningPathProgress(TimestampedModel):
    """
    Tracks user progress through learning paths.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='learning_path_progress',
    )
    path_id = models.CharField(max_length=100, db_index=True)

    # Progress
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    current_item_index = models.PositiveIntegerField(default=0)
    total_items = models.PositiveIntegerField(default=0)

    # Completion status
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = 'help_learning_path_progress'
        unique_together = [['user', 'path_id']]
        indexes = [
            models.Index(fields=['user', 'path_id']),
        ]

    def __str__(self):
        status = 'completed' if self.is_completed else f'{self.current_item_index}/{self.total_items}'
        return f"{self.user.email} - {self.path_id} ({status})"


class ArticleRead(TimestampedModel):
    """
    Tracks which articles a user has read.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='articles_read',
    )
    article_id = models.CharField(max_length=200, db_index=True)
    read_at = models.DateTimeField(auto_now_add=True)

    # Reading metrics
    time_spent_seconds = models.PositiveIntegerField(default=0)
    scroll_depth_percent = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'help_article_read'
        unique_together = [['user', 'article_id']]
        indexes = [
            models.Index(fields=['user', 'article_id']),
        ]

    def __str__(self):
        return f"{self.user.email} read {self.article_id}"


class HelpInteraction(models.Model):
    """
    General event log for help system interactions.
    Used for analytics and understanding help usage patterns.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='help_interactions',
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Event details
    EVENT_TYPES = [
        ('tour_started', 'Tour Started'),
        ('tour_step_viewed', 'Tour Step Viewed'),
        ('tour_completed', 'Tour Completed'),
        ('tour_skipped', 'Tour Skipped'),
        ('tour_dismissed', 'Tour Dismissed'),
        ('article_viewed', 'Article Viewed'),
        ('article_completed', 'Article Completed'),
        ('tooltip_opened', 'Tooltip Opened'),
        ('insight_viewed', 'Insight Viewed'),
        ('insight_action_clicked', 'Insight Action Clicked'),
        ('insight_dismissed', 'Insight Dismissed'),
        ('help_searched', 'Help Searched'),
        ('path_started', 'Path Started'),
        ('path_completed', 'Path Completed'),
        ('drawer_opened', 'Drawer Opened'),
    ]
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)

    # Resource being interacted with
    resource_type = models.CharField(max_length=50, blank=True)  # tour, article, tooltip, insight
    resource_id = models.CharField(max_length=200, blank=True)

    # Additional context
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'help_interaction'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.email} - {self.event_type} - {self.timestamp}"


class InsightDismissal(TimestampedModel):
    """
    Tracks which insights a user has dismissed (don't show again).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='insight_dismissals',
    )
    insight_rule_id = models.CharField(max_length=100, db_index=True)
    dismissed_at = models.DateTimeField(auto_now_add=True)

    # Whether this is a permanent dismissal or temporary
    is_permanent = models.BooleanField(default=False)

    class Meta:
        db_table = 'help_insight_dismissal'
        unique_together = [['user', 'insight_rule_id']]
        indexes = [
            models.Index(fields=['user', 'insight_rule_id']),
        ]

    def __str__(self):
        return f"{self.user.email} dismissed {self.insight_rule_id}"
