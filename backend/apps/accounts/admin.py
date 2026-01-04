from django.contrib import admin
from .models import Account, BalanceSnapshot, AssetGroup, LiabilityDetails, AssetDetails

class BalanceSnapshotInline(admin.TabularInline):
    model = BalanceSnapshot
    extra = 1
    readonly_fields = ('recorded_at',)

class LiabilityDetailsInline(admin.StackedInline):
    model = LiabilityDetails
    extra = 0

class AssetDetailsInline(admin.StackedInline):
    model = AssetDetails
    extra = 0

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'household', 'account_type', 'is_active', 'current_balance')
    list_filter = ('account_type', 'is_active', 'household')
    search_fields = ('name', 'institution')
    inlines = [BalanceSnapshotInline, LiabilityDetailsInline, AssetDetailsInline]

    def current_balance(self, obj):
        return obj.current_balance
    current_balance.short_description = 'Balance'

@admin.register(AssetGroup)
class AssetGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'household', 'total_market_value', 'total_debt', 'equity_at_market')
    list_filter = ('household',)

@admin.register(BalanceSnapshot)
class BalanceSnapshotAdmin(admin.ModelAdmin):
    list_display = ('account', 'as_of_date', 'balance', 'market_value', 'cost_basis')
    list_filter = ('as_of_date', 'account__household')
    date_hierarchy = 'as_of_date'
