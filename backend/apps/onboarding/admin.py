from django.contrib import admin
from .models import OnboardingProgress, OnboardingStepData


class OnboardingStepDataInline(admin.TabularInline):
    model = OnboardingStepData
    extra = 0
    readonly_fields = ['updated_at']
    fields = ['step', 'is_valid', 'updated_at']
    can_delete = False


@admin.register(OnboardingProgress)
class OnboardingProgressAdmin(admin.ModelAdmin):
    list_display = ['household', 'current_step', 'progress_percentage', 'started_at', 'completed_at']
    list_filter = ['current_step', 'completed_at']
    search_fields = ['household__name']
    readonly_fields = ['started_at', 'completed_at', 'progress_percentage']
    inlines = [OnboardingStepDataInline]

    fieldsets = (
        ('Basic Info', {
            'fields': ('household', 'current_step', 'progress_percentage')
        }),
        ('Progress', {
            'fields': ('completed_steps', 'skipped_steps')
        }),
        ('Timestamps', {
            'fields': ('started_at', 'completed_at')
        }),
    )


@admin.register(OnboardingStepData)
class OnboardingStepDataAdmin(admin.ModelAdmin):
    list_display = ['progress', 'step', 'is_valid', 'updated_at']
    list_filter = ['step', 'is_valid']
    search_fields = ['progress__household__name']
    readonly_fields = ['updated_at']

    fieldsets = (
        ('Basic Info', {
            'fields': ('progress', 'step', 'is_valid')
        }),
        ('Data', {
            'fields': ('data', 'validation_errors')
        }),
        ('Timestamps', {
            'fields': ('updated_at',)
        }),
    )
