from django.contrib import admin
from .models import Scenario, ScenarioChange, ScenarioProjection

class ScenarioChangeInline(admin.TabularInline):
    model = ScenarioChange
    extra = 1

@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ('name', 'household', 'projection_months', 'is_baseline', 'is_active')
    list_filter = ('is_baseline', 'is_active', 'household')
    inlines = [ScenarioChangeInline]

@admin.register(ScenarioProjection)
class ScenarioProjectionAdmin(admin.ModelAdmin):
    list_display = ('scenario', 'month_number', 'net_worth', 'net_cash_flow', 'dscr')
    list_filter = ('scenario',)
