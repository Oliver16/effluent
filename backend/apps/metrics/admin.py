from django.contrib import admin
from .models import MetricSnapshot, MetricThreshold, Insight


@admin.register(MetricSnapshot)
class MetricSnapshotAdmin(admin.ModelAdmin):
    list_display = ['household', 'as_of_date', 'net_worth_market', 'dscr', 'liquidity_months', 'savings_rate']
    list_filter = ['household', 'as_of_date']
    search_fields = ['household__name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'as_of_date'

    fieldsets = (
        ('Basic Info', {
            'fields': ('household', 'as_of_date')
        }),
        ('Tier 1 Metrics', {
            'fields': ('net_worth_market', 'net_worth_cost', 'monthly_surplus',
                      'dscr', 'liquidity_months', 'savings_rate')
        }),
        ('Tier 2 Metrics', {
            'fields': ('dti_ratio', 'debt_to_asset_market', 'debt_to_asset_cost',
                      'weighted_avg_interest_rate', 'high_interest_debt_ratio',
                      'housing_ratio', 'fixed_expense_ratio', 'essential_expense_ratio',
                      'income_concentration', 'unrealized_gains', 'investment_rate'),
            'classes': ('collapse',)
        }),
        ('Totals', {
            'fields': ('total_assets_market', 'total_assets_cost', 'total_liabilities',
                      'total_monthly_income', 'total_monthly_expenses', 'total_debt_service',
                      'total_liquid_assets'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MetricThreshold)
class MetricThresholdAdmin(admin.ModelAdmin):
    list_display = ['household', 'metric_name', 'warning_threshold', 'critical_threshold', 'comparison', 'is_enabled']
    list_filter = ['household', 'metric_name', 'is_enabled']
    search_fields = ['household__name', 'metric_name']

    fieldsets = (
        ('Basic Info', {
            'fields': ('household', 'metric_name', 'is_enabled')
        }),
        ('Thresholds', {
            'fields': ('warning_threshold', 'critical_threshold', 'comparison')
        }),
    )


@admin.register(Insight)
class InsightAdmin(admin.ModelAdmin):
    list_display = ['household', 'severity', 'category', 'title', 'is_dismissed', 'created_at']
    list_filter = ['household', 'severity', 'category', 'is_dismissed']
    search_fields = ['household__name', 'title', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Info', {
            'fields': ('household', 'severity', 'category', 'is_dismissed')
        }),
        ('Content', {
            'fields': ('title', 'description', 'recommendation')
        }),
        ('Metric Info', {
            'fields': ('metric_name', 'metric_value')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
