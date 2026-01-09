# Effluent Technical Documentation

> **Generated**: 2026-01-09 (Corrected)
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
│   ├── apps/                   # Django applications (12 apps)
│   │   ├── accounts/           # Financial accounts + snapshots (386 lines)
│   │   ├── actions/            # Next actions system
│   │   ├── core/               # User, Household, HouseholdMember (163 lines)
│   │   ├── decisions/          # Financial decision templates
│   │   ├── flows/              # Recurring income/expense flows
│   │   ├── goals/              # Financial goals tracking
│   │   ├── households/         # Household middleware (42 lines)
│   │   ├── metrics/            # Financial health metrics
│   │   ├── onboarding/         # User onboarding state
│   │   ├── scenarios/          # Financial projection engine (810 lines)
│   │   ├── stress_tests/       # Stress test scenarios
│   │   └── taxes/              # Tax calculation engine
│   ├── config/                 # Django settings
│   ├── docker/                 # Backend Dockerfile
│   └── requirements/           # Python dependencies
├── frontend/                   # Next.js 15 application
│   ├── app/                    # App Router pages
│   ├── components/             # React components
│   └── lib/                    # Utilities, types, API client
├── deploy/                     # Deployment configs (Traefik)
├── TASK-*.md                   # Implementation specs (NOT source of truth)
└── docker-compose.yml          # Development infrastructure
```

### 1.2 Frontend Dependencies

**Source**: `frontend/package.json:1-55`

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `^15.0.0` | React framework with App Router |
| `react` | `^19.0.0` | UI library |
| `react-dom` | `^19.0.0` | React DOM renderer |
| `@tanstack/react-query` | `^5.0.0` | Server state management |
| `zod` | `^3.25.76` | Schema validation |
| `decimal.js` | `^10.4.0` | Precise financial calculations |
| `@radix-ui/*` | Various | Accessible UI primitives |
| `@tremor/react` | `^3.0.0` | Dashboard components |
| `react-hook-form` | `^7.70.0` | Form handling |
| `date-fns` | `^3.0.0` | Date utilities |

**Dev Dependencies** (`frontend/package.json:44-54`):
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.3.0` | Type checking |
| `@types/react` | `^18.2.0` | React type definitions |
| `@types/react-dom` | `^18.2.0` | React DOM type definitions |
| `tailwindcss` | `^4.0.0` | CSS framework |
| `eslint` | `^8.0.0` | Linting |

**Scripts** (`frontend/package.json:5-12`):
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest",
  "test:coverage": "vitest --coverage"
}
```

### 1.3 Backend Dependencies

**Source**: `backend/pyproject.toml:1-34`

| Package | Version | Purpose |
|---------|---------|---------|
| `django` | `>=6.0` | Web framework |
| `djangorestframework` | `>=3.15` | REST API framework |
| `djangorestframework-simplejwt` | `>=5.3` | JWT authentication |
| `django-cors-headers` | `>=4.3` | CORS handling |
| `django-filter` | `>=24.0` | Queryset filtering |
| `psycopg[binary]` | `>=3.1` | PostgreSQL adapter |
| `python-dateutil` | `>=2.9` | Date utilities |
| `whitenoise` | `>=6.6` | Static file serving |

**Dev Dependencies** (`backend/pyproject.toml:16-21`):
| Package | Version | Purpose |
|---------|---------|---------|
| `ruff` | `>=0.4` | Linting + formatting |
| `pytest` | `>=8.0` | Test framework |
| `pytest-django` | `>=4.8` | Django test integration |

**Python Version**: `>=3.13` (`backend/pyproject.toml:4`)

### 1.4 Infrastructure Dependencies

**Source**: `docker-compose.yml:1-40`

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | `postgres:16` | 5432 | Primary database |
| `backend` | Custom (Dockerfile) | 8000 | Django API server |

**Database Configuration** (`docker-compose.yml:2-16`):
```yaml
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
```

### 1.5 What's Missing

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| Frontend not in docker-compose | Dev environment inconsistency | Add frontend service |
| No `.nvmrc` or `.node-version` | Node version drift | Add Node version lock |
| **vitest not in devDependencies** | `npm test` will fail | Add vitest to devDependencies |

### 1.6 Version Conflicts

| Issue | Files | Severity |
|-------|-------|----------|
| `@types/react: ^18.2.0` vs `react: ^19.0.0` | `frontend/package.json:36,47` | **HIGH** |
| `vitest` in scripts but not in dependencies | `frontend/package.json:10` | **CRITICAL** |

---

## 2. Backend Architecture (Django + DRF)

### 2.1 Django Applications

**Source**: `backend/config/settings/base.py:14-38`

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'apps.core',
    'apps.households',
    'apps.accounts',
    'apps.flows',
    'apps.taxes',
    'apps.metrics',
    'apps.onboarding',
    'apps.scenarios',
    'apps.decisions',
    'apps.goals',
    'apps.actions',        # Next actions system
    'apps.stress_tests',   # Stress testing
]
```

### 2.2 Application Responsibilities

| App | Models | Primary Purpose |
|-----|--------|-----------------|
| `core` | `User`, `Household`, `HouseholdMember`, `HouseholdMembership`, `UserSettings` | Multi-tenant user management |
| `households` | (middleware only) | Household context middleware |
| `accounts` | `Account`, `BalanceSnapshot`, `AssetGroup`, `LiabilityDetails`, `AssetDetails` | Financial accounts tracking with ~45 account types |
| `flows` | `RecurringFlow`, `FlowSnapshot` | Income/expense management |
| `taxes` | `IncomeSource`, `W2Withholding`, `PreTaxDeduction`, `PostTaxDeduction`, `SelfEmploymentTax` | Tax calculations |
| `metrics` | `MetricSnapshot`, `Insight`, `MetricThreshold` | Financial health metrics |
| `scenarios` | `Scenario`, `ScenarioChange`, `ScenarioProjection`, `LifeEventTemplate`, `RealityChangeEvent` | What-if projections |
| `onboarding` | `OnboardingState` | User onboarding progress |
| `goals` | `Goal`, `GoalSolution` | Financial goal tracking |
| `decisions` | `DecisionTemplate`, `DecisionRun` | Decision modeling |
| `actions` | Action templates/runs | Next actions engine |
| `stress_tests` | Stress test scenarios | Financial stress testing |

### 2.3 URL Routing

**Source**: `backend/config/urls.py:1-117`

```
/admin/                          # Django admin

/api/auth/                       # JWT token endpoints (NO v1 prefix)
├── token/                       # POST - obtain token pair
└── token/refresh/               # POST - refresh access token

/api/v1/                         # API v1 endpoints
├── households/                  # Household CRUD
├── members/                     # Household members
├── accounts/                    # Account management
├── flows/                       # Recurring flows
├── income-sources/              # Tax income sources
├── w2-withholding/              # W2 withholding profiles
├── pretax-deductions/           # Pre-tax deductions
├── posttax-deductions/          # Post-tax deductions
├── self-employment-tax/         # Self-employment tax
├── metric-snapshots/            # Metric snapshots
├── insights/                    # Financial insights
├── thresholds/                  # Metric thresholds
├── scenarios/                   # Scenario management
│   └── baseline/                # GET - baseline scenario
├── scenario-changes/            # Scenario changes
├── life-event-templates/        # Life event templates
├── goals/                       # Goal management
│   └── status/                  # GET - goal progress
├── goal-solutions/              # Goal solutions
├── profile/                     # User profile
│   └── change-password/         # Password change
├── metrics/
│   ├── current/                 # GET - current snapshot
│   ├── history/                 # GET - historical data
│   └── data-quality/            # GET - data quality report
├── onboarding/
│   ├── current/                 # GET - current step
│   ├── save/                    # POST - save draft
│   ├── complete/                # POST - complete step
│   ├── skip/                    # POST - skip step
│   └── back/                    # POST - go back
├── decisions/
│   ├── templates/               # Decision templates
│   ├── runs/                    # Decision runs
│   ├── run/                     # POST - run decision
│   └── draft/                   # POST - save draft
├── taxes/
│   └── summary/                 # GET - tax summary
├── actions/                     # TASK-14
│   ├── next/                    # GET - next actions
│   ├── apply/                   # POST - apply action
│   └── templates/               # GET - action templates
└── stress-tests/                # TASK-15
    ├── /                        # GET - list tests
    ├── run/                     # POST - run single test
    └── batch/                   # POST - run batch tests
```

### 2.4 Authentication & Authorization

**JWT Configuration** (`backend/config/settings/base.py:94-99`):

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'UPDATE_LAST_LOGIN': True,
}
```

**DRF Configuration** (`backend/config/settings/base.py:84-92`):

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'COERCE_DECIMAL_TO_STRING': True,
}
```

### 2.5 Household Multi-Tenancy

**Middleware** (`backend/apps/households/middleware.py:1-42`):

The `HouseholdMiddleware` extracts household context using lazy evaluation:

```python
def get_household(request):
    if hasattr(request, '_cached_household'):
        return request._cached_household

    household = None

    # 1. Check X-Household-ID header
    household_id = request.headers.get('X-Household-ID')
    if household_id:
        household = Household.objects.filter(id=household_id).first()

    # 2. Check session
    if not household and hasattr(request, 'session'):
        household_id = request.session.get('current_household_id')
        if household_id:
            household = Household.objects.filter(id=household_id).first()

    # 3. Fall back to user's default household
    if not household and request.user.is_authenticated:
        household = request.user.get_default_household()

    # 4. Verify membership access
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

**Key Features**:
- Uses `SimpleLazyObject` for lazy evaluation (only queries DB when accessed)
- Checks header → session → default household
- Verifies user has membership access to requested household
- Caches result in `request._cached_household`

---

## 3. Database & Persistence Layer

### 3.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────────┐
│      User       │───────│ HouseholdMembership │
│  (core.User)    │       │                     │
│  - UUID PK      │       └──────────┬──────────┘
│  - email        │                  │
│  - date_of_birth│                  │
└────────┬────────┘                  │
         │                           │
         │                           ▼
         │                ┌─────────────────────┐
         │                │     Household       │
         └───────────────►│  - UUID PK          │
                          │  - name, slug       │
                          │  - plan, stripe_id  │
                          │  - tax_settings     │
                          │  - onboarding_*     │
                          └──────────┬──────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ HouseholdMember │       │    Account      │       │    Scenario     │
│  - relationship │       │  - 45+ types    │       │  - is_baseline  │
│  - employment   │       │  - asset_group  │       │  - assumptions  │
└─────────────────┘       └────────┬────────┘       └────────┬────────┘
                                   │                         │
                          ┌────────┴────────┐       ┌────────┴────────┐
                          ▼                 ▼       ▼                 ▼
                   ┌────────────┐   ┌────────────┐ ┌────────────┐ ┌────────────┐
                   │  Balance   │   │ Liability  │ │  Scenario  │ │ Scenario   │
                   │  Snapshot  │   │  Details   │ │   Change   │ │ Projection │
                   └────────────┘   └────────────┘ └────────────┘ └────────────┘
```

### 3.2 Core Models

#### User Model (`backend/apps/core/models.py:6-39`)

```python
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
```

#### Household Model (`backend/apps/core/models.py:49-87`)

```python
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
```

#### HouseholdMember Model (`backend/apps/core/models.py:89-121`)

```python
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
```

### 3.3 Account Models (`backend/apps/accounts/models.py:1-386`)

#### AccountType Enum (45+ types)

```python
class AccountType(models.TextChoices):
    # Cash & Equivalents
    CHECKING = 'checking', 'Checking Account'
    SAVINGS = 'savings', 'Savings Account'
    MONEY_MARKET = 'money_market', 'Money Market Account'
    CD = 'cd', 'Certificate of Deposit'
    CASH = 'cash', 'Cash on Hand'
    PAYROLL_CLEARING = 'payroll_clearing', 'Payroll Clearing'  # System account

    # Investment Accounts
    BROKERAGE = 'brokerage', 'Brokerage Account'
    CRYPTO = 'crypto', 'Cryptocurrency'

    # Retirement Accounts
    TRADITIONAL_401K = 'traditional_401k', '401(k) - Traditional'
    ROTH_401K = 'roth_401k', '401(k) - Roth'
    TRADITIONAL_IRA = 'traditional_ira', 'IRA - Traditional'
    ROTH_IRA = 'roth_ira', 'IRA - Roth'
    SEP_IRA = 'sep_ira', 'SEP IRA'
    HSA = 'hsa', 'Health Savings Account'
    # ... and 30+ more types for properties, vehicles, debts, etc.
```

#### Account Model (`backend/apps/accounts/models.py:195-245`)

```python
class Account(HouseholdOwnedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=30, choices=AccountType.choices)
    institution = models.CharField(max_length=200, blank=True)
    account_number_last4 = models.CharField(max_length=4, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    asset_group = models.ForeignKey(AssetGroup, on_delete=models.SET_NULL, null=True, blank=True)
    owner = models.ForeignKey('core.HouseholdMember', on_delete=models.SET_NULL, null=True, blank=True)
    employer_name = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'accounts'
        ordering = ['display_order', 'name']
```

#### BalanceSnapshot Model (`backend/apps/accounts/models.py:247-281`)

```python
class BalanceSnapshot(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='snapshots')
    as_of_date = models.DateField()  # NOT "snapshot_date"
    recorded_at = models.DateTimeField(auto_now_add=True)

    balance = models.DecimalField(max_digits=14, decimal_places=2)
    cost_basis = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    market_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'balance_snapshots'
        ordering = ['-as_of_date', '-recorded_at']
        indexes = [models.Index(fields=['account', '-as_of_date'], name='balance_snapshot_account_as_of_date')]
```

### 3.4 Scenario Models (`backend/apps/scenarios/models.py:1-810`)

#### Scenario Model (`backend/apps/scenarios/models.py:14-67`)

```python
class Scenario(HouseholdOwnedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    is_baseline = models.BooleanField(default=False)
    parent_scenario = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)

    # Baseline-specific fields
    baseline_mode = models.CharField(max_length=20, choices=BaselineMode.choices, default=BaselineMode.LIVE)
    baseline_pinned_at = models.DateTimeField(null=True, blank=True)
    baseline_pinned_as_of_date = models.DateField(null=True, blank=True)
    baseline_metric_snapshot = models.ForeignKey('metrics.MetricSnapshot', on_delete=models.SET_NULL, null=True, blank=True)
    last_projected_at = models.DateTimeField(null=True, blank=True)

    # Projection settings
    projection_months = models.PositiveIntegerField(default=60)  # 5 years
    start_date = models.DateField()

    # Assumptions
    inflation_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.03'))
    investment_return_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.07'))
    salary_growth_rate = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.03'))

    class Meta:
        db_table = 'scenarios'
        constraints = [
            models.UniqueConstraint(
                fields=['household'],
                condition=Q(is_baseline=True),
                name='unique_baseline_per_household'
            )
        ]
```

#### ChangeType Enum (~30 types) (`backend/apps/scenarios/models.py:69-119`)

```python
class ChangeType(models.TextChoices):
    # Income changes
    ADD_INCOME = 'add_income', 'Add Income Source'
    MODIFY_INCOME = 'modify_income', 'Modify Income'
    REMOVE_INCOME = 'remove_income', 'Remove Income'

    # Expense changes
    ADD_EXPENSE = 'add_expense', 'Add Expense'
    MODIFY_EXPENSE = 'modify_expense', 'Modify Expense'
    REMOVE_EXPENSE = 'remove_expense', 'Remove Expense'

    # Asset/Liability changes
    ADD_ASSET = 'add_asset', 'Add Asset'
    SELL_ASSET = 'sell_asset', 'Sell Asset'
    ADD_DEBT = 'add_debt', 'Add Debt'
    PAYOFF_DEBT = 'payoff_debt', 'Pay Off Debt'
    REFINANCE = 'refinance', 'Refinance'

    # One-time events
    LUMP_SUM_INCOME = 'lump_sum_income', 'One-time Income'
    LUMP_SUM_EXPENSE = 'lump_sum_expense', 'One-time Expense'

    # Tax strategy changes (TASK-14)
    MODIFY_WITHHOLDING = 'modify_withholding', 'Modify Tax Withholding'
    SET_QUARTERLY_ESTIMATES = 'set_quarterly_estimates', 'Set Quarterly Tax Estimates'

    # Stress test changes (TASK-15)
    ADJUST_INTEREST_RATES = 'adjust_interest_rates', 'Adjust Interest Rates'
    OVERRIDE_INFLATION = 'override_inflation', 'Override Inflation Rate'
    # ... more types
```

#### ScenarioProjection Model (`backend/apps/scenarios/models.py:158-195`)

```python
class ScenarioProjection(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='projections')

    projection_date = models.DateField()  # NOT "month"
    month_number = models.PositiveIntegerField()

    # Balances
    total_assets = models.DecimalField(max_digits=14, decimal_places=2)
    total_liabilities = models.DecimalField(max_digits=14, decimal_places=2)
    net_worth = models.DecimalField(max_digits=14, decimal_places=2)
    liquid_assets = models.DecimalField(max_digits=14, decimal_places=2)
    retirement_assets = models.DecimalField(max_digits=14, decimal_places=2)

    # Cash flow
    total_income = models.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2)
    net_cash_flow = models.DecimalField(max_digits=12, decimal_places=2)

    # Metrics
    dscr = models.DecimalField(max_digits=6, decimal_places=3)
    savings_rate = models.DecimalField(max_digits=5, decimal_places=4)
    liquidity_months = models.DecimalField(max_digits=5, decimal_places=2)

    # Breakdown by category (JSON)
    income_breakdown = models.JSONField(default=dict)
    expense_breakdown = models.JSONField(default=dict)
    asset_breakdown = models.JSONField(default=dict)
    liability_breakdown = models.JSONField(default=dict)

    class Meta:
        db_table = 'scenario_projections'
        unique_together = ['scenario', 'month_number']
        ordering = ['month_number']
```

---

## 4. Frontend Architecture (Next.js)

### 4.1 Frontend Dependencies Status

**Source**: `frontend/package.json:1-55`

| Dependency | Status | Notes |
|------------|--------|-------|
| `react: ^19.0.0` | Installed | Latest React |
| `@types/react: ^18.2.0` | **MISMATCH** | Should be ^19.x |
| `vitest` | **MISSING** | Script exists, dep doesn't |
| `@tanstack/react-query: ^5.0.0` | Installed | Server state |
| `zod: ^3.25.76` | Installed | Validation |

---

## 9. Stack Consistency Report

### 9.1 Critical Issues

#### CRIT-001: vitest Missing from Dependencies

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Impact** | `npm test` will fail - vitest not installed |
| **Files** | `frontend/package.json:10` vs `frontend/package.json:44-54` |
| **Current** | `"test": "vitest"` but vitest not in devDependencies |
| **Expected** | vitest in devDependencies |
| **Reproduction** | `cd frontend && npm install && npm test` |
| **Owner** | Frontend |
| **Fix** | `npm install -D vitest @vitest/coverage-v8` |

#### CRIT-002: React Types Version Mismatch

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | TypeScript errors, incorrect type hints |
| **Files** | `frontend/package.json:36,47` |
| **Current** | `react: ^19.0.0`, `@types/react: ^18.2.0` |
| **Expected** | Matching major versions |
| **Reproduction** | `npm install && npx tsc --noEmit` may show type errors |
| **Owner** | Frontend |
| **Fix** | Update `@types/react` to `^19.0.0` when available, or pin React to `^18.x` |

#### CRIT-003: No CI/CD Pipeline

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Impact** | No automated testing, manual deployments |
| **Files** | Missing `.github/workflows/` |
| **Current** | No CI configuration |
| **Expected** | GitHub Actions or similar |
| **Owner** | DevOps |
| **Fix** | Create CI workflow (see Quick Fix section) |

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

#### HIGH-002: No API Rate Limiting

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Impact** | Vulnerable to abuse, DoS |
| **Files** | `backend/config/settings/base.py` |
| **Current** | No throttling configured |
| **Expected** | DRF throttling classes |
| **Owner** | Backend |
| **Fix** | Add throttle configuration |

---

## 10. Quick Fix Patch List

### 10.1 Fix vitest Missing (CRIT-001)

**Command**:
```bash
cd frontend && npm install -D vitest @vitest/coverage-v8
```

### 10.2 Fix React Types (CRIT-002)

**Option A** - Pin React to 18.x:
```bash
cd frontend && npm install react@^18.3.1 react-dom@^18.3.1
```

**Option B** - Use React 19 types (when available):
```bash
cd frontend && npm install -D @types/react@^19.0.0 @types/react-dom@^19.0.0
```

### 10.3 Add CI Pipeline (CRIT-003)

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
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - run: pip install -e backend[dev]
      - run: cd backend && pytest
        env:
          DB_HOST: localhost
          DB_NAME: test_effluent
          DB_USER: test
          DB_PASSWORD: test
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
```

### 10.4 Add Rate Limiting (HIGH-002)

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

---

## Appendix A: File Reference Index

| Section | Key Files |
|---------|-----------|
| Build System | `frontend/package.json`, `backend/pyproject.toml`, `docker-compose.yml` |
| Backend Config | `backend/config/settings/base.py:1-123`, `backend/config/urls.py:1-117` |
| Core Models | `backend/apps/core/models.py:1-163` |
| Account Models | `backend/apps/accounts/models.py:1-386` |
| Scenario Models | `backend/apps/scenarios/models.py:1-810` |
| Household Middleware | `backend/apps/households/middleware.py:1-42` |

---

*Document generated from repository analysis. All claims verified against actual file paths and line numbers.*
