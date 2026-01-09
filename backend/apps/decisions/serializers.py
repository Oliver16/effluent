from rest_framework import serializers
from apps.scenarios.models import ScenarioProjection
from .models import DecisionTemplate, DecisionRun


class DecisionTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing decision templates."""

    class Meta:
        model = DecisionTemplate
        fields = [
            'key',
            'name',
            'description',
            'category',
            'icon',
            'ui_schema',
            'sort_order',
        ]


class DecisionTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for decision template details."""

    class Meta:
        model = DecisionTemplate
        fields = [
            'id',
            'key',
            'name',
            'description',
            'category',
            'icon',
            'ui_schema',
            'change_plan',
            'sort_order',
            'created_at',
            'updated_at',
        ]


class DecisionRunInputSerializer(serializers.Serializer):
    """Serializer for running a decision."""
    template_key = serializers.CharField(max_length=50)
    inputs = serializers.JSONField()
    scenario_name_override = serializers.CharField(max_length=200, required=False, allow_blank=True)


class DecisionDraftInputSerializer(serializers.Serializer):
    """Serializer for saving a decision draft."""
    template_key = serializers.CharField(max_length=50)
    inputs = serializers.JSONField()


class ProjectionSummarySerializer(serializers.ModelSerializer):
    """Serializer for projection summary in decision response."""

    class Meta:
        model = ScenarioProjection
        fields = [
            'projection_date',
            'month_number',
            'net_worth',
            'total_assets',
            'total_liabilities',
            'total_income',
            'total_expenses',
            'net_cash_flow',
            'savings_rate',
        ]


class MetricComparisonSerializer(serializers.Serializer):
    """Serializer for metric comparison between baseline and scenario."""
    net_worth = serializers.CharField()
    liquidity_months = serializers.CharField()
    dscr = serializers.CharField()
    savings_rate = serializers.CharField()
    monthly_surplus = serializers.CharField()


class GoalStatusComparisonSerializer(serializers.Serializer):
    """Serializer for goal status comparison."""
    goal_id = serializers.UUIDField()
    goal_type = serializers.CharField()
    name = serializers.CharField()
    target_value = serializers.CharField()
    current_value = serializers.CharField()
    status = serializers.CharField()
    delta_to_target = serializers.CharField()


class DecisionSummarySerializer(serializers.Serializer):
    """Serializer for decision comparison summary."""
    baseline = MetricComparisonSerializer()
    scenario = MetricComparisonSerializer()
    goal_status = serializers.DictField(child=serializers.ListField())
    takeaways = serializers.ListField(child=serializers.CharField())


class DecisionRunResponseSerializer(serializers.Serializer):
    """Serializer for decision run response."""
    scenario_id = serializers.UUIDField()
    scenario_name = serializers.CharField()
    decision_run_id = serializers.UUIDField()
    changes_created = serializers.IntegerField()
    projections = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    def get_projections(self, obj):
        """Get key projection milestones."""
        scenario = obj.get('scenario')
        if not scenario:
            return {}

        # Get projections at key points: now, 1 year, 3 years, 5 years
        projections = ScenarioProjection.objects.filter(scenario=scenario).order_by('month_number')

        milestones = {}
        for proj in projections:
            if proj.month_number == 0:
                milestones['now'] = ProjectionSummarySerializer(proj).data
            elif proj.month_number == 12:
                milestones['year_1'] = ProjectionSummarySerializer(proj).data
            elif proj.month_number == 36:
                milestones['year_3'] = ProjectionSummarySerializer(proj).data
            elif proj.month_number == 59:  # Last month of 5-year projection
                milestones['year_5'] = ProjectionSummarySerializer(proj).data

        return milestones

    def get_summary(self, obj):
        """Get baseline vs scenario comparison summary."""
        summary = obj.get('summary')
        if not summary:
            return None
        return summary


class DecisionRunSerializer(serializers.ModelSerializer):
    """Serializer for decision run records."""
    template_name = serializers.SerializerMethodField()

    class Meta:
        model = DecisionRun
        fields = [
            'id',
            'template_key',
            'template_name',
            'inputs',
            'created_scenario',
            'scenario_name_override',
            'is_draft',
            'completed_at',
            'created_at',
        ]

    def get_template_name(self, obj):
        if obj.template:
            return obj.template.name
        return obj.template_key
