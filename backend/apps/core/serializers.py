from rest_framework import serializers
from .models import Household, HouseholdMember, HouseholdMembership


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
