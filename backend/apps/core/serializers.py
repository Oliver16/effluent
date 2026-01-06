from rest_framework import serializers
from .models import Household, HouseholdMember, HouseholdMembership, User, UserSettings


class HouseholdMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseholdMembership
        fields = ['id', 'role', 'is_default', 'created_at']


class HouseholdMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseholdMember
        fields = [
            'id', 'name', 'relationship', 'date_of_birth',
            'is_primary', 'employment_status', 'created_at'
        ]


class HouseholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = Household
        fields = [
            'id', 'name', 'slug', 'plan', 'subscription_status',
            'currency', 'fiscal_year_start_month', 'tax_filing_status',
            'state_of_residence', 'onboarding_completed', 'created_at'
        ]
        read_only_fields = ['slug']


class HouseholdDetailSerializer(serializers.ModelSerializer):
    members = HouseholdMemberSerializer(many=True, read_only=True)
    memberships = HouseholdMembershipSerializer(many=True, read_only=True)

    class Meta:
        model = Household
        fields = [
            'id', 'name', 'slug', 'plan', 'subscription_status',
            'currency', 'fiscal_year_start_month', 'tax_filing_status',
            'state_of_residence', 'onboarding_completed', 'onboarding_current_step',
            'members', 'memberships', 'created_at', 'updated_at'
        ]
        read_only_fields = ['slug']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'date_of_birth', 'last_login', 'date_joined']
        read_only_fields = ['email', 'last_login', 'date_joined']


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            'weekly_summary',
            'insight_alerts',
            'balance_reminders',
            'critical_alerts',
            'two_factor_enabled',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value
