from rest_framework import serializers
from .models import RecurringFlow


class RecurringFlowSerializer(serializers.ModelSerializer):
    monthly_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    annual_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    category = serializers.CharField(read_only=True)

    class Meta:
        model = RecurringFlow
        fields = [
            'id', 'name', 'description', 'flow_type', 'income_category',
            'expense_category', 'amount', 'frequency', 'monthly_amount',
            'annual_amount', 'category', 'start_date', 'end_date',
            'linked_account', 'household_member', 'income_source',
            'is_active', 'is_baseline', 'notes', 'created_at'
        ]
