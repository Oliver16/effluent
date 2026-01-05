from rest_framework import serializers
from .models import Scenario, ScenarioChange, ScenarioProjection, ScenarioComparison


class ScenarioChangeSerializer(serializers.ModelSerializer):
    def validate_scenario(self, scenario):
        request = self.context.get('request')
        if request and scenario.household != request.household:
            raise serializers.ValidationError(
                "Cannot add changes to scenarios in other households."
            )
        return scenario

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
