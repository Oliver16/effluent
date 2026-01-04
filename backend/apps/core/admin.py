from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Household, HouseholdMember, HouseholdMembership

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'is_staff', 'date_joined')
    search_fields = ('email', 'username')
    ordering = ('-date_joined',)

@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'plan', 'subscription_status', 'created_at')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(HouseholdMember)
class HouseholdMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'household', 'relationship', 'is_primary')
    list_filter = ('relationship', 'is_primary')

@admin.register(HouseholdMembership)
class HouseholdMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'household', 'role', 'is_default')
    list_filter = ('role',)
