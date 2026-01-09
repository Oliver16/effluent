from django.contrib import admin
from .models import DecisionTemplate, DecisionRun


@admin.register(DecisionTemplate)
class DecisionTemplateAdmin(admin.ModelAdmin):
    list_display = ['key', 'name', 'category', 'is_active', 'sort_order']
    list_filter = ['category', 'is_active']
    search_fields = ['key', 'name', 'description']
    ordering = ['category', 'sort_order', 'name']


@admin.register(DecisionRun)
class DecisionRunAdmin(admin.ModelAdmin):
    list_display = ['id', 'household', 'template_key', 'is_draft', 'created_at']
    list_filter = ['is_draft', 'template_key']
    search_fields = ['household__name', 'template_key']
    ordering = ['-created_at']
