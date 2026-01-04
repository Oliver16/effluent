from django.contrib import admin
from .models import RecurringFlow

@admin.register(RecurringFlow)
class RecurringFlowAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'household', 'flow_type', 'category',
        'amount', 'frequency', 'monthly_amount', 'is_active'
    )
    list_filter = ('flow_type', 'frequency', 'is_active', 'household')
    search_fields = ('name', 'description')

    def category(self, obj):
        return obj.category
    category.short_description = 'Category'

    def monthly_amount(self, obj):
        return f"${obj.monthly_amount:,.2f}"
    monthly_amount.short_description = 'Monthly'
