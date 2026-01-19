from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer as BaseTokenRefreshSerializer, TokenObtainPairSerializer as BaseTokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from .models import Household, HouseholdMember, HouseholdMembership, User, UserSettings


class TokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    """Custom token serializer that accepts 'email' field instead of 'username'."""
    username_field = 'email'


class TokenRefreshSerializer(BaseTokenRefreshSerializer):
    """Custom token refresh serializer that handles deleted users gracefully."""

    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except ObjectDoesNotExist:
            raise InvalidToken('User no longer exists')


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


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    household_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'household_id']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate_household_id(self, value):
        if value:
            if not Household.objects.filter(id=value).exists():
                raise serializers.ValidationError('Household not found. Please check the ID and try again.')
        return value

    def create(self, validated_data):
        household_id = validated_data.pop('household_id', None)

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )

        # If joining an existing household, create membership
        if household_id:
            household = Household.objects.get(id=household_id)
            HouseholdMembership.objects.create(
                user=user,
                household=household,
                role='member',
                is_default=True
            )

        return user
