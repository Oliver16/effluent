# Task 1: Django Backend Project Setup

## Objective
Initialize the Django 6.0 backend project with proper structure, Docker configuration, and core models.

## Prerequisites
- None (this is the foundation task)

## Deliverables
1. Django 6.0 project structure
2. Docker Compose configuration
3. Core models (User, Household, HouseholdMember, HouseholdMembership)
4. Household middleware for multi-tenancy
5. Working migrations

## Technology Stack
- Python 3.13+
- Django 6.0+
- PostgreSQL 16+
- Docker & Docker Compose

---

## Directory Structure to Create

```
backend/
├── manage.py
├── pyproject.toml
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── admin.py
│   │   └── apps.py
│   └── households/
│       ├── __init__.py
│       ├── middleware.py
│       ├── admin.py
│       └── apps.py
└── docker/
    └── Dockerfile
```

---

## File Contents

### pyproject.toml

```toml
[project]
name = "effluent"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "django>=6.0",
    "djangorestframework>=3.15",
    "djangorestframework-simplejwt>=5.3",
    "django-cors-headers>=4.3",
    "django-filter>=24.0",
    "psycopg[binary]>=3.1",
    "python-dateutil>=2.9",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.4",
    "pytest>=8.0",
    "pytest-django>=4.8",
]

[tool.ruff]
line-length = 100
target-version = "py313"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
```

### requirements/base.txt

```
django>=6.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-filter>=24.0
psycopg[binary]>=3.1
python-dateutil>=2.9
```

### requirements/dev.txt

```
-r base.txt
ruff>=0.4
pytest>=8.0
pytest-django>=4.8
```

### docker-compose.yml (project root)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: effluent
      POSTGRES_USER: effluent
      POSTGRES_PASSWORD: devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U effluent"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: docker/Dockerfile
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      - DEBUG=1
      - DB_HOST=db
      - DB_NAME=effluent
      - DB_USER=effluent
      - DB_PASSWORD=devpassword
      - DJANGO_SETTINGS_MODULE=config.settings.dev
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

### backend/docker/Dockerfile

```dockerfile
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/dev.txt ./requirements/
RUN pip install --no-cache-dir -r requirements/dev.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### config/settings/base.py

```python
import os
from pathlib import Path
from decimal import ROUND_HALF_UP
import decimal

BASE_DIR = Path(__file__).resolve().parent.parent.parent

decimal.getcontext().prec = 28
decimal.getcontext().rounding = ROUND_HALF_UP

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'apps.core',
    'apps.households',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.households.middleware.HouseholdMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'effluent'),
        'USER': os.environ.get('DB_USER', 'effluent'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

AUTH_USER_MODEL = 'core.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'COERCE_DECIMAL_TO_STRING': True,
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

### config/settings/dev.py

```python
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True
```

### config/settings/prod.py

```python
from .base import *

DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')
```

### config/urls.py

```python
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

### apps/core/models.py

```python
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
```

### apps/households/middleware.py

```python
from django.utils.functional import SimpleLazyObject
from apps.core.models import Household


def get_household(request):
    if hasattr(request, '_cached_household'):
        return request._cached_household
    
    household = None
    
    # Check header
    household_id = request.headers.get('X-Household-ID')
    if household_id:
        household = Household.objects.filter(id=household_id).first()
    
    # Check session
    if not household and hasattr(request, 'session'):
        household_id = request.session.get('current_household_id')
        if household_id:
            household = Household.objects.filter(id=household_id).first()
    
    # Fall back to user's default
    if not household and request.user.is_authenticated:
        household = request.user.get_default_household()
    
    # Verify access
    if household and request.user.is_authenticated:
        if not request.user.household_memberships.filter(household=household).exists():
            household = None
    
    request._cached_household = household
    return household


class HouseholdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        request.household = SimpleLazyObject(lambda: get_household(request))
        return self.get_response(request)
```

### apps/core/admin.py

```python
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
```

---

## Verification Steps

1. Build and start containers:
   ```bash
   docker-compose up --build
   ```

2. Run migrations:
   ```bash
   docker-compose exec backend python manage.py makemigrations
   docker-compose exec backend python manage.py migrate
   ```

3. Create superuser:
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

4. Verify admin access at http://localhost:8000/admin/

5. Verify JWT auth:
   ```bash
   curl -X POST http://localhost:8000/api/auth/token/ \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@example.com", "password": "yourpassword"}'
   ```

## Acceptance Criteria
- [ ] Docker containers build and run
- [ ] PostgreSQL connection works
- [ ] Migrations run without errors
- [ ] Admin site accessible
- [ ] JWT token endpoint works
- [ ] All models appear in admin
