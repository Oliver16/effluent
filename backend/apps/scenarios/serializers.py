from rest_framework import serializers
from .models import Scenario, ScenarioChange, ScenarioProjection, ScenarioComparison, LifeEventTemplate, LifeEventCategory


class ScenarioChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScenarioChange
        fields = [
            'id', 'scenario', 'change_type', 'name', 'description', 'effective_date',
            'end_date', 'source_account_id', 'source_flow_id', 'parameters',
            'display_order', 'is_enabled'
        ]


class ScenarioProjectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScenarioProjection
        fields = [
            'id', 'projection_date', 'month_number', 'total_assets',
            'total_liabilities', 'net_worth', 'liquid_assets', 'retirement_assets',
            'total_income', 'total_expenses', 'net_cash_flow', 'dscr',
            'savings_rate', 'liquidity_months', 'income_breakdown',
            'expense_breakdown', 'asset_breakdown', 'liability_breakdown',
            'computed_at'
        ]


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = [
            'id', 'name', 'description', 'is_baseline', 'parent_scenario',
            'projection_months', 'start_date', 'inflation_rate',
            'investment_return_rate', 'salary_growth_rate', 'is_active',
            'is_archived', 'created_at'
        ]


class ScenarioDetailSerializer(serializers.ModelSerializer):
    changes = ScenarioChangeSerializer(many=True, read_only=True)
    projections = ScenarioProjectionSerializer(many=True, read_only=True)

    class Meta:
        model = Scenario
        fields = [
            'id', 'name', 'description', 'is_baseline', 'parent_scenario',
            'projection_months', 'start_date', 'inflation_rate',
            'investment_return_rate', 'salary_growth_rate', 'is_active',
            'is_archived', 'changes', 'projections', 'created_at', 'updated_at'
        ]


class ScenarioComparisonSerializer(serializers.ModelSerializer):
    scenarios = ScenarioSerializer(many=True, read_only=True)

    class Meta:
        model = ScenarioComparison
        fields = ['id', 'name', 'scenarios', 'created_at']


class LifeEventTemplateSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = LifeEventTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'icon', 'suggested_changes', 'display_order', 'is_active'
        ]


class BaselineScenarioSerializer(serializers.ModelSerializer):
    """Serializer for baseline scenario with additional baseline-specific fields."""
    changes = ScenarioChangeSerializer(many=True, read_only=True)
    projections = ScenarioProjectionSerializer(many=True, read_only=True)
    baseline_mode_display = serializers.CharField(source='get_baseline_mode_display', read_only=True)

    class Meta:
        model = Scenario
        fields = [
            'id', 'name', 'description', 'is_baseline', 'parent_scenario',
            'baseline_mode', 'baseline_mode_display', 'baseline_pinned_at',
            'baseline_pinned_as_of_date', 'last_projected_at',
            'projection_months', 'start_date', 'inflation_rate',
            'investment_return_rate', 'salary_growth_rate', 'is_active',
            'is_archived', 'changes', 'projections', 'created_at', 'updated_at'
        ]
