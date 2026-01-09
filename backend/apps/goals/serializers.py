from rest_framework import serializers

from apps.goals.models import Goal, GoalType


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal CRUD operations."""
    goal_type_display = serializers.CharField(
        source='get_goal_type_display',
        read_only=True
    )

    class Meta:
        model = Goal
        fields = [
            'id',
            'name',
            'goal_type',
            'goal_type_display',
            'target_value',
            'target_unit',
            'target_date',
            'target_meta',
            'is_primary',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_goal_type(self, value):
        """Validate goal_type is a valid choice."""
        valid_types = [choice[0] for choice in GoalType.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid goal_type. Must be one of: {', '.join(valid_types)}"
            )
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        goal_type = attrs.get('goal_type')
        target_date = attrs.get('target_date')

        # Net worth target by date requires a target_date
        if goal_type == GoalType.NET_WORTH_TARGET_BY_DATE and not target_date:
            raise serializers.ValidationError({
                'target_date': 'Target date is required for net worth target goals'
            })

        return attrs


class GoalStatusSerializer(serializers.Serializer):
    """Serializer for goal evaluation status."""
    goal_id = serializers.UUIDField()
    goal_type = serializers.CharField()
    name = serializers.CharField()
    target_value = serializers.CharField()
    current_value = serializers.CharField()
    status = serializers.ChoiceField(choices=['good', 'warning', 'critical'])
    delta_to_target = serializers.CharField()
    recommendation = serializers.CharField()
