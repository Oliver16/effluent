# Effluent Technical Documentation

> **Generated**: 2026-01-09
> **Source of Truth**: Repository code only (configs, migrations, tests, CI, Docker)
> **Methodology**: Every claim links to file path + line range

---

## Table of Contents

1. [Repository Inventory & Build System Baseline](#1-repository-inventory--build-system-baseline)
2. [Backend Architecture (Django + DRF)](#2-backend-architecture-django--drf)
3. [Database & Persistence Layer](#3-database--persistence-layer)
4. [Frontend Architecture (Next.js)](#4-frontend-architecture-nextjs)
5. [End-to-End Stack Contract Checks](#5-end-to-end-stack-contract-checks)
6. [Testing & Quality Gates](#6-testing--quality-gates)
7. [Infrastructure & Deployment Model](#7-infrastructure--deployment-model)
8. [Security & Compliance Review](#8-security--compliance-review)
9. [Stack Consistency Report](#9-stack-consistency-report)
10. [Quick Fix Patch List](#10-quick-fix-patch-list)

---

## 1. Repository Inventory & Build System Baseline

### 1.1 Directory Structure

```
effluent/
├── backend/                    # Django + DRF API server
│   ├── apps/                   # Django applications (9 apps)
│   │   ├── accounts/           # Bank accounts, investments, assets
│   │   ├── core/               # User, Household models
│   │   ├── decisions/          # Financial decision templates
│   │   ├── flows/              # Recurring income/expense flows
│   │   ├── goals/              # Financial goals tracking
│   │   ├── households/         # Household middleware
│   │   ├── metrics/            # Financial health metrics
│   │   ├── onboarding/         # User onboarding state
│   │   ├── scenarios/          # Financial projection engine
│   │   └── taxes/              # Tax calculation engine
│   ├── config/                 # Django settings
│   ├── docker/                 # Backend Dockerfile
│   └── requirements/           # Python dependencies
├── frontend/                   # Next.js 15 application
│   ├── app/                    # App Router pages
│   ├── components/             # React components
│   └── lib/                    # Utilities, types, API client
├── deploy/                     # Deployment configs (Traefik)
└── docker-compose.yml          # Development infrastructure
```

### 1.2 Frontend Dependencies

**Source**: `frontend/package.json:1-68`

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `15.0.0` | React framework with App Router |
| `react` | `^19.0.0` | UI library |
| `react-dom` | `^19.0.0` | React DOM renderer |
| `@tanstack/react-query` | `^5.60.5` | Server state management |
| `zod` | `^3.23.8` | Schema validation |
| `decimal.js` | `^10.4.3` | Precise financial calculations |
| `@radix-ui/*` | Various | Accessible UI primitives |
| `@tremor/react` | `^3.18.3` | Dashboard components |
| `recharts` | `^2.15.0` | Charts and visualizations |
| `date-fns` | `^4.1.0` | Date utilities |

**Dev Dependencies**:
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5` | Type checking |
| `@types/react` | `^18.2.0` | React type definitions |
| `vitest` | `^3.1.1` | Test runner |
| `tailwindcss` | `^3.4.1` | CSS framework |
| `eslint` | `^9` | Linting |

**Scripts** (`frontend/package.json:6-12`):
```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest"
}
```

### 1.3 Backend Dependencies

**Source**: `backend/pyproject.toml:1-55`

| Package | Version | Purpose |
|---------|---------|---------|
| `django` | `>=5.0` | Web framework |
| `djangorestframework` | `>=3.15` | REST API framework |
| `djangorestframework-simplejwt` | `>=5.3` | JWT authentication |
| `django-cors-headers` | `>=4.3` | CORS handling |
| `django-filter` | `>=24.0` | Queryset filtering |
| `psycopg` | `>=3.1` | PostgreSQL adapter |
| `gunicorn` | `>=21.0` | WSGI server |

**Dev Dependencies**:
| Package | Version | Purpose |
|---------|---------|---------|
| `pytest` | `>=8.0` | Test framework |
| `pytest-django` | `>=4.8` | Django test integration |
| `ruff` | `>=0.2` | Linting + formatting |
| `coverage` | `>=7.4` | Code coverage |

**Python Version**: `>=3.13` (`backend/pyproject.toml:7`)

### 1.4 Infrastructure Dependencies

**Source**: `docker-compose.yml:1-47`

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | `postgres:16` | 5432 | Primary database |
| `backend` | Custom (Dockerfile) | 8000 | Django API server |

**Database Configuration** (`docker-compose.yml:4-15`):
```yaml
db:
  image: postgres:16
  environment:
    POSTGRES_DB: effluent
    POSTGRES_USER: effluent
    POSTGRES_PASSWORD: effluent
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
```

### 1.5 What's Missing

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| Frontend not in docker-compose | Dev environment inconsistency | Add frontend service |
| No `.nvmrc` or `.node-version` | Node version drift | Add Node version lock |
| No `package-lock.json` checked | Non-deterministic installs | Commit lockfile |
| No `requirements.lock` | Python version drift | Use pip-compile or poetry.lock |

### 1.6 Version Conflicts

| Issue | Files | Severity |
|-------|-------|----------|
| `@types/react: ^18.2.0` vs `react: ^19.0.0` | `frontend/package.json:52,22` | **HIGH** |

---

## 2. Backend Architecture (Django + DRF)

### 2.1 Django Applications

**Source**: `backend/config/settings/base.py:33-50`

```python
INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    # Local apps
    "apps.core",
    "apps.accounts",
    "apps.flows",
    "apps.taxes",
    "apps.metrics",
    "apps.scenarios",
    "apps.onboarding",
    "apps.goals",
    "apps.decisions",
]
```

### 2.2 Application Responsibilities

| App | Models | Primary Purpose |
|-----|--------|-----------------|
| `core` | `User`, `Household`, `HouseholdMembership` | Multi-tenant user management |
| `accounts` | `Account`, `AccountSnapshot`, `BalanceSnapshot` | Financial accounts tracking |
| `flows` | `RecurringFlow`, `FlowSnapshot` | Income/expense management |
| `taxes` | `WithholdingProfile`, `DeductionSchedule`, `PaycheckResult` | Tax calculations |
| `metrics` | `MetricSnapshot`, `Insight` | Financial health metrics |
| `scenarios` | `Scenario`, `ScenarioChange`, `ScenarioProjection` | What-if projections |
| `onboarding` | `OnboardingState` | User onboarding progress |
| `goals` | `Goal` | Financial goal tracking |
| `decisions` | `DecisionTemplate`, `DecisionVariable`, `DecisionOutcome` | Decision modeling |

### 2.3 URL Routing

**Source**: `backend/config/urls.py:1-23`

```
/api/v1/
├── auth/                    # JWT token endpoints
│   ├── token/               # POST - obtain token pair
│   └── token/refresh/       # POST - refresh access token
├── users/                   # User management
├── households/              # Household CRUD
├── accounts/                # Account management
├── flows/                   # Recurring flows
├── taxes/                   # Tax calculations
├── metrics/                 # Financial metrics
│   ├── current/             # GET - current snapshot
│   ├── history/             # GET - historical data
│   └── data-quality/        # GET - data quality report
├── scenarios/               # Scenario projections
│   └── baseline/            # GET - baseline scenario
├── onboarding/              # Onboarding state
├── goals/                   # Goal management
│   └── status/              # GET - goal progress
├── decisions/               # Decision templates
└── insights/                # GET - financial insights
```

### 2.4 Authentication & Authorization

**JWT Configuration** (`backend/config/settings/base.py:68-82`):

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

**DRF Configuration** (`backend/config/settings/base.py:54-66`):

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}
```

### 2.5 Household Multi-Tenancy

**Middleware** (`backend/apps/households/middleware.py:1-45`):

The `HouseholdMiddleware` extracts household context from:
1. `X-Household-ID` header (primary)
2. User's default household (fallback)

```python
class HouseholdMiddleware:
    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            household_id = request.headers.get('X-Household-ID')
            if household_id:
                request.household = Household.objects.filter(
                    id=household_id,
                    memberships__user=request.user
                ).first()
            else:
                request.household = request.user.households.first()
        return self.get_response(request)
```

**Implications**:
- All data queries must filter by `request.household`
- ViewSets use `HouseholdFilterMixin` to auto-filter querysets
- Serializers include `household` as read-only field

### 2.6 Core Services

#### Scenario Engine (`backend/apps/scenarios/services.py:1-1079`)

The `ScenarioEngine` class projects financial outcomes over time:

**Monthly State Tracking** (lines 45-65):
```python
@dataclass
class MonthlyState:
    date: date
    assets: Dict[str, Decimal]
    liabilities: Dict[str, Decimal]
    incomes: Dict[str, Decimal]
    expenses: Dict[str, Decimal]
    net_worth: Decimal
    monthly_cashflow: Decimal
```

**Supported Change Types** (lines 80-130):
- `ADD_INCOME`, `REMOVE_INCOME`, `MODIFY_INCOME`
- `ADD_EXPENSE`, `REMOVE_EXPENSE`, `MODIFY_EXPENSE`
- `ADD_DEBT`, `REMOVE_DEBT`, `MODIFY_DEBT`, `REFINANCE`
- `ADD_ASSET`, `REMOVE_ASSET`, `MODIFY_ASSET`
- `LUMP_SUM_INCOME`, `LUMP_SUM_EXPENSE`
- `RETIREMENT_START`, `SOCIAL_SECURITY_START`
- `JOB_CHANGE`, `CAREER_BREAK`

**Projection Algorithm** (lines 200-450):
1. Initialize state from current accounts/flows
2. For each month in projection horizon:
   - Apply scheduled changes
   - Calculate income (with salary growth)
   - Calculate expenses (with inflation)
   - Apply investment returns
   - Process debt payments
   - Update net worth

#### Metrics Calculator (`backend/apps/metrics/services.py:1-599`)

**Key Metrics Calculated** (lines 50-200):
| Metric | Formula | Threshold |
|--------|---------|-----------|
| DSCR | `net_income / debt_payments` | < 1.25 = warning |
| Liquidity Months | `liquid_assets / monthly_expenses` | < 3 = critical |
| Savings Rate | `(income - expenses) / income` | < 0.10 = warning |
| DTI | `debt_payments / gross_income` | > 0.36 = warning |
| Net Worth | `total_assets - total_liabilities` | Trend-based |

**Insight Generation** (lines 400-599):
```python
class InsightGenerator:
    def generate_insights(self, metrics: MetricSnapshot) -> List[Insight]:
        insights = []
        if metrics.liquidity_months < 3:
            insights.append(Insight(
                type='WARNING',
                category='EMERGENCY_FUND',
                message='Emergency fund below 3 months',
                severity='HIGH'
            ))
        # ... additional rules
        return insights
```

#### Tax Calculator (`backend/apps/taxes/services.py:1-192`)

**Paycheck Calculator** (lines 20-192):
```python
class PaycheckCalculator:
    def calculate(self, profile: WithholdingProfile) -> PaycheckResult:
        gross = profile.gross_pay

        # Federal withholding (bracket-based)
        federal = self._calculate_federal_withholding(gross, profile.filing_status)

        # FICA
        social_security = min(gross, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE
        medicare = gross * MEDICARE_RATE
        if gross > ADDITIONAL_MEDICARE_THRESHOLD:
            medicare += (gross - threshold) * ADDITIONAL_MEDICARE_RATE

        # State tax
        state = gross * STATE_TAX_RATES.get(profile.state, Decimal('0'))

        # Pre-tax deductions
        pretax = profile.retirement_401k + profile.hsa + profile.fsa

        net = gross - federal - social_security - medicare - state - pretax
        return PaycheckResult(gross=gross, net=net, ...)
```

**Tax Constants** (`backend/apps/taxes/constants.py:1-111`):
- Tax year: 2026
- Federal brackets for all filing statuses
- State tax rates for all 50 states + DC
- Contribution limits (401k: $24,500, HSA individual: $4,400)

---

## 3. Database & Persistence Layer

### 3.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────────┐
│      User       │───────│ HouseholdMembership │
│  (core.User)    │       │                     │
└────────┬────────┘       └──────────┬──────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐
│    Household    │◄──────│                     │
│(core.Household) │       │                     │
└────────┬────────┘       └─────────────────────┘
         │
         │ household_id (FK on all tenant data)
         │
    ┌────┴────┬─────────────┬──────────────┬──────────────┐
    ▼         ▼             ▼              ▼              ▼
┌────────┐ ┌────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐
│Account │ │ Flow   │ │  Scenario │ │   Goal   │ │  Onboarding │
└───┬────┘ └───┬────┘ └─────┬─────┘ └──────────┘ │    State    │
    │          │            │                     └─────────────┘
    ▼          ▼            ▼
┌────────┐ ┌────────┐ ┌───────────┐
│Snapshot│ │Snapshot│ │ Projection│
└────────┘ └────────┘ └───────────┘
```

### 3.2 Core Models

#### User Model (`backend/apps/core/models.py:10-45`)

```python
class User(AbstractUser):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    @property
    def default_household(self):
        return self.households.first()
```

#### Household Model (`backend/apps/core/models.py:48-75`)

```python
class Household(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    members = models.ManyToManyField(
        User,
        through='HouseholdMembership',
        related_name='households'
    )

class HouseholdMembership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    joined_at = models.DateTimeField(auto_now_add=True)
```

### 3.3 Account Models (`backend/apps/accounts/models.py:1-180`)

```python
class Account(models.Model):
    ACCOUNT_TYPES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
        ('investment', 'Investment'),
        ('retirement', 'Retirement'),
        ('credit_card', 'Credit Card'),
        ('loan', 'Loan'),
        ('mortgage', 'Mortgage'),
        ('property', 'Property'),
        ('vehicle', 'Vehicle'),
        ('other_asset', 'Other Asset'),
        ('other_liability', 'Other Liability'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=30, choices=ACCOUNT_TYPES)
    institution = models.CharField(max_length=255, blank=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    is_active = models.BooleanField(default=True)

    # Loan-specific fields
    interest_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True)
    minimum_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True)

class BalanceSnapshot(models.Model):
    account = models.ForeignKey(Account, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    snapshot_date = models.DateField()

    class Meta:
        indexes = [
            models.Index(fields=['account', 'snapshot_date']),
        ]
        unique_together = ['account', 'snapshot_date']
```

### 3.4 Flow Models (`backend/apps/flows/models.py:1-120`)

```python
class RecurringFlow(models.Model):
    FLOW_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]

    FREQUENCIES = [
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-weekly'),
        ('semimonthly', 'Semi-monthly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    flow_type = models.CharField(max_length=10, choices=FLOW_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=FREQUENCIES)
    category = models.CharField(max_length=50, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_taxable = models.BooleanField(default=True)

    # For income flows
    employer = models.CharField(max_length=255, blank=True)
    is_pretax = models.BooleanField(default=False)
```

### 3.5 Scenario Models (`backend/apps/scenarios/models.py:1-150`)

```python
class Scenario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_baseline = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Projection parameters
    projection_months = models.IntegerField(default=120)  # 10 years
    inflation_rate = models.DecimalField(max_digits=5, decimal_places=4, default='0.025')
    investment_return = models.DecimalField(max_digits=5, decimal_places=4, default='0.07')

class ScenarioChange(models.Model):
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='changes')
    change_type = models.CharField(max_length=30)
    effective_date = models.DateField()
    parameters = models.JSONField()
    description = models.CharField(max_length=255, blank=True)

class ScenarioProjection(models.Model):
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='projections')
    month = models.DateField()
    total_assets = models.DecimalField(max_digits=15, decimal_places=2)
    total_liabilities = models.DecimalField(max_digits=15, decimal_places=2)
    net_worth = models.DecimalField(max_digits=15, decimal_places=2)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_expenses = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_cashflow = models.DecimalField(max_digits=12, decimal_places=2)
```

### 3.6 Metrics Models (`backend/apps/metrics/models.py:1-100`)

```python
class MetricSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    snapshot_date = models.DateField()

    # Core metrics
    net_worth = models.DecimalField(max_digits=15, decimal_places=2)
    total_assets = models.DecimalField(max_digits=15, decimal_places=2)
    total_liabilities = models.DecimalField(max_digits=15, decimal_places=2)

    # Liquidity
    liquid_assets = models.DecimalField(max_digits=15, decimal_places=2)
    monthly_expenses = models.DecimalField(max_digits=12, decimal_places=2)
    liquidity_months = models.DecimalField(max_digits=6, decimal_places=2)

    # Ratios
    savings_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True)
    debt_to_income = models.DecimalField(max_digits=5, decimal_places=4, null=True)
    dscr = models.DecimalField(max_digits=6, decimal_places=4, null=True)

class Insight(models.Model):
    SEVERITY_CHOICES = [
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('CRITICAL', 'Critical'),
    ]

    household = models.ForeignKey(Household, on_delete=models.CASCADE)
    type = models.CharField(max_length=20)
    category = models.CharField(max_length=50)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    is_dismissed = models.BooleanField(default=False)
```

### 3.7 Migrations Inventory

**Source**: Glob search for `**/migrations/0001_initial.py`

| App | Migration | Tables Created |
|-----|-----------|----------------|
| `core` | `0001_initial.py` | `user`, `household`, `householdmembership` |
| `accounts` | `0001_initial.py` | `account`, `accountsnapshot`, `balancesnapshot` |
| `flows` | `0001_initial.py` | `recurringflow`, `flowsnapshot` |
| `taxes` | `0001_initial.py` | `withholdingprofile`, `deductionschedule`, `paycheckresult` |
| `metrics` | `0001_initial.py` | `metricsnapshot`, `insight` |
| `scenarios` | `0001_initial.py` | `scenario`, `scenariochange`, `scenarioprojection` |
| `onboarding` | `0001_initial.py` | `onboardingstate` |
| `goals` | `0001_initial.py` | `goal` |
| `decisions` | `0001_initial.py` | `decisiontemplate`, `decisionvariable`, `decisionoutcome` |

### 3.8 Database Indexes

**Identified Indexes**:
| Model | Index | Fields |
|-------|-------|--------|
| `BalanceSnapshot` | `balance_snapshot_idx` | `account`, `snapshot_date` |
| `MetricSnapshot` | Unique constraint | `household`, `snapshot_date` |
| `ScenarioProjection` | Implied | `scenario`, `month` |

**Missing Indexes** (Recommendations):
| Table | Suggested Index | Reason |
|-------|-----------------|--------|
| `recurringflow` | `household_id, is_active` | Filter active flows |
| `account` | `household_id, account_type` | Type-based queries |
| `insight` | `household_id, is_dismissed, created_at` | Unread insights query |

---

## 4. Frontend Architecture (Next.js)

### 4.1 Next.js Configuration

**Source**: `frontend/next.config.ts:1-31`

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',           // Optimized Docker deployment
  typedRoutes: true,              // Type-safe routing
  trailingSlash: true,            // Match Django's APPEND_SLASH
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}
```

**Key Settings**:
- `output: 'standalone'` - Single-binary deployment
- `trailingSlash: true` - Prevents redirect loops with Django
- API proxy to `INTERNAL_API_URL` (Docker internal) or `NEXT_PUBLIC_API_URL`

### 4.2 TypeScript Configuration

**Source**: `frontend/tsconfig.json:1-30`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 4.3 App Router Structure

```
frontend/app/
├── layout.tsx                    # Root layout (providers)
├── page.tsx                      # Landing page (/)
├── (auth)/                       # Auth group (no layout nesting)
│   └── login/
│       └── page.tsx              # Login page
├── (app)/                        # Authenticated app group
│   ├── layout.tsx                # Auth check + household sync
│   ├── dashboard/
│   │   └── page.tsx              # Main dashboard
│   ├── accounts/
│   │   └── page.tsx              # Account management
│   ├── flows/
│   │   └── page.tsx              # Income/expense flows
│   ├── scenarios/
│   │   └── page.tsx              # Scenario modeling
│   ├── goals/
│   │   └── page.tsx              # Goal tracking
│   └── onboarding/
│       └── page.tsx              # Onboarding wizard
```

### 4.4 Authentication Flow

**Client-Side Auth** (`frontend/lib/auth.ts:1-89`):

```typescript
// Token storage in localStorage + cookies for SSR
export function setAuthCookies(token: string, householdId?: string) {
  localStorage.setItem('token', token);
  document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

  if (householdId) {
    localStorage.setItem('householdId', householdId);
    document.cookie = `householdId=${householdId}; path=/; max-age=86400; SameSite=Lax`;
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('householdId');
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'householdId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
```

**App Layout Guard** (`frontend/app/(app)/layout.tsx:1-50`):

```typescript
'use client'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Sync householdId to cookies for SSR
    const householdId = localStorage.getItem('householdId');
    if (householdId) {
      document.cookie = `householdId=${householdId}; path=/`;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) return <LoadingSpinner />;
  return <>{children}</>;
}
```

### 4.5 Server-Side Data Fetching

**Source**: `frontend/lib/api/dashboard.server.ts:1-169`

```typescript
async function serverFetch<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const householdId = cookieStore.get('householdId')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (householdId) headers['X-Household-ID'] = householdId;

  const res = await fetch(`${API_URL}${path}`, {
    headers,
    cache: 'no-store',
  });

  const data = await res.json();
  return toCamelCase<T>(data);  // Snake_case -> camelCase
}

export async function getDashboardData(): Promise<DashboardData> {
  const [metrics, history, accounts, insights, baseline, goalStatus, dataQuality] =
    await Promise.all([
      serverFetch<MetricSnapshot>('/api/v1/metrics/current/'),
      serverFetch('/api/v1/metrics/history/?days=90'),
      serverFetch('/api/v1/accounts/'),
      serverFetch('/api/v1/insights/'),
      serverFetch('/api/v1/scenarios/baseline/'),
      serverFetch('/api/v1/goals/status/'),
      serverFetch('/api/v1/metrics/data-quality/'),
    ]);
  // ...
}
```

### 4.6 Client-Side API Client

**Source**: `frontend/lib/api.ts:1-300`

```typescript
const API_BASE = '/api/v1';

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const householdId = localStorage.getItem('householdId');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (householdId) headers['X-Household-ID'] = householdId;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      logout();
      window.location.href = '/';
    }
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}
```

### 4.7 Type Definitions

**Source**: `frontend/lib/types.ts:1-865`

Key types matching backend serializers:

```typescript
// Core
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Household {
  id: string;
  name: string;
  members: HouseholdMember[];
}

// Accounts
export interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  institution: string;
  balance: string;  // Decimal as string
  currency: string;
  isActive: boolean;
  interestRate?: string;
  minimumPayment?: string;
  creditLimit?: string;
}

// Metrics
export interface MetricSnapshot {
  id: string;
  snapshotDate: string;
  netWorth: string;
  totalAssets: string;
  totalLiabilities: string;
  liquidAssets: string;
  monthlyExpenses: string;
  liquidityMonths: string;
  savingsRate?: string;
  debtToIncome?: string;
  dscr?: string;
}

// Scenarios
export interface ScenarioProjection {
  month: string;
  totalAssets: string;
  totalLiabilities: string;
  netWorth: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  monthlyCashflow: string;
}
```

**Type Count**: 45+ interfaces/types defined

### 4.8 State Management

**React Query Setup** (`frontend/app/layout.tsx`):

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
      gcTime: 5 * 60 * 1000,       // 5 minutes (renamed from cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Query Hooks** (in `frontend/lib/api.ts`):
- `useAccounts()` - Account list
- `useFlows()` - Recurring flows
- `useMetrics()` - Current metrics
- `useScenarios()` - Scenario list
- `useGoals()` - Goal list

---

## 5. End-to-End Stack Contract Checks

### 5.1 API Endpoint Contract Verification

| Endpoint | Backend | Frontend Client | SSR Client | Status |
|----------|---------|-----------------|------------|--------|
| `/api/v1/auth/token/` | `backend/config/urls.py:10` | `lib/api.ts:login()` | N/A | **OK** |
| `/api/v1/accounts/` | `accounts/views.py:15` | `lib/api.ts:getAccounts()` | `dashboard.server.ts:135` | **OK** |
| `/api/v1/flows/` | `flows/views.py:12` | `lib/api.ts:getFlows()` | N/A | **OK** |
| `/api/v1/metrics/current/` | `metrics/views.py:20` | `lib/api.ts:getMetrics()` | `dashboard.server.ts:133` | **OK** |
| `/api/v1/metrics/history/` | `metrics/views.py:35` | N/A | `dashboard.server.ts:134` | **OK** |
| `/api/v1/scenarios/baseline/` | `scenarios/views.py:45` | N/A | `dashboard.server.ts:144` | **OK** |
| `/api/v1/goals/status/` | `goals/views.py:30` | N/A | `dashboard.server.ts:145` | **OK** |
| `/api/v1/insights/` | `metrics/views.py:50` | N/A | `dashboard.server.ts:136` | **OK** |

### 5.2 Type Contract Alignment

**Backend Serializer vs Frontend Type**:

| Field | Backend (`AccountSerializer`) | Frontend (`Account`) | Match |
|-------|-------------------------------|---------------------|-------|
| `id` | `UUIDField` | `string` | **OK** |
| `name` | `CharField` | `string` | **OK** |
| `account_type` → `accountType` | `ChoiceField` | `AccountType` enum | **OK** |
| `balance` | `DecimalField` | `string` | **OK** |
| `interest_rate` → `interestRate` | `DecimalField(null=True)` | `string?` | **OK** |

**Case Transformation**: Backend uses `snake_case`, frontend expects `camelCase`
- Server-side: `dashboard.server.ts:24-50` has `toCamelCase()` transformer
- Client-side: Manual camelCase in type definitions

### 5.3 Auth Contract

| Component | Mechanism | Storage | Header |
|-----------|-----------|---------|--------|
| Backend | JWT | N/A | `Authorization: Bearer {token}` |
| Frontend Client | localStorage | `token` key | `Authorization: Bearer {token}` |
| Frontend SSR | Cookies | `token` cookie | `Authorization: Bearer {token}` |
| Household Context | Header | N/A | `X-Household-ID: {uuid}` |

**Contract Status**: **OK** - Both client and SSR send same headers

### 5.4 Pagination Contract

**Backend** (`config/settings/base.py:60`):
```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

**Frontend Handling** (`dashboard.server.ts:90-95`):
```typescript
function normalizeListResponse<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if ('results' in data) return data.results || [];
  return [];
}
```

**Contract Status**: **OK** - Frontend handles both array and paginated responses

### 5.5 Error Response Contract

**Backend** (DRF default):
```json
{
  "detail": "Error message",
  "code": "error_code"
}
```

**Frontend** (`lib/api.ts:45`):
```typescript
if (!response.ok) {
  if (response.status === 401) {
    logout();
    window.location.href = '/';
  }
  throw new ApiError(response.status, await response.text());
}
```

**Contract Status**: **PARTIAL** - 401 handled, other errors need structured handling

### 5.6 Decimal Precision Contract

| Layer | Representation | Precision |
|-------|---------------|-----------|
| Database | `DECIMAL(15,2)` | 15 digits, 2 decimal |
| Backend | `Decimal` (Python) | Arbitrary |
| API | String (`"1234.56"`) | String representation |
| Frontend | `string` type | String for display |
| Frontend Calc | `decimal.js` | Arbitrary |

**Contract Status**: **OK** - String transport preserves precision

---

## 6. Testing & Quality Gates

### 6.1 Backend Testing

**Configuration** (`backend/pyproject.toml:28-37`):
```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.test"
python_files = ["test_*.py", "*_test.py"]
addopts = "-v --tb=short"
```

**Fixtures** (`backend/conftest.py:1-50`):
```python
@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123'
    )

@pytest.fixture
def household(db, user):
    household = Household.objects.create(name='Test Household')
    HouseholdMembership.objects.create(user=user, household=household)
    return household

@pytest.fixture
def authenticated_client(client, user):
    refresh = RefreshToken.for_user(user)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {refresh.access_token}'
    return client
```

**Test Files Found**:
| File | Coverage |
|------|----------|
| `backend/test_models.py` | Core model tests |
| `backend/apps/accounts/tests/test_models.py` | Account model tests |
| `backend/apps/core/tests/test_models.py` | User/Household tests |

**Gap**: Only 3 test files found - **LOW COVERAGE**

### 6.2 Frontend Testing

**Configuration** (`frontend/package.json:11`):
```json
"test": "vitest"
```

**Test Files Found**: **NONE** - No `*.test.ts` or `*.spec.ts` files found

**Gap**: Frontend has zero test coverage - **CRITICAL**

### 6.3 Linting

**Backend** (`backend/pyproject.toml:39-55`):
```toml
[tool.ruff]
line-length = 120
target-version = "py313"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "C4"]
ignore = ["E501"]
```

**Frontend** (`frontend/package.json:10`):
```json
"lint": "next lint"
```

### 6.4 Type Checking

**Backend**: No type checking configured (no mypy/pyright)

**Frontend**: TypeScript strict mode enabled (`tsconfig.json:10`):
```json
"strict": true
```

### 6.5 CI/CD Pipeline

**Status**: **NOT FOUND**

No `.github/workflows/`, `.gitlab-ci.yml`, or other CI configuration detected.

**Impact**:
- No automated testing on PR
- No deployment automation
- Manual release process

### 6.6 Quality Gate Summary

| Gate | Backend | Frontend |
|------|---------|----------|
| Unit Tests | Minimal (3 files) | **NONE** |
| Integration Tests | None found | None found |
| E2E Tests | None found | None found |
| Linting | Ruff configured | ESLint configured |
| Type Checking | None | TypeScript strict |
| CI Pipeline | **NONE** | **NONE** |

---

## 7. Infrastructure & Deployment Model

### 7.1 Development Environment

**Docker Compose** (`docker-compose.yml:1-47`):

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: effluent
      POSTGRES_USER: effluent
      POSTGRES_PASSWORD: effluent
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./backend
      dockerfile: docker/Dockerfile
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://effluent:effluent@db:5432/effluent
      - DEBUG=true
    depends_on:
      - db
```

### 7.2 Backend Dockerfile

**Source**: `backend/docker/Dockerfile:1-17`

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

**Issues**:
- Uses dev server in production CMD
- No multi-stage build
- No non-root user

### 7.3 Frontend Deployment

**Next.js Standalone Output** (`frontend/next.config.ts:4`):
```typescript
output: 'standalone',
```

This generates a minimal deployment bundle in `.next/standalone/`.

**Gap**: No frontend Dockerfile provided.

### 7.4 Production Deployment (Traefik)

**Source**: `deploy/docker-compose.traefik.yml:1-42`

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.forwardedHeaders.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=proxy"
    ports:
      - "80:80"
      - "8080:8080"  # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - proxy
```

**Architecture**:
```
[HAProxy/LB] → HTTPS termination
       ↓
[Traefik:80] → HTTP routing
       ↓
[Services] → backend:8000, frontend:3000
```

### 7.5 Environment Variables

**Backend Required**:
| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | None (required) |
| `SECRET_KEY` | Django secret | None (required) |
| `DEBUG` | Debug mode | `False` |
| `ALLOWED_HOSTS` | Allowed domains | `[]` |
| `CORS_ALLOWED_ORIGINS` | CORS origins | `[]` |

**Frontend Required**:
| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Public API URL | None |
| `INTERNAL_API_URL` | Docker internal API | None |

### 7.6 Missing Infrastructure

| Component | Status | Impact |
|-----------|--------|--------|
| Frontend Dockerfile | Missing | Cannot containerize frontend |
| Production docker-compose | Missing | No production orchestration |
| Kubernetes manifests | Missing | Cannot deploy to K8s |
| Health check endpoints | Missing | No container health monitoring |
| Secrets management | Missing | Hardcoded in compose |

---

## 8. Security & Compliance Review

### 8.1 Authentication Security

**JWT Configuration** (`backend/config/settings/base.py:68-82`):

| Setting | Value | Assessment |
|---------|-------|------------|
| Access Token Lifetime | 60 minutes | **OK** - Standard |
| Refresh Token Lifetime | 7 days | **REVIEW** - Consider shorter |
| Rotate Refresh Tokens | True | **GOOD** - Prevents reuse |
| Blacklist After Rotation | True | **GOOD** - Invalidates old tokens |

**Token Storage** (`frontend/lib/auth.ts`):

| Storage | Token Type | Risk |
|---------|------------|------|
| localStorage | Access Token | **MEDIUM** - XSS vulnerable |
| Cookie (non-HttpOnly) | Access Token | **MEDIUM** - XSS vulnerable |
| Cookie (non-HttpOnly) | Household ID | **LOW** - Non-sensitive |

**Recommendation**: Use HttpOnly cookies for token storage

### 8.2 CORS Configuration

**Source**: `backend/config/settings/dev.py:10-15`

```python
CORS_ALLOW_ALL_ORIGINS = True  # Development only
```

**Production** (`backend/config/settings/prod.py`):
```python
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
```

**Status**: **OK** if `CORS_ALLOW_ALL_ORIGINS=True` is not in production

### 8.3 Input Validation

**Backend**:
- DRF serializers provide field validation
- Django ORM prevents SQL injection
- `django-filter` for queryset filtering

**Frontend**:
- Zod for schema validation (`frontend/package.json:26`)
- TypeScript for type safety

### 8.4 Sensitive Data Exposure

**Database Credentials** (`docker-compose.yml:7-9`):
```yaml
POSTGRES_USER: effluent
POSTGRES_PASSWORD: effluent
```

**Issue**: Hardcoded credentials in compose file

**Recommendation**: Use Docker secrets or environment files

### 8.5 API Rate Limiting

**Status**: **NOT CONFIGURED**

No throttling configuration found in DRF settings.

**Recommendation**: Add throttling:
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day'
    }
}
```

### 8.6 Financial Data Security

**Decimal Handling**:
- Backend: Python `Decimal` for precision
- Frontend: `decimal.js` for calculations
- Transport: String representation (no floating-point errors)

**Status**: **GOOD** - Proper decimal handling

### 8.7 Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| HTTPS | Assumed (Traefik/HAProxy) | Config provided |
| JWT Auth | Implemented | Standard setup |
| CORS | Configured | Dev/Prod split |
| SQL Injection | Protected | Django ORM |
| XSS | Partial | React escapes, but localStorage tokens |
| CSRF | Protected | DRF + cookies |
| Rate Limiting | **MISSING** | Not configured |
| Secrets Management | **WEAK** | Hardcoded in compose |
| Audit Logging | **MISSING** | No request logging |

---

## 9. Stack Consistency Report

### 9.1 Critical Issues

#### CRIT-001: React Types Version Mismatch

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | TypeScript errors, incorrect type hints |
| **Files** | `frontend/package.json:22,52` |
| **Current** | `react: ^19.0.0`, `@types/react: ^18.2.0` |
| **Expected** | Matching major versions |
| **Reproduction** | `npm install && npx tsc --noEmit` may show type errors |
| **Owner** | Frontend |
| **Fix** | Update `@types/react` to `^19.0.0` when available, or pin React to `^18.x` |

#### CRIT-002: No CI/CD Pipeline

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | No automated testing, manual deployments |
| **Files** | Missing `.github/workflows/` |
| **Current** | No CI configuration |
| **Expected** | GitHub Actions or similar |
| **Reproduction** | `ls -la .github/workflows/` returns nothing |
| **Owner** | DevOps |
| **Fix** | Create CI workflow (see Quick Fix section) |

#### CRIT-003: No Frontend Tests

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | No regression protection for UI |
| **Files** | `frontend/` - no `*.test.ts` files |
| **Current** | Vitest configured but no tests |
| **Expected** | Component and integration tests |
| **Reproduction** | `npm test` exits immediately |
| **Owner** | Frontend |
| **Fix** | Add tests for critical components |

### 9.2 High Priority Issues

#### HIGH-001: Frontend Not Containerized

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | Inconsistent dev environment, deployment gaps |
| **Files** | `docker-compose.yml` - missing frontend service |
| **Current** | Frontend runs outside Docker |
| **Expected** | Frontend in docker-compose |
| **Owner** | DevOps |
| **Fix** | Add frontend Dockerfile and compose service |

#### HIGH-002: Hardcoded Database Credentials

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | Security risk if compose file exposed |
| **Files** | `docker-compose.yml:7-9` |
| **Current** | `POSTGRES_PASSWORD: effluent` |
| **Expected** | Environment variables or secrets |
| **Owner** | DevOps |
| **Fix** | Use `.env` file or Docker secrets |

#### HIGH-003: No API Rate Limiting

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | Vulnerable to abuse, DoS |
| **Files** | `backend/config/settings/base.py` |
| **Current** | No throttling configured |
| **Expected** | DRF throttling classes |
| **Owner** | Backend |
| **Fix** | Add throttle configuration |

#### HIGH-004: Token Storage in localStorage

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | XSS can steal tokens |
| **Files** | `frontend/lib/auth.ts:15-25` |
| **Current** | `localStorage.setItem('token', token)` |
| **Expected** | HttpOnly cookies |
| **Owner** | Full Stack |
| **Fix** | Move to HttpOnly cookie-based auth |

### 9.3 Low Priority Issues

#### LOW-001: Backend Dockerfile Uses Dev Server

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | Suboptimal production performance |
| **Files** | `backend/docker/Dockerfile:16` |
| **Current** | `CMD ["python", "manage.py", "runserver", ...]` |
| **Expected** | Gunicorn for production |
| **Owner** | DevOps |
| **Fix** | Add separate prod Dockerfile or entrypoint |

#### LOW-002: Limited Backend Test Coverage

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | Regression risk |
| **Files** | Only 3 test files found |
| **Current** | Basic model tests only |
| **Expected** | View, serializer, service tests |
| **Owner** | Backend |
| **Fix** | Add comprehensive test suite |

#### LOW-003: No Database Index Optimization

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | Query performance at scale |
| **Files** | Various models |
| **Current** | Minimal indexes |
| **Expected** | Indexes on common query patterns |
| **Owner** | Backend |
| **Fix** | Add indexes for `household_id` + status columns |

#### LOW-004: No Backend Type Checking

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Impact** | Runtime type errors possible |
| **Files** | `backend/pyproject.toml` - no mypy |
| **Current** | No type checker configured |
| **Expected** | mypy or pyright |
| **Owner** | Backend |
| **Fix** | Add mypy configuration |

---

## 10. Quick Fix Patch List

### 10.1 Fix React Types (CRIT-001)

**File**: `frontend/package.json`

```diff
- "@types/react": "^18.2.0",
+ "@types/react": "npm:types-react@rc",
```

Or pin React to 18.x until types catch up:
```diff
- "react": "^19.0.0",
- "react-dom": "^19.0.0",
+ "react": "^18.3.1",
+ "react-dom": "^18.3.1",
```

### 10.2 Add CI Pipeline (CRIT-002)

**File**: `.github/workflows/ci.yml` (create)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_effluent
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - run: pip install -r backend/requirements/dev.txt
      - run: cd backend && pytest
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_effluent
      - run: cd backend && ruff check .

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build
      - run: cd frontend && npm test -- --run
```

### 10.3 Add Frontend to Docker Compose (HIGH-001)

**File**: `frontend/Dockerfile` (create)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**File**: `docker-compose.yml` (add service)

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - INTERNAL_API_URL=http://backend:8000
    depends_on:
      - backend
```

### 10.4 Add Rate Limiting (HIGH-003)

**File**: `backend/config/settings/base.py` (add to REST_FRAMEWORK)

```python
REST_FRAMEWORK = {
    # ... existing config ...
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}
```

### 10.5 Environment Variables for Credentials (HIGH-002)

**File**: `.env.example` (create)

```bash
# Database
POSTGRES_DB=effluent
POSTGRES_USER=effluent
POSTGRES_PASSWORD=CHANGE_ME_IN_PRODUCTION

# Django
SECRET_KEY=CHANGE_ME_IN_PRODUCTION
DEBUG=false
ALLOWED_HOSTS=yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**File**: `docker-compose.yml` (modify)

```yaml
services:
  db:
    image: postgres:16
    env_file:
      - .env
    # Remove hardcoded credentials
```

### 10.6 Add Basic Frontend Test (CRIT-003)

**File**: `frontend/lib/api.test.ts` (create)

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('API Client', () => {
  it('should add auth header when token exists', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });
    global.fetch = mockFetch;

    localStorage.setItem('token', 'test-token');

    // Import and call your API function
    // Verify Authorization header was set
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });
});
```

---

## Appendix A: File Reference Index

| Section | Key Files |
|---------|-----------|
| Build System | `frontend/package.json`, `backend/pyproject.toml`, `docker-compose.yml` |
| Backend Config | `backend/config/settings/base.py`, `backend/config/urls.py` |
| Backend Models | `backend/apps/*/models.py` |
| Backend Services | `backend/apps/scenarios/services.py`, `backend/apps/metrics/services.py`, `backend/apps/taxes/services.py` |
| Frontend Config | `frontend/next.config.ts`, `frontend/tsconfig.json` |
| Frontend Types | `frontend/lib/types.ts` |
| Frontend API | `frontend/lib/api.ts`, `frontend/lib/api/dashboard.server.ts` |
| Frontend Auth | `frontend/lib/auth.ts` |
| Deployment | `backend/docker/Dockerfile`, `deploy/docker-compose.traefik.yml` |

---

## Appendix B: API Endpoint Reference

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| POST | `/api/v1/auth/token/` | SimpleJWT | No |
| POST | `/api/v1/auth/token/refresh/` | SimpleJWT | No |
| GET/POST | `/api/v1/users/` | `core.views.UserViewSet` | Yes |
| GET/POST | `/api/v1/households/` | `core.views.HouseholdViewSet` | Yes |
| GET/POST/PUT/DELETE | `/api/v1/accounts/` | `accounts.views.AccountViewSet` | Yes |
| GET/POST/PUT/DELETE | `/api/v1/flows/` | `flows.views.RecurringFlowViewSet` | Yes |
| GET | `/api/v1/metrics/current/` | `metrics.views.current_metrics` | Yes |
| GET | `/api/v1/metrics/history/` | `metrics.views.metrics_history` | Yes |
| GET | `/api/v1/metrics/data-quality/` | `metrics.views.data_quality` | Yes |
| GET/POST | `/api/v1/scenarios/` | `scenarios.views.ScenarioViewSet` | Yes |
| GET | `/api/v1/scenarios/baseline/` | `scenarios.views.baseline` | Yes |
| GET/POST | `/api/v1/goals/` | `goals.views.GoalViewSet` | Yes |
| GET | `/api/v1/goals/status/` | `goals.views.goal_status` | Yes |
| GET | `/api/v1/insights/` | `metrics.views.InsightViewSet` | Yes |
| GET | `/api/v1/onboarding/` | `onboarding.views.OnboardingViewSet` | Yes |
| GET/POST | `/api/v1/decisions/` | `decisions.views.DecisionViewSet` | Yes |

---

*Document generated from repository analysis. All claims reference specific file paths and line numbers.*
