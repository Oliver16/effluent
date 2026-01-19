# Security Audit Implementation Plan - Remaining Fixes

**Branch:** `claude/full-stack-security-audit-mswox`
**Date:** 2026-01-19
**Status:** Build blockers fixed ✓ | Quick security wins implemented ✓ | Complex fixes pending

---

## ✅ COMPLETED FIXES (Committed & Pushed)

### Commit 1: Build Blockers
- ✅ Fixed 9 TypeScript errors (pagination API contract mismatch)
- ✅ Generated and applied missing migration 0009
- ✅ Frontend build now succeeds
- ✅ Backend migrations in sync

### Commit 2: Security Hardening
- ✅ Fixed task ID enumeration vulnerability
- ✅ Added mass assignment protection (read_only_fields)
- ✅ Added dev settings protection for production

**Impact:** Build unblocked, CI/CD ready, 3 high-severity vulnerabilities fixed

---

## 🔴 REMAINING CRITICAL FIXES (Priority 1 - Next Session)

### Issue #3: Household Invitation System (CRITICAL - 4-6 hours)

**Problem:** Any user can join any household by guessing/discovering the UUID, exposing all financial data.

**Current Vulnerability:**
```python
# backend/apps/core/serializers.py:112-135
def validate_household_id(self, value):
    if value:
        if not Household.objects.filter(id=value).exists():
            raise serializers.ValidationError('Household not found...')
    return value  # ❌ NO INVITATION CHECK!
```

**Implementation Plan:**

#### Step 1: Create HouseholdInvitation Model (1 hour)
**File:** `backend/apps/households/models.py`

```python
import secrets
from django.db import models
from django.utils import timezone
from datetime import timedelta

class HouseholdInvitation(models.Model):
    """Secure invitation system for joining households."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    household = models.ForeignKey(Household, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField(help_text="Email address of invitee")
    token = models.CharField(max_length=64, unique=True, editable=False)
    role = models.CharField(max_length=20, choices=[('member', 'Member'), ('admin', 'Admin')], default='member')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invitations_sent')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invitations_used')

    class Meta:
        db_table = 'household_invitations'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'household']),
        ]

    def __str__(self):
        return f"Invitation to {self.household.name} for {self.email}"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_valid(self):
        """Check if invitation is still valid."""
        return (
            not self.is_used
            and self.expires_at > timezone.now()
        )
```

**Migration:**
```bash
python manage.py makemigrations households -n add_household_invitation
python manage.py migrate households
```

#### Step 2: Create Invitation API Endpoints (1.5 hours)
**File:** `backend/apps/households/serializers.py`

```python
from rest_framework import serializers
from .models import HouseholdInvitation

class HouseholdInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseholdInvitation
        fields = ['id', 'email', 'role', 'created_at', 'expires_at', 'is_used']
        read_only_fields = ['id', 'created_at', 'expires_at', 'is_used']

    def validate_email(self, value):
        """Prevent duplicate invitations."""
        household = self.context['household']
        if HouseholdInvitation.objects.filter(
            household=household,
            email=value,
            is_used=False,
            expires_at__gt=timezone.now()
        ).exists():
            raise serializers.ValidationError(
                'An active invitation already exists for this email.'
            )
        return value

class InvitationRedemptionSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64)

    def validate_token(self, value):
        try:
            invitation = HouseholdInvitation.objects.get(token=value)
        except HouseholdInvitation.DoesNotExist:
            raise serializers.ValidationError('Invalid invitation token.')

        if not invitation.is_valid():
            raise serializers.ValidationError(
                'This invitation has expired or has already been used.'
            )

        return value
```

**File:** `backend/apps/households/views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings

class HouseholdInvitationViewSet(viewsets.ModelViewSet):
    serializer_class = HouseholdInvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only show invitations for user's households where they are owner/admin."""
        return HouseholdInvitation.objects.filter(
            household__memberships__user=self.request.user,
            household__memberships__role__in=['owner', 'admin']
        )

    def perform_create(self, serializer):
        """Create invitation and send email."""
        invitation = serializer.save(
            household=self.request.household,
            created_by=self.request.user
        )

        # Send invitation email
        invitation_url = f"{settings.FRONTEND_URL}/invite/{invitation.token}"
        send_mail(
            subject=f'Invitation to join {invitation.household.name} on Effluent',
            message=f'You have been invited to join {invitation.household.name}.\\n\\n'
                    f'Click here to accept: {invitation_url}\\n\\n'
                    f'This invitation expires in 7 days.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            fail_silently=False,
        )

    @action(detail=False, methods=['post'])
    def redeem(self, request):
        """Redeem an invitation token."""
        serializer = InvitationRedemptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        invitation = HouseholdInvitation.objects.get(token=token)

        # Create household membership
        from apps.core.models import HouseholdMembership
        membership, created = HouseholdMembership.objects.get_or_create(
            user=request.user,
            household=invitation.household,
            defaults={'role': invitation.role}
        )

        # Mark invitation as used
        invitation.is_used = True
        invitation.used_at = timezone.now()
        invitation.used_by = request.user
        invitation.save()

        return Response({
            'message': f'Successfully joined {invitation.household.name}',
            'household_id': str(invitation.household.id)
        }, status=status.HTTP_200_OK)
```

**File:** `backend/apps/households/urls.py` (add to main urls.py)

```python
from rest_framework.routers import DefaultRouter
from .views import HouseholdInvitationViewSet

router = DefaultRouter()
router.register(r'invitations', HouseholdInvitationViewSet, basename='household-invitation')

urlpatterns = router.urls
```

#### Step 3: Update User Registration (30 min)
**File:** `backend/apps/core/serializers.py`

```python
class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=12)  # Increased from 8
    household_id = serializers.UUIDField(write_only=True, required=False)
    invitation_token = serializers.CharField(write_only=True, required=False)  # NEW

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'household_id', 'invitation_token']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        household_id = attrs.get('household_id')
        invitation_token = attrs.get('invitation_token')

        # If household_id provided, require invitation_token
        if household_id and not invitation_token:
            raise serializers.ValidationError({
                'invitation_token': 'An invitation token is required to join an existing household.'
            })

        # Validate invitation if provided
        if invitation_token:
            try:
                from apps.households.models import HouseholdInvitation
                invitation = HouseholdInvitation.objects.get(token=invitation_token)
                if not invitation.is_valid():
                    raise serializers.ValidationError({
                        'invitation_token': 'This invitation has expired or has already been used.'
                    })
                # Verify email matches invitation
                if invitation.email != attrs.get('email'):
                    raise serializers.ValidationError({
                        'invitation_token': 'This invitation was sent to a different email address.'
                    })
                attrs['_invitation'] = invitation  # Store for use in create()
            except HouseholdInvitation.DoesNotExist:
                raise serializers.ValidationError({
                    'invitation_token': 'Invalid invitation token.'
                })

        return attrs

    def create(self, validated_data):
        household_id = validated_data.pop('household_id', None)
        invitation_token = validated_data.pop('invitation_token', None)
        invitation = validated_data.pop('_invitation', None)

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
        )

        if invitation:
            # Join via invitation
            HouseholdMembership.objects.create(
                user=user,
                household=invitation.household,
                role=invitation.role,
                is_default=True
            )
            # Mark invitation as used
            invitation.is_used = True
            invitation.used_at = timezone.now()
            invitation.used_by = user
            invitation.save()
        else:
            # Create new household for user
            household = Household.objects.create(
                name=f"{user.username}'s Household",
                slug=slugify(f"{user.username}-household-{str(uuid.uuid4())[:8]}")
            )
            HouseholdMembership.objects.create(
                user=user,
                household=household,
                role='owner',
                is_default=True
            )

        return user
```

#### Step 4: Frontend Implementation (1 hour)
**File:** `frontend/app/invite/[token]/page.tsx` (new)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { households } from '@/lib/api';

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const redeemInvitation = async () => {
      try {
        const response = await households.redeemInvitation(params.token);
        setStatus('success');
        setMessage(response.message);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => router.push('/'), 2000);
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Invalid or expired invitation');
      }
    };

    redeemInvitation();
  }, [params.token, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {status === 'loading' && <p>Accepting invitation...</p>}
      {status === 'success' && <p className="text-green-600">{message}</p>}
      {status === 'error' && <p className="text-red-600">{message}</p>}
    </div>
  );
}
```

**File:** `frontend/lib/api.ts` (add to households section)

```typescript
export const households = {
  // ... existing methods

  sendInvitation: (data: { email: string; role?: string }) =>
    api.post('/api/v1/households/invitations/', data),

  redeemInvitation: (token: string) =>
    api.post('/api/v1/households/invitations/redeem/', { token }),

  listInvitations: () =>
    api.get('/api/v1/households/invitations/'),
};
```

#### Step 5: Tests (1 hour)
**File:** `backend/apps/households/tests/test_invitations.py` (new)

```python
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from apps.core.models import User, Household, HouseholdMembership
from apps.households.models import HouseholdInvitation

class InvitationSystemTestCase(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@test.com',
            password='password123'
        )
        self.household = Household.objects.create(name='Test Household')
        HouseholdMembership.objects.create(
            user=self.owner,
            household=self.household,
            role='owner'
        )

    def test_cannot_join_household_without_invitation(self):
        """Verify unauthorized users cannot join households."""
        response = self.client.post('/api/auth/register/', {
            'email': 'attacker@evil.com',
            'username': 'attacker',
            'password': 'SecurePass123!',
            'household_id': str(self.household.id)
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('invitation_token', response.json())

    def test_invitation_creation_and_redemption(self):
        """Test full invitation flow."""
        # Owner creates invitation
        invitation = HouseholdInvitation.objects.create(
            household=self.household,
            email='newuser@test.com',
            created_by=self.owner
        )
        self.assertTrue(invitation.is_valid())

        # New user redeems invitation
        new_user = User.objects.create_user(
            username='newuser',
            email='newuser@test.com',
            password='password123'
        )
        self.client.force_authenticate(user=new_user)
        response = self.client.post('/api/v1/households/invitations/redeem/', {
            'token': invitation.token
        })
        self.assertEqual(response.status_code, 200)

        # Verify membership created
        self.assertTrue(
            HouseholdMembership.objects.filter(
                user=new_user,
                household=self.household
            ).exists()
        )

        # Verify invitation marked as used
        invitation.refresh_from_db()
        self.assertTrue(invitation.is_used)

    def test_expired_invitation_rejected(self):
        """Verify expired invitations cannot be redeemed."""
        invitation = HouseholdInvitation.objects.create(
            household=self.household,
            email='user@test.com',
            created_by=self.owner,
            expires_at=timezone.now() - timedelta(days=1)  # Expired
        )
        self.assertFalse(invitation.is_valid())

    def test_used_invitation_rejected(self):
        """Verify used invitations cannot be redeemed twice."""
        invitation = HouseholdInvitation.objects.create(
            household=self.household,
            email='user@test.com',
            created_by=self.owner,
            is_used=True
        )
        self.assertFalse(invitation.is_valid())
```

---

## 🟡 REMAINING HIGH PRIORITY FIXES (Priority 2 - After Invitation System)

### Issue #7: TaskMetadata Model for Persistent Ownership (3-4 hours)

**Problem:** Task ownership stored only in Redis cache (1h TTL). If cache clears or task runs >1 hour, users lose access.

**Implementation:**

```python
# backend/apps/core/models.py
class TaskMetadata(models.Model):
    """Persistent storage for async task ownership and metadata."""
    task_id = models.UUIDField(primary_key=True)
    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    task_type = models.CharField(max_length=50, choices=[
        ('scenario_compute', 'Scenario Computation'),
        ('baseline_refresh', 'Baseline Refresh'),
        ('stress_test', 'Stress Test'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Auto-set to created_at + 24 hours

    class Meta:
        db_table = 'task_metadata'
        indexes = [
            models.Index(fields=['household', 'created_at']),
            models.Index(fields=['expires_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
```

**Update all task creation views to use TaskMetadata instead of cache-only.**

---

### Issue #9: Add read_only_fields to Remaining Serializers (1 hour)

**Files to update:**
- `backend/apps/flows/serializers.py` - RecurringFlowSerializer
- `backend/apps/scenarios/serializers.py` - All serializers
- `backend/apps/taxes/serializers.py` - IncomeSourceSerializer
- `backend/apps/metrics/serializers.py` - MetricSnapshotSerializer
- `backend/apps/core/serializers.py` - UserSerializer, HouseholdSerializer

**Pattern:**
```python
class Meta:
    model = MyModel
    fields = ['id', 'name', 'created_at', 'updated_at', ...]
    read_only_fields = ['id', 'created_at', 'updated_at', 'computed_field', ...]
```

---

## 🟢 MEDIUM PRIORITY IMPROVEMENTS (Priority 3 - Polish)

### Issue #11: Standardize API Pagination (30 min)
- Document that all `list()` functions normalize to arrays
- Update any remaining endpoints that return raw pagination objects
- Add JSDoc comments to clarify behavior

### Issue #12: Strengthen Password Requirements (15 min)
- Already increased to 12 characters in invitation system
- Add Django password validators in settings/base.py
- Test with weak passwords

### Issue #13: Add Authentication to Health Checks (30 min)
```python
# backend/apps/core/permissions.py
class HealthCheckPermission(BasePermission):
    def has_permission(self, request, view):
        token = request.headers.get('X-Health-Check-Token')
        return token == settings.HEALTH_CHECK_TOKEN
```

### Issue #16: Move householdId to HttpOnly Cookie (30 min)
- Update `set-cookies` endpoint to include householdId
- Update API client to read from cookie header instead of localStorage
- Remove localStorage householdId references

---

## 📊 SUMMARY

**Completed:**
- ✅ 2 Blocker issues (build failures)
- ✅ 3 High severity security issues (enumeration, mass assignment, dev settings)

**Remaining:**
- 🔴 1 Critical (invitation system) - ~6 hours
- 🟡 2 High (TaskMetadata, serializers) - ~5 hours
- 🟢 4 Medium (pagination, passwords, health checks, cookies) - ~2 hours

**Total Estimated Effort:** ~13 hours for full remediation

**Next Session Priority:**
1. Implement household invitation system (blocking for security)
2. Add TaskMetadata model (improves reliability)
3. Complete read_only_fields across all serializers (defense in depth)
4. Polish items as time allows

---

## 🚀 DEPLOYMENT CHECKLIST

Before merging to main:
- [ ] All tests pass (`pytest backend/`)
- [ ] Frontend build succeeds (`npm run build`)
- [ ] No pending migrations (`makemigrations --check`)
- [ ] Invitation system tested end-to-end
- [ ] TaskMetadata tested with long-running tasks
- [ ] Security scan passes (if available)
- [ ] Code review by senior engineer
- [ ] Update CHANGELOG.md with security fixes

---

**End of Implementation Plan**
