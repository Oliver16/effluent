from django.contrib import admin

from apps.goals.models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'goal_type',
        'target_value',
        'target_unit',
        'is_primary',
        'is_active',
        'household',
        'created_at',
    ]
    list_filter = ['goal_type', 'is_primary', 'is_active']
    search_fields = ['name', 'household__name']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        (None, {
            'fields': ('name', 'household', 'goal_type')
        }),
        ('Target', {
            'fields': ('target_value', 'target_unit', 'target_date', 'target_meta')
        }),
        ('Settings', {
            'fields': ('is_primary', 'is_active')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
