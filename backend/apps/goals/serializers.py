from rest_framework import serializers

from apps.goals.models import Goal, GoalSolution, GoalType, GoalStatus


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal CRUD operations."""
    goal_type_display = serializers.CharField(
        source='get_goal_type_display',
        read_only=True
    )
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = Goal
        fields = [
            'id',
            'name',
            'display_name',
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

        # Net worth target requires a target_date
        if goal_type == GoalType.NET_WORTH_TARGET and not target_date:
            # Target date is optional but recommended
            pass

        return attrs


class GoalStatusSerializer(serializers.Serializer):
    """Serializer for goal evaluation status."""
    goal_id = serializers.UUIDField()
    goal_type = serializers.CharField()
    goal_name = serializers.CharField()
    target_value = serializers.CharField()
    target_unit = serializers.CharField(required=False, allow_blank=True)
    current_value = serializers.CharField()
    status = serializers.ChoiceField(choices=['good', 'warning', 'critical'])
    delta_to_target = serializers.CharField()
    percentage_complete = serializers.CharField(required=False, allow_null=True)
    recommendation = serializers.CharField(allow_blank=True)


class GoalSolutionSerializer(serializers.ModelSerializer):
    """Serializer for GoalSolution model."""
    goal_name = serializers.CharField(source='goal.display_name', read_only=True)

    class Meta:
        model = GoalSolution
        fields = [
            'id', 'goal', 'goal_name', 'options', 'plan', 'result',
            'success', 'error_message', 'computed_at',
            'applied_scenario', 'applied_at'
        ]
        read_only_fields = [
            'id', 'plan', 'result', 'success', 'error_message',
            'computed_at', 'applied_scenario', 'applied_at'
        ]


class GoalSolveOptionsSerializer(serializers.Serializer):
    """Serializer for goal solve request options."""
    allowed_interventions = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            'reduce_expenses', 'increase_income', 'accelerate_debt',
            'increase_retirement', 'payoff_debt', 'refinance',
            'increase_401k', 'pause_401k'
        ]),
        default=['reduce_expenses', 'increase_income']
    )
    bounds = serializers.DictField(
        child=serializers.CharField(),  # Accept strings - solver converts to Decimal
        default=dict
    )
    start_date = serializers.DateField(required=False)
    projection_months = serializers.IntegerField(default=24, min_value=6, max_value=120)
    optimize_combined = serializers.BooleanField(default=True)


class GoalApplySolutionSerializer(serializers.Serializer):
    """Serializer for applying a goal solution."""
    plan = serializers.ListField(child=serializers.DictField())
    scenario_name = serializers.CharField(max_length=200, required=False)
