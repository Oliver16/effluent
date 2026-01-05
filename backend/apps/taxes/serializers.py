from rest_framework import serializers
from .models import IncomeSource, W2Withholding, PreTaxDeduction


class PreTaxDeductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreTaxDeduction
        fields = [
            'id', 'deduction_type', 'name', 'amount_type', 'amount',
            'employer_match_percentage', 'employer_match_limit_percentage',
            'employer_match_limit_annual', 'target_account', 'is_active'
        ]


class W2WithholdingSerializer(serializers.ModelSerializer):
    class Meta:
        model = W2Withholding
        fields = [
            'id', 'filing_status', 'multiple_jobs_or_spouse_works',
            'child_tax_credit_dependents', 'other_dependents', 'other_income',
            'deductions', 'extra_withholding', 'state_allowances',
            'state_additional_withholding'
        ]


class IncomeSourceSerializer(serializers.ModelSerializer):
    gross_annual = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = IncomeSource
        fields = [
            'id', 'name', 'household_member', 'income_type', 'gross_annual_salary',
            'hourly_rate', 'expected_annual_hours', 'pay_frequency', 'gross_annual',
            'is_active', 'start_date', 'end_date', 'created_at'
        ]


class IncomeSourceDetailSerializer(serializers.ModelSerializer):
    gross_annual = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    gross_per_period = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    pretax_deductions = PreTaxDeductionSerializer(many=True, read_only=True)
    w2_withholding = W2WithholdingSerializer(read_only=True)

    class Meta:
        model = IncomeSource
        fields = [
            'id', 'name', 'household_member', 'income_type', 'gross_annual_salary',
            'hourly_rate', 'expected_annual_hours', 'pay_frequency', 'gross_annual',
            'gross_per_period', 'pretax_deductions', 'w2_withholding',
            'is_active', 'start_date', 'end_date', 'created_at', 'updated_at'
        ]
