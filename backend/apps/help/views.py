from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    UserHelpState,
    TourCompletion,
    LearningPathProgress,
    ArticleRead,
    HelpInteraction,
    InsightDismissal,
)
from .serializers import (
    UserHelpStateSerializer,
    TourCompletionSerializer,
    TourProgressUpdateSerializer,
    LearningPathProgressSerializer,
    HelpEventSerializer,
    DismissInsightSerializer,
)


class HelpViewSet(viewsets.ViewSet):
    """
    API endpoints for the help system.
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def state(self, request):
        """
        Get the current user's help state, including completed tours,
        learning paths, and dismissed insights.
        """
        user = request.user
        help_state, _ = UserHelpState.objects.get_or_create(user=user)

        serializer = UserHelpStateSerializer(help_state)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='tours/progress')
    def update_tour_progress(self, request):
        """
        Update progress on a tour (start, advance step, complete, skip, dismiss).
        """
        serializer = TourProgressUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        data = serializer.validated_data
        tour_id = data['tour_id']
        tour_status = data.get('status', 'in_progress')

        # Get or create help state
        help_state, _ = UserHelpState.objects.get_or_create(user=user)

        if tour_status == 'in_progress':
            # Update active tour
            help_state.active_tour_id = tour_id
            help_state.active_tour_step_index = data.get('step_index', 0)
            if not help_state.active_tour_started_at:
                help_state.active_tour_started_at = timezone.now()
            help_state.last_interaction_at = timezone.now()
            help_state.save()

        elif tour_status in ['completed', 'skipped', 'dismissed']:
            # Clear active tour
            help_state.active_tour_id = None
            help_state.active_tour_step_index = 0
            help_state.active_tour_started_at = None
            help_state.last_interaction_at = timezone.now()
            help_state.save()

            # Record completion
            completion, created = TourCompletion.objects.update_or_create(
                user=user,
                tour_id=tour_id,
                defaults={
                    'status': tour_status,
                    'steps_completed': data.get('steps_completed', 0),
                    'total_steps': data.get('total_steps', 0),
                },
            )

        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'])
    def tours(self, request):
        """
        Get list of tour completions for the current user.
        """
        user = request.user
        completions = TourCompletion.objects.filter(user=user)
        serializer = TourCompletionSerializer(completions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='paths/progress')
    def update_path_progress(self, request):
        """
        Update progress on a learning path.
        """
        user = request.user
        path_id = request.data.get('path_id')
        current_item_index = request.data.get('current_item_index', 0)
        total_items = request.data.get('total_items', 0)
        is_completed = request.data.get('is_completed', False)

        if not path_id:
            return Response(
                {'error': 'path_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress, created = LearningPathProgress.objects.update_or_create(
            user=user,
            path_id=path_id,
            defaults={
                'current_item_index': current_item_index,
                'total_items': total_items,
                'is_completed': is_completed,
                'completed_at': timezone.now() if is_completed else None,
            },
        )

        # Update help state
        help_state, _ = UserHelpState.objects.get_or_create(user=user)
        help_state.last_interaction_at = timezone.now()
        help_state.save()

        serializer = LearningPathProgressSerializer(progress)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def paths(self, request):
        """
        Get learning path progress for the current user.
        """
        user = request.user
        progress = LearningPathProgress.objects.filter(user=user)
        serializer = LearningPathProgressSerializer(progress, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='articles/read')
    def mark_article_read(self, request):
        """
        Mark an article as read.
        """
        user = request.user
        article_id = request.data.get('article_id')
        time_spent_seconds = request.data.get('time_spent_seconds', 0)
        scroll_depth_percent = request.data.get('scroll_depth_percent', 0)

        if not article_id:
            return Response(
                {'error': 'article_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        read, created = ArticleRead.objects.update_or_create(
            user=user,
            article_id=article_id,
            defaults={
                'time_spent_seconds': time_spent_seconds,
                'scroll_depth_percent': scroll_depth_percent,
            },
        )

        # Update help state
        help_state, _ = UserHelpState.objects.get_or_create(user=user)
        help_state.last_interaction_at = timezone.now()
        help_state.save()

        return Response({'status': 'ok', 'created': created})

    @action(detail=False, methods=['post'])
    def event(self, request):
        """
        Log a help interaction event (for analytics).
        """
        serializer = HelpEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        data = serializer.validated_data

        HelpInteraction.objects.create(
            user=user,
            event_type=data['event_type'],
            resource_type=data.get('resource_type', ''),
            resource_id=data.get('resource_id', ''),
            metadata=data.get('metadata', {}),
        )

        # Update help state last interaction
        help_state, _ = UserHelpState.objects.get_or_create(user=user)
        help_state.last_interaction_at = timezone.now()
        help_state.save()

        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'], url_path='insights/dismiss')
    def dismiss_insight(self, request):
        """
        Dismiss an insight (don't show again).
        """
        serializer = DismissInsightSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        data = serializer.validated_data

        dismissal, created = InsightDismissal.objects.update_or_create(
            user=user,
            insight_rule_id=data['insight_rule_id'],
            defaults={'is_permanent': data.get('is_permanent', False)},
        )

        return Response({'status': 'ok', 'created': created})

    @action(detail=False, methods=['delete'], url_path='insights/dismiss/(?P<rule_id>[^/.]+)')
    def undismiss_insight(self, request, rule_id=None):
        """
        Remove an insight dismissal (show again).
        """
        user = request.user

        deleted, _ = InsightDismissal.objects.filter(
            user=user,
            insight_rule_id=rule_id,
        ).delete()

        return Response({'status': 'ok', 'deleted': deleted > 0})

    @action(detail=False, methods=['post'])
    def reset(self, request):
        """
        Reset all help state for the current user.
        Useful for testing or if user wants to re-take tours.
        """
        user = request.user

        # Delete all progress
        TourCompletion.objects.filter(user=user).delete()
        LearningPathProgress.objects.filter(user=user).delete()
        ArticleRead.objects.filter(user=user).delete()
        InsightDismissal.objects.filter(user=user).delete()

        # Reset help state
        UserHelpState.objects.filter(user=user).update(
            active_tour_id=None,
            active_tour_step_index=0,
            active_tour_started_at=None,
        )

        return Response({'status': 'ok', 'message': 'Help state reset'})
