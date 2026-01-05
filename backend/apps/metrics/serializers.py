from rest_framework import serializers
from .models import MetricSnapshot, MetricThreshold, Insight


class MetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricSnapshot
        fields = [
            'id', 'as_of_date', 'net_worth_market', 'net_worth_cost',
            'monthly_surplus', 'dscr', 'liquidity_months', 'savings_rate',
            'dti_ratio', 'debt_to_asset_market', 'debt_to_asset_cost',
            'weighted_avg_interest_rate', 'high_interest_debt_ratio',
            'housing_ratio', 'fixed_expense_ratio', 'essential_expense_ratio',
            'income_concentration', 'unrealized_gains', 'investment_rate',
            'total_assets_market', 'total_assets_cost', 'total_liabilities',
            'total_monthly_income', 'total_monthly_expenses', 'total_debt_service',
            'total_liquid_assets', 'created_at'
        ]


class MetricThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricThreshold
        fields = [
            'id', 'metric_name', 'warning_threshold', 'critical_threshold',
            'comparison', 'is_enabled', 'created_at'
        ]


class InsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insight
        fields = [
            'id', 'severity', 'category', 'title', 'description',
            'recommendation', 'metric_name', 'metric_value', 'is_dismissed',
            'created_at'
        ]
