from django.contrib import admin
from .models import Goal, GoalSolution


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'household', 'goal_type', 'target_value', 'current_status', 'is_primary', 'is_active']
    list_filter = ['goal_type', 'current_status', 'is_primary', 'is_active']
    search_fields = ['name', 'household__name']
    readonly_fields = ['id', 'current_value', 'last_evaluated_at', 'created_at', 'updated_at']
    ordering = ['household', '-is_primary', '-created_at']


@admin.register(GoalSolution)
class GoalSolutionAdmin(admin.ModelAdmin):
    list_display = ['goal', 'success', 'computed_at', 'applied_at']
    list_filter = ['success']
    search_fields = ['goal__name', 'goal__household__name']
    readonly_fields = ['id', 'computed_at', 'created_at', 'updated_at']
    ordering = ['-computed_at']
