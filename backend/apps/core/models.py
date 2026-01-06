import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    date_of_birth = models.DateField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'

    def get_households(self):
        return Household.objects.filter(memberships__user=self)

    def get_default_household(self):
        membership = self.household_memberships.filter(is_default=True).first()
        if membership:
            return membership.household
        membership = self.household_memberships.first()
        return membership.household if membership else None

    def get_settings(self):
        settings, _ = UserSettings.objects.get_or_create(user=self)
        return settings


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Household(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=100)

    # Subscription
    plan = models.CharField(max_length=50, default='free')
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    subscription_status = models.CharField(max_length=50, default='trialing')
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    # Settings
    currency = models.CharField(max_length=3, default='USD')
    fiscal_year_start_month = models.PositiveSmallIntegerField(default=1)

    # Tax settings
    tax_filing_status = models.CharField(
        max_length=30,
        choices=[
            ('single', 'Single'),
            ('married_jointly', 'Married Filing Jointly'),
            ('married_separately', 'Married Filing Separately'),
            ('head_of_household', 'Head of Household'),
            ('qualifying_widow', 'Qualifying Surviving Spouse'),
        ],
        default='single'
    )
    state_of_residence = models.CharField(max_length=2, blank=True)

    # Onboarding
    onboarding_completed = models.BooleanField(default=False)
    onboarding_current_step = models.CharField(max_length=50, default='welcome')

    class Meta:
        db_table = 'households'

    def __str__(self):
        return self.name


class HouseholdMember(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    household = models.ForeignKey(Household, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=200)
    relationship = models.CharField(
        max_length=30,
        choices=[
            ('self', 'Self'),
            ('spouse', 'Spouse'),
            ('partner', 'Partner'),
            ('child', 'Child'),
            ('dependent', 'Other Dependent'),
        ],
        default='self'
    )
    date_of_birth = models.DateField(null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    employment_status = models.CharField(
        max_length=30,
        choices=[
            ('employed_w2', 'W-2 Employee'),
            ('self_employed', 'Self-Employed'),
            ('both', 'Both W-2 and Self-Employed'),
            ('unemployed', 'Unemployed'),
            ('retired', 'Retired'),
            ('student', 'Student'),
        ],
        default='employed_w2'
    )

    class Meta:
        db_table = 'household_members'


class HouseholdMembership(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='household_memberships')
    household = models.ForeignKey(Household, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(
        max_length=20,
        choices=[
            ('owner', 'Owner'),
            ('admin', 'Admin'),
            ('member', 'Member'),
            ('viewer', 'Viewer'),
        ],
        default='member'
    )
    is_default = models.BooleanField(default=False)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invitations_sent')

    class Meta:
        db_table = 'household_memberships'
        unique_together = ['user', 'household']


class HouseholdOwnedModel(TimestampedModel):
    """Abstract base for all models belonging to a household."""
    household = models.ForeignKey('core.Household', on_delete=models.CASCADE, related_name='%(class)ss')

    class Meta:
        abstract = True


class UserSettings(TimestampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    weekly_summary = models.BooleanField(default=True)
    insight_alerts = models.BooleanField(default=True)
    balance_reminders = models.BooleanField(default=True)
    critical_alerts = models.BooleanField(default=True)
    two_factor_enabled = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_settings'
