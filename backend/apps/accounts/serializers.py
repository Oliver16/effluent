from rest_framework import serializers
from .models import Account, BalanceSnapshot, AssetGroup, LiabilityDetails, AssetDetails


class BalanceSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = BalanceSnapshot
        fields = [
            'id', 'as_of_date', 'balance', 'cost_basis', 'market_value',
            'notes', 'recorded_at'
        ]
        read_only_fields = ['recorded_at']


class AssetDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetDetails
        fields = [
            'acquisition_date', 'acquisition_cost', 'property_type',
            'address_line1', 'address_line2', 'city', 'state', 'zip_code',
            'square_footage', 'lot_size_acres', 'year_built',
            'annual_property_tax', 'annual_insurance', 'annual_hoa',
            'monthly_rent_income', 'vin', 'make', 'model', 'year', 'mileage'
        ]


class LiabilityDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiabilityDetails
        fields = [
            'interest_rate', 'rate_type', 'original_balance', 'origination_date',
            'maturity_date', 'term_months', 'minimum_payment', 'payment_day_of_month',
            'is_interest_only', 'includes_escrow', 'escrow_amount', 'credit_limit',
            'rate_index', 'rate_margin', 'rate_floor', 'rate_ceiling',
            'servicer', 'is_income_driven'
        ]


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'account_type', 'institution', 'account_number_last4',
            'is_active', 'display_order', 'asset_group', 'owner', 'employer_name',
            'notes', 'created_at'
        ]


class AccountDetailSerializer(serializers.ModelSerializer):
    latest_balance = serializers.SerializerMethodField()
    snapshots = BalanceSnapshotSerializer(many=True, read_only=True)
    asset_details = AssetDetailsSerializer(read_only=True)
    liability_details = LiabilityDetailsSerializer(read_only=True)

    class Meta:
        model = Account
        fields = [
            'id', 'name', 'account_type', 'institution', 'account_number_last4',
            'is_active', 'display_order', 'asset_group', 'owner', 'employer_name',
            'notes', 'latest_balance', 'snapshots', 'asset_details', 'liability_details',
            'created_at', 'updated_at'
        ]

    def get_latest_balance(self, obj):
        snapshot = obj.latest_snapshot
        if snapshot:
            return BalanceSnapshotSerializer(snapshot).data
        return None


class AssetGroupSerializer(serializers.ModelSerializer):
    accounts = AccountSerializer(many=True, read_only=True)
    total_market_value = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    total_debt = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    equity_at_market = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = AssetGroup
        fields = [
            'id', 'name', 'description', 'accounts', 'total_market_value',
            'total_debt', 'equity_at_market', 'created_at'
        ]
