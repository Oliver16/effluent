from rest_framework import serializers
from .models import Goal, GoalSolution, GoalType, GoalStatus


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal model."""
    display_name = serializers.ReadOnlyField()
    goal_type_display = serializers.CharField(source='get_goal_type_display', read_only=True)
    current_status_display = serializers.CharField(source='get_current_status_display', read_only=True)

    class Meta:
        model = Goal
        fields = [
            'id', 'name', 'display_name', 'goal_type', 'goal_type_display',
            'target_value', 'target_unit', 'target_date', 'target_meta',
            'is_primary', 'is_active',
            'current_status', 'current_status_display', 'current_value',
            'last_evaluated_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'current_status', 'current_value', 'last_evaluated_at',
            'created_at', 'updated_at'
        ]

    def validate_goal_type(self, value):
        if value not in [choice[0] for choice in GoalType.choices]:
            raise serializers.ValidationError(f"Invalid goal type: {value}")
        return value


class GoalCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating goals."""

    class Meta:
        model = Goal
        fields = [
            'name', 'goal_type', 'target_value', 'target_unit',
            'target_date', 'target_meta', 'is_primary'
        ]

    def validate_goal_type(self, value):
        if value not in [choice[0] for choice in GoalType.choices]:
            raise serializers.ValidationError(f"Invalid goal type: {value}")
        return value

    def validate(self, data):
        # Set default target_unit based on goal_type if not provided
        if not data.get('target_unit'):
            goal_type = data.get('goal_type')
            unit_defaults = {
                GoalType.EMERGENCY_FUND_MONTHS: 'months',
                GoalType.MIN_DSCR: 'ratio',
                GoalType.MIN_SAVINGS_RATE: 'percent',
                GoalType.NET_WORTH_TARGET: 'usd',
                GoalType.RETIREMENT_AGE: 'age',
                GoalType.DEBT_FREE_DATE: 'date',
            }
            data['target_unit'] = unit_defaults.get(goal_type, '')
        return data


class GoalStatusSerializer(serializers.Serializer):
    """Serializer for goal status evaluation results."""
    goal_id = serializers.UUIDField()
    goal_type = serializers.CharField()
    goal_name = serializers.CharField()
    target_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    target_unit = serializers.CharField()
    current_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.ChoiceField(choices=GoalStatus.choices)
    delta_to_target = serializers.DecimalField(max_digits=12, decimal_places=2)
    percentage_complete = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
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
            'reduce_expenses', 'increase_income', 'payoff_debt',
            'refinance', 'increase_401k', 'pause_401k'
        ]),
        default=['reduce_expenses', 'increase_income']
    )
    bounds = serializers.DictField(
        child=serializers.DecimalField(max_digits=12, decimal_places=2),
        default=dict
    )
    start_date = serializers.DateField(required=False)
    projection_months = serializers.IntegerField(default=24, min_value=6, max_value=120)


class GoalApplySolutionSerializer(serializers.Serializer):
    """Serializer for applying a goal solution."""
    plan = serializers.ListField(child=serializers.DictField())
    scenario_name = serializers.CharField(max_length=200, required=False)
