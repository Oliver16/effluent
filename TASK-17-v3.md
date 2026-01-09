# TASK-17 — Cockpit Dashboard Refactor + Wiring PR (Implementation Slice)

> **Revision Notice (v3.0 — Jan 2026):** This document was revised to address additional spec issues:
> - v2.0: Added complete component implementations, types, error handling
> - v3.0: Fixed server-side data fetching (uses `fetch()` + `cookies()`, not axios)
> - v3.0: Fixed response normalization for metrics endpoint
> - v3.0: Fixed `statusLabel` usage (was using `label` incorrectly)
> - v3.0: Standardized all types to snake_case (matches DRF)
> - v3.0: Fixed sticky sidebar to use `top-20` (accounts for header)
> - v3.0: Added safe number parsing for balances
> - v3.0: Added chart tooltip dark mode styles
> - v3.0: Added environment variable documentation
> - v3.0: Clarified component reuse from TASK-16
> - v3.0: Added "Known Integration Contracts" section

---

> **Purpose:** Deliver the cockpit UI experience by **wiring the primitives introduced in TASK-16** into the app, starting with the Dashboard and the highest-traffic flows.  
> This task is intentionally **narrow**: it avoids broad styling bikeshedding by forcing a single "golden path" implementation that proves the system.

> **Deliverable:** A working PR that refactors the Dashboard to the cockpit layout with:
> - consistent primitives
> - premium skeleton loading
> - status badges
> - proper number formatting
> - global "New" dropdown
> - Command Palette (⌘K)

---

## 0) Dependencies / Preconditions

### Must be completed first (or as part of this PR)

**From TASK-16:**
- `PageShell`, `PageHeader`, `SectionCard`
- `StatusBadge`, `StatCard`, `MetricValue`
- `Skeletons.tsx` (`DashboardSkeleton`, `SidebarCardSkeleton`)
- `EmptyState`
- `NewMenu`, `CommandPalette`
- `lib/format.ts`
- `lib/status.ts`
- shadcn `Skeleton`, `DropdownMenu`, `Dialog`, `Command` components installed

### Fallback if TASK-16 Not Complete

If TASK-16 components don't exist yet, this PR must create them. Include these files from TASK-16 specification:

**Required files (copy from TASK-16 if not merged):**
```
components/layout/PageShell.tsx
components/layout/PageHeader.tsx
components/layout/SectionCard.tsx
components/ui/StatusBadge.tsx
components/ui/StatCard.tsx
components/ui/MetricValue.tsx
components/ui/EmptyState.tsx
components/ui/Skeletons.tsx
components/nav/NewMenu.tsx
components/nav/CommandPalette.tsx
lib/format.ts
lib/status.ts
```

**PR Structure if including TASK-16:**
- Commit 1: TASK-16 primitives
- Commit 2: Dashboard components (NorthStarCards, etc.)
- Commit 3: Dashboard page wiring

### Environment Variables Required

Add to `.env.local` and document in `.env.example`:

```bash
# API URL for server-side fetching (no trailing slash)
NEXT_PUBLIC_API_URL=http://localhost:8000
API_URL=http://localhost:8000
```

---

## 1) Known Integration Contracts

> **IMPORTANT:** These contracts ensure consistency with TASK-16. Do not deviate.

### 1.1 Dashboard is a Server Component
- `app/(app)/dashboard/page.tsx` is an async Server Component
- Data fetching uses `fetch()` with `cookies()` from `next/headers`
- Client-side React Query is NOT used on this page
- `loading.tsx` provides loading state via Next.js Suspense

### 1.2 Status Functions Return `statusLabel`
```ts
// computeStatus() returns:
{ status: Status; statusLabel: string }

// Usage in components:
const { status, statusLabel } = computeStatus('liquidity_months', value);
<StatusBadge status={status} statusLabel={statusLabel} />
```

### 1.3 All Types Use snake_case
- API responses use snake_case (DRF convention)
- Frontend types mirror API exactly
- No camelCase transformation layer

### 1.4 Response Normalization Required
The `/api/v1/metrics/current/` endpoint may return either:
- `{ metrics: {...}, date: "..." }` (wrapped)
- `{ net_worth: ..., ... }` (flat)

Always normalize in the fetch function.

---

## 2) What This PR Changes (explicit)

### Creates (new files)
- `components/dashboard/NorthStarCards.tsx`
- `components/dashboard/ModelConfidenceCard.tsx`
- `components/dashboard/ActionPanel.tsx`
- `components/dashboard/InsightsPanel.tsx`
- `components/dashboard/NetWorthChart.tsx`
- `components/dashboard/AccountList.tsx`
- `app/(app)/dashboard/error.tsx`
- `app/(app)/dashboard/loading.tsx`
- `lib/api/dashboard.server.ts`

### Refactors (existing files)
- `app/(app)/dashboard/page.tsx`:
  - replaces ad-hoc layout with cockpit layout primitives
  - eliminates raw loading text
  - replaces metric card row with `NorthStarCards`

### Modifies
- `app/(app)/layout.tsx` - Add global NewMenu and CommandPalette

### Does NOT change
- backend endpoints
- metrics logic
- scenario computation logic

---

## 3) Required Type Definitions

Ensure these types exist in `lib/types.ts`:

> **NOTE:** All field names use snake_case to match DRF API responses.

```ts
// ============================================
// Metrics Types
// ============================================

export interface MetricsSummary {
  net_worth: number;
  monthly_surplus: number;
  liquidity_months: number;
  dscr: number;
  savings_rate: number;
  total_debt?: number;
  previous_net_worth?: number;
}

/** Response from /api/v1/metrics/current/ */
export interface MetricsCurrentResponse {
  // May be wrapped or flat — normalize in fetch function
  metrics?: MetricsSummary;
  date?: string;
  // Or flat:
  net_worth?: number;
  monthly_surplus?: number;
  liquidity_months?: number;
  dscr?: number;
  savings_rate?: number;
  total_debt?: number;
}

export interface MetricSnapshot {
  id: string;
  household_id: string;
  date: string;
  metrics: MetricsSummary;
  created_at: string;
}

// ============================================
// Goals Types (from TASK-13)
// ============================================

export interface Goal {
  id: string;
  household_id: string;
  goal_type: GoalType;
  target_value: string;
  target_date?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalType = 
  | 'emergency_fund_months'
  | 'min_dscr'
  | 'min_savings_rate'
  | 'net_worth_target_by_date'
  | 'retirement_age';

/** Response item from /api/v1/goals/status/ */
export interface GoalStatus {
  goal_id: string;
  goal_type: GoalType;
  target_value: string;
  current_value: string;
  status: 'good' | 'warning' | 'critical';
  delta_to_target: string;
  recommendation?: string;
}

// ============================================
// Data Quality Types (from TASK-13)
// ============================================

export interface DataQualityReport {
  overall_score: number;
  issues: DataQualityIssue[];
  checks: {
    accounts_with_balances: boolean;
    income_sources_defined: boolean;
    expenses_categorized: boolean;
    debts_with_rates: boolean;
  };
}

export interface DataQualityIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  fix_url?: string;
}

// ============================================
// Insights Types
// ============================================

export interface Insight {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category?: string;
  metric_key?: string;
  created_at: string;
}

// ============================================
// Account Types
// ============================================

export interface Account {
  id: string;
  household_id: string;
  name: string;
  account_type: AccountType;
  balance: string;  // String from API, parse with safeParseNumber()
  institution?: string;
  is_active: boolean;
  updated_at: string;
}

export type AccountType = 
  | 'checking'
  | 'savings'
  | 'investment'
  | 'retirement'
  | 'credit_card'
  | 'loan'
  | 'mortgage'
  | 'other';

// ============================================
// Dashboard Aggregate Type
// ============================================

export interface DashboardData {
  metrics: MetricsSummary;
  goal_status: GoalStatus[];  // snake_case
  data_quality: DataQualityReport;  // snake_case
  insights: Insight[];
  accounts: Account[];
  net_worth_series: NetWorthDataPoint[];  // snake_case
  as_of_date: string;  // snake_case
}

export interface NetWorthDataPoint {
  date: string;
  value: number;
}

// ============================================
// API Response Wrappers
// ============================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

---

## 4) Required Layout + UX Outcome

### Dashboard must look like:

**Header**
- Title: "Dashboard"
- Subtitle: status sentence + "as of {date}"
- Actions:
  - Primary: "Model a decision"
  - Secondary: "Edit goals"
  - New dropdown (in global header)

**Main content**
1) North Star Cards: 6 cards (grid responsive)
2) Net Worth chart section
3) Accounts section

**Sticky Sidebar** (uses `top-20` to account for header)
1) Model Confidence (card)
2) Action Panel (placeholder until TASK-14)
3) Insights (existing)

---

## 5) Implementation Steps (do in this order)

### Step 1 — Add Global Navigation Integration

**File: `app/(app)/layout.tsx`**

```tsx
import Link from 'next/link';
import { NewMenu } from '@/components/nav/NewMenu';
import { CommandPalette } from '@/components/nav/CommandPalette';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-semibold">
              Effluent
            </Link>
            {/* Navigation links if needed */}
          </div>
          <div className="flex items-center gap-2">
            <CommandPalette />
            <NewMenu />
            {/* User menu if exists */}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

---

### Step 2 — Create Dashboard Loading State

**File: `app/(app)/dashboard/loading.tsx`**

```tsx
import { PageShell } from '@/components/layout/PageShell';
import { DashboardSkeleton, SidebarCardSkeleton } from '@/components/ui/Skeletons';

export default function DashboardLoading() {
  return (
    <PageShell
      variant="dashboard"
      sidebar={
        <div className="space-y-6">
          <SidebarCardSkeleton />
          <SidebarCardSkeleton />
          <SidebarCardSkeleton />
        </div>
      }
    >
      <DashboardSkeleton />
    </PageShell>
  );
}
```

---

### Step 3 — Create Dashboard Error Boundary

**File: `app/(app)/dashboard/error.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { SectionCard } from '@/components/layout/SectionCard';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service (e.g., Sentry)
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <PageShell>
      <SectionCard>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            We couldn't load your dashboard. This might be a temporary issue.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <p className="mt-2 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded max-w-md truncate">
              {error.message}
            </p>
          )}
          <Button onClick={reset} className="mt-6 gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </SectionCard>
    </PageShell>
  );
}
```

---

### Step 4 — Create Server-Side Data Fetching

**File: `lib/api/dashboard.server.ts`**

> **IMPORTANT:** This is a SERVER-ONLY file. Uses `cookies()` from `next/headers`.

```ts
import { cookies } from 'next/headers';
import type { 
  DashboardData, 
  MetricsSummary, 
  MetricsCurrentResponse,
  GoalStatus, 
  DataQualityReport, 
  Insight, 
  Account,
  NetWorthDataPoint,
  PaginatedResponse,
} from '@/lib/types';

const API_URL = process.env.API_URL || 'http://localhost:8000';

/**
 * Server-side fetch with auth cookies
 */
async function serverFetch<T>(path: string): Promise<T> {
  const cookieStore = cookies();
  
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStore.toString(),
    },
    cache: 'no-store', // Always fresh data for dashboard
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Normalize metrics response (handles both wrapped and flat formats)
 */
function normalizeMetrics(data: MetricsCurrentResponse): { metrics: MetricsSummary; date: string } {
  // Check if wrapped format
  if (data.metrics) {
    return {
      metrics: data.metrics,
      date: data.date || new Date().toISOString(),
    };
  }
  
  // Flat format — construct MetricsSummary
  return {
    metrics: {
      net_worth: data.net_worth ?? 0,
      monthly_surplus: data.monthly_surplus ?? 0,
      liquidity_months: data.liquidity_months ?? 0,
      dscr: data.dscr ?? 0,
      savings_rate: data.savings_rate ?? 0,
      total_debt: data.total_debt,
    },
    date: new Date().toISOString(),
  };
}

/**
 * Fetch all dashboard data (server-side only)
 */
export async function getDashboardData(): Promise<DashboardData> {
  // Fetch all data in parallel
  const [
    metricsRaw,
    goalStatusData,
    dataQualityData,
    insightsData,
    accountsData,
    historyData,
  ] = await Promise.all([
    serverFetch<MetricsCurrentResponse>('/api/v1/metrics/current/'),
    serverFetch<GoalStatus[]>('/api/v1/goals/status/'),
    serverFetch<DataQualityReport>('/api/v1/metrics/data-quality/'),
    serverFetch<PaginatedResponse<Insight>>('/api/v1/insights/'),
    serverFetch<PaginatedResponse<Account>>('/api/v1/accounts/'),
    serverFetch<PaginatedResponse<NetWorthDataPoint>>('/api/v1/metrics/snapshots/?metric=net_worth&period=12m'),
  ]);

  // Normalize metrics response
  const { metrics, date } = normalizeMetrics(metricsRaw);

  return {
    metrics,
    goal_status: goalStatusData,
    data_quality: dataQualityData,
    insights: insightsData.results ?? [],
    accounts: accountsData.results ?? [],
    net_worth_series: historyData.results ?? [],
    as_of_date: date,
  };
}
```

---

### Step 5 — Create NorthStarCards Component

**File: `components/dashboard/NorthStarCards.tsx`**

> **NOTE:** Reuses `StatCard` from TASK-16. Uses `statusLabel` (not `label`).

```tsx
'use client';

import { StatCard } from '@/components/ui/StatCard';
import { 
  computeStatus, 
  computeNetWorthStatus, 
  getGoalTarget, 
  computeDeltaLabel 
} from '@/lib/status';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  formatRatio 
} from '@/lib/format';
import type { MetricsSummary, GoalStatus } from '@/lib/types';

interface NorthStarCardsProps {
  metrics: MetricsSummary;
  goal_status?: GoalStatus[];  // snake_case from API
}

export function NorthStarCards({ metrics, goal_status }: NorthStarCardsProps) {
  // Get goal targets with defaults
  const liquidityTarget = getGoalTarget(goal_status, 'emergency_fund_months', 6);
  const dscrTarget = getGoalTarget(goal_status, 'min_dscr', 1.25);
  const savingsTarget = getGoalTarget(goal_status, 'min_savings_rate', 0.20);
  const netWorthTarget = getGoalTarget(goal_status, 'net_worth_target_by_date');

  // Compute statuses — returns { status, statusLabel }
  const netWorthStatus = computeNetWorthStatus(
    metrics.net_worth, 
    netWorthTarget, 
    metrics.previous_net_worth
  );
  const surplusStatus = computeStatus('monthly_surplus', metrics.monthly_surplus);
  const liquidityStatus = computeStatus('liquidity_months', metrics.liquidity_months, liquidityTarget);
  const dscrStatus = computeStatus('dscr', metrics.dscr, dscrTarget);
  const savingsStatus = computeStatus('savings_rate', metrics.savings_rate, savingsTarget);

  const cards = [
    {
      title: 'Net Worth',
      value: formatCurrency(metrics.net_worth),
      status: netWorthStatus.status,
      statusLabel: netWorthStatus.statusLabel,
      targetLabel: netWorthTarget 
        ? `Target: ${formatCurrency(netWorthTarget)}` 
        : undefined,
    },
    {
      title: 'Monthly Surplus',
      value: formatCurrency(metrics.monthly_surplus),
      status: surplusStatus.status,
      statusLabel: surplusStatus.statusLabel,
      targetLabel: metrics.monthly_surplus >= 0 
        ? 'Positive cash flow' 
        : 'Negative cash flow',
    },
    {
      title: 'Liquidity',
      value: formatNumber(metrics.liquidity_months, 1),
      suffix: 'months',
      status: liquidityStatus.status,
      statusLabel: liquidityStatus.statusLabel,
      targetLabel: `Target: ${liquidityTarget} months`,
      deltaLabel: liquidityTarget 
        ? computeDeltaLabel(metrics.liquidity_months, liquidityTarget, 'mo') 
        : undefined,
    },
    {
      title: 'DSCR',
      value: formatRatio(metrics.dscr),
      status: dscrStatus.status,
      statusLabel: dscrStatus.statusLabel,
      targetLabel: `Target: ≥${dscrTarget}`,
    },
    {
      title: 'Savings Rate',
      value: formatPercent(metrics.savings_rate),
      status: savingsStatus.status,
      statusLabel: savingsStatus.statusLabel,
      targetLabel: savingsTarget 
        ? `Target: ${formatPercent(savingsTarget)}` 
        : undefined,
    },
    {
      title: 'Total Debt',
      value: formatCurrency(Math.abs(metrics.total_debt || 0)),
      status: (metrics.total_debt || 0) > 0 ? 'neutral' as const : 'good' as const,
      statusLabel: (metrics.total_debt || 0) > 0 ? 'Active' : 'Debt-free',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          suffix={'suffix' in card ? card.suffix : undefined}
          status={card.status}
          statusLabel={card.statusLabel}
          targetLabel={card.targetLabel}
          deltaLabel={'deltaLabel' in card ? card.deltaLabel : undefined}
        />
      ))}
    </div>
  );
}
```

---

### Step 6 — Create Sidebar Components

**File: `components/dashboard/ModelConfidenceCard.tsx`**

```tsx
import { SectionCard } from '@/components/layout/SectionCard';
import { StatusBadge, Status } from '@/components/ui/StatusBadge';
import { SidebarCardSkeleton } from '@/components/ui/Skeletons';
import { formatPercent } from '@/lib/format';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import type { DataQualityReport } from '@/lib/types';

interface ModelConfidenceCardProps {
  report?: DataQualityReport;
  isLoading?: boolean;
}

export function ModelConfidenceCard({ report, isLoading }: ModelConfidenceCardProps) {
  if (isLoading || !report) {
    return <SidebarCardSkeleton />;
  }

  const status: Status = 
    report.overall_score >= 80 ? 'good' : 
    report.overall_score >= 60 ? 'warning' : 
    'critical';

  const statusLabel = 
    status === 'good' ? 'High' : 
    status === 'warning' ? 'Medium' : 
    'Low';

  const criticalIssues = report.issues.filter(i => i.severity === 'error');
  const warningIssues = report.issues.filter(i => i.severity === 'warning');

  return (
    <SectionCard dense title="Model Confidence">
      <div className="space-y-3">
        {/* Score display */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatPercent(report.overall_score / 100)}
          </span>
          <StatusBadge status={status} statusLabel={statusLabel} />
        </div>
        
        {/* Quick status checks */}
        <div className="space-y-1.5">
          {Object.entries(report.checks).slice(0, 3).map(([key, passed]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              {passed ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              )}
              <span className="text-muted-foreground">
                {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
        
        {/* Issues summary */}
        {(criticalIssues.length > 0 || warningIssues.length > 0) && (
          <Link 
            href="/settings/data-quality" 
            className="block text-xs text-primary hover:underline"
          >
            {criticalIssues.length > 0 && (
              <span className="text-destructive">{criticalIssues.length} critical</span>
            )}
            {criticalIssues.length > 0 && warningIssues.length > 0 && ', '}
            {warningIssues.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400">{warningIssues.length} warnings</span>
            )}
            {' → Fix now'}
          </Link>
        )}
      </div>
    </SectionCard>
  );
}
```

**File: `components/dashboard/ActionPanel.tsx`**

```tsx
import { SectionCard } from '@/components/layout/SectionCard';
import { Button } from '@/components/ui/button';
import { StatusBadge, Status } from '@/components/ui/StatusBadge';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Placeholder type until TASK-14
interface ActionCandidate {
  key: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  why: string;
}

interface ActionPanelProps {
  actions?: ActionCandidate[];
  placeholder?: boolean;
  isLoading?: boolean;
}

export function ActionPanel({ 
  actions, 
  placeholder = false, 
  isLoading 
}: ActionPanelProps) {
  // Show placeholder until TASK-14 is complete
  if (placeholder || (!actions && !isLoading)) {
    return (
      <SectionCard dense title="Next Actions">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <p className="text-sm font-medium">Coming soon</p>
          <p className="text-xs text-muted-foreground mt-1">
            AI-powered actions based on your goals
          </p>
        </div>
      </SectionCard>
    );
  }

  if (isLoading) {
    return (
      <SectionCard dense title="Next Actions">
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </SectionCard>
    );
  }

  const severityToStatus: Record<string, Status> = {
    critical: 'critical',
    warning: 'warning',
    info: 'neutral',
  };

  return (
    <SectionCard dense title="Next Actions">
      <div className="space-y-3">
        {actions?.slice(0, 3).map((action) => (
          <div 
            key={action.key}
            className="rounded-lg border border-border/50 p-3 space-y-2 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{action.title}</span>
              <StatusBadge 
                status={severityToStatus[action.severity]} 
                statusLabel={action.severity} 
              />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {action.why}
            </p>
            <Button size="sm" variant="outline" className="w-full gap-1.5" asChild>
              <Link href={`/actions/apply/${action.key}`}>
                Model this
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
```

**File: `components/dashboard/InsightsPanel.tsx`**

```tsx
import { SectionCard } from '@/components/layout/SectionCard';
import { StatusBadge, Status } from '@/components/ui/StatusBadge';
import { SidebarCardSkeleton } from '@/components/ui/Skeletons';
import { Lightbulb } from 'lucide-react';
import Link from 'next/link';
import type { Insight } from '@/lib/types';

interface InsightsPanelProps {
  insights?: Insight[];
  isLoading?: boolean;
  maxItems?: number;
}

export function InsightsPanel({ 
  insights, 
  isLoading, 
  maxItems = 5 
}: InsightsPanelProps) {
  if (isLoading) {
    return <SidebarCardSkeleton />;
  }

  if (!insights || insights.length === 0) {
    return (
      <SectionCard dense title="Insights">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="rounded-full bg-muted p-2 mb-2">
            <Lightbulb className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">
            No insights right now
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check back after adding more data
          </p>
        </div>
      </SectionCard>
    );
  }

  const severityToStatus: Record<string, Status> = {
    critical: 'critical',
    warning: 'warning',
    info: 'neutral',
  };

  return (
    <SectionCard 
      dense 
      title="Insights"
      right={
        insights.length > maxItems ? (
          <Link 
            href="/insights" 
            className="text-xs text-primary hover:underline"
          >
            View all ({insights.length})
          </Link>
        ) : undefined
      }
    >
      <ul className="space-y-2.5">
        {insights.slice(0, maxItems).map((insight) => (
          <li key={insight.id} className="flex items-start gap-2">
            <StatusBadge 
              status={severityToStatus[insight.severity]} 
              statusLabel={insight.severity}
              className="mt-0.5 flex-shrink-0"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              {insight.message}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
```

---

### Step 7 — Create Chart Component

**File: `components/dashboard/NetWorthChart.tsx`**

```tsx
'use client';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/format';
import type { NetWorthDataPoint } from '@/lib/types';

interface NetWorthChartProps {
  data: NetWorthDataPoint[];
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis 
          dataKey="date" 
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(value) => formatDate(value, 'short')}
          interval="preserveStartEnd"
        />
        <YAxis 
          tickFormatter={(v) => formatCurrency(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          width={80}
        />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
          labelFormatter={(label) => formatDate(label, 'medium')}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{
            color: 'hsl(var(--foreground))',
            fontWeight: 500,
          }}
          itemStyle={{
            color: 'hsl(var(--muted-foreground))',
          }}
          cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
        />
        <defs>
          <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="url(#netWorthGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

### Step 8 — Create AccountList Component

**File: `components/dashboard/AccountList.tsx`**

```tsx
import { formatCurrency, parseBalance } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, Building2, CreditCard, PiggyBank, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { Account, AccountType } from '@/lib/types';

interface AccountListProps {
  accounts: Account[];
}

const accountTypeIcons: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  checking: Building2,
  savings: PiggyBank,
  investment: TrendingUp,
  retirement: TrendingUp,
  credit_card: CreditCard,
  loan: CreditCard,
  mortgage: Building2,
  other: Wallet,
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  investment: 'Investment',
  retirement: 'Retirement',
  credit_card: 'Credit Card',
  loan: 'Loan',
  mortgage: 'Mortgage',
  other: 'Other',
};

export function AccountList({ accounts }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No accounts yet"
        description="Add your first account to start tracking your finances."
        action={
          <Button asChild>
            <Link href="/accounts/new">
              <Plus className="h-4 w-4 mr-2" />
              Add account
            </Link>
          </Button>
        }
      />
    );
  }

  // Group accounts by type
  const grouped = accounts.reduce((acc, account) => {
    const type = account.account_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<AccountType, Account[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, typeAccounts]) => {
        const Icon = accountTypeIcons[type as AccountType] || Wallet;
        // Use safe parsing for balance strings
        const total = typeAccounts.reduce(
          (sum, acc) => sum + parseBalance(acc.balance), 
          0
        );

        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden />
                <span>{accountTypeLabels[type as AccountType]}</span>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>
            <ul className="space-y-1">
              {typeAccounts.map((account) => (
                <li key={account.id}>
                  <Link
                    href={`/accounts/${account.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{account.name}</p>
                      {account.institution && (
                        <p className="text-xs text-muted-foreground truncate">
                          {account.institution}
                        </p>
                      )}
                    </div>
                    <span className="text-sm tabular-nums font-medium ml-4">
                      {formatCurrency(parseBalance(account.balance))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

---

### Step 9 — Refactor Dashboard Page

**File: `app/(app)/dashboard/page.tsx`**

> **NOTE:** This is a Server Component. Uses server-side fetch.

```tsx
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { Button } from '@/components/ui/button';
import { NorthStarCards } from '@/components/dashboard/NorthStarCards';
import { ModelConfidenceCard } from '@/components/dashboard/ModelConfidenceCard';
import { ActionPanel } from '@/components/dashboard/ActionPanel';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { NetWorthChart } from '@/components/dashboard/NetWorthChart';
import { AccountList } from '@/components/dashboard/AccountList';
import { formatDate } from '@/lib/format';
import { getDashboardData } from '@/lib/api/dashboard.server';

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <PageShell
      variant="dashboard"
      sidebar={
        <div className="space-y-6">
          <ModelConfidenceCard report={data.data_quality} />
          <ActionPanel placeholder />
          <InsightsPanel insights={data.insights} />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle={`As of ${formatDate(data.as_of_date)} • Baseline`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href="/scenarios/new/decision-builder">
                  Model a decision
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings/goals">
                  Edit goals
                </Link>
              </Button>
            </div>
          }
        />

        <NorthStarCards 
          metrics={data.metrics} 
          goal_status={data.goal_status} 
        />

        <SectionCard 
          title="Net Worth" 
          description="Last 12 months (baseline)"
        >
          <div className="h-64 md:h-80">
            <NetWorthChart data={data.net_worth_series} />
          </div>
        </SectionCard>

        <SectionCard 
          title="Accounts" 
          description="Cash, investments, and debts"
          right={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/accounts">View all</Link>
            </Button>
          }
        >
          <AccountList accounts={data.accounts} />
        </SectionCard>
      </div>
    </PageShell>
  );
}
```

---

## 6) Component Deliverables (must exist after this PR)

### New files
```
components/dashboard/NorthStarCards.tsx
components/dashboard/ModelConfidenceCard.tsx
components/dashboard/ActionPanel.tsx
components/dashboard/InsightsPanel.tsx
components/dashboard/NetWorthChart.tsx
components/dashboard/AccountList.tsx
app/(app)/dashboard/error.tsx
app/(app)/dashboard/loading.tsx
lib/api/dashboard.server.ts
```

### Modified files
```
app/(app)/dashboard/page.tsx
app/(app)/layout.tsx (global nav)
lib/types.ts (add types if missing)
```

---

## 7) Acceptance Criteria (PR must satisfy)

### Visual/UX
- [ ] Dashboard has cockpit layout (header, north star cards, sticky sidebar)
- [ ] No raw "Loading…" text anywhere in dashboard
- [ ] Cards have consistent padding, borders, and typography
- [ ] Dark mode looks correct and readable
- [ ] Responsive layout works at mobile/tablet/desktop
- [ ] Sidebar is sticky and accounts for header height

### Functional
- [ ] All buttons route correctly
- [ ] New dropdown exists in global header
- [ ] Command palette opens on ⌘K / Ctrl+K and navigates
- [ ] All metric numbers use formatting helpers
- [ ] Status badges show correct status based on thresholds

### Code Quality
- [ ] No duplication of layout styles; use primitives
- [ ] No inline ad-hoc colors; use semantic classes (CSS vars in Recharts OK)
- [ ] Components are reusable
- [ ] Types are properly defined and use snake_case
- [ ] Error boundary catches and displays errors gracefully
- [ ] Server-side fetch uses `cookies()` not client-side axios

---

## 8) QA Checklist

### Responsive Testing
- [ ] Mobile (375px): cards single column, sidebar below main
- [ ] Tablet (768px): 2-column grid
- [ ] Desktop (1280px): 3-column grid + sidebar
- [ ] Large (1536px): proper max-width containment

### Loading States
- [ ] Throttle network to 3G → skeleton appears
- [ ] No layout shift during load
- [ ] Sidebar skeletons match loaded card dimensions

### Error Handling
- [ ] Disconnect network → error boundary shows
- [ ] Retry button refreshes data
- [ ] Error message is user-friendly

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] ⌘K opens command palette
- [ ] ESC closes command palette
- [ ] Enter AND Space activate focused items

### Dark Mode
- [ ] Toggle dark mode → all elements readable
- [ ] Status badge colors have sufficient contrast
- [ ] Chart renders correctly in dark mode (tooltip styled)

---

## 9) PR Naming + Branch

- **Branch:** `ui/dashboard-cockpit-refactor`
- **PR Title:** `feat(ui): Cockpit dashboard refactor + global command palette`

### PR must include screenshots of:
1. Dashboard light mode (desktop)
2. Dashboard dark mode (desktop)
3. Dashboard mobile view
4. Command palette open
5. Loading skeleton state
6. Error state

### PR Description Template:
```markdown
## Summary
Refactors the Dashboard to use the cockpit layout system from TASK-16.

## Changes
- Replaced ad-hoc layout with PageShell + PageHeader + SectionCard
- Added NorthStarCards component with proper status badges
- Added sidebar with Model Confidence, Action Panel, Insights
- Integrated global NewMenu and CommandPalette
- Added proper loading and error states (loading.tsx, error.tsx)
- All numbers use formatting helpers (formatCurrency, formatPercent)
- Server-side data fetching with proper cookie handling

## Screenshots
[Attach screenshots here]

## Testing
- [ ] Tested responsive layout
- [ ] Tested dark mode
- [ ] Tested loading states
- [ ] Tested error handling
- [ ] Tested keyboard navigation

## Dependencies
- TASK-16 primitives (included in this PR / merged separately)

## Environment Variables
Requires `API_URL` in `.env.local`
```

---

## 10) After This PR (next steps)

Apply the same primitives to:
- Goals page (`/settings/goals`)
- Scenario details page (`/scenarios/[id]`)
- Flows page (`/flows`)
- Account balance update modals
- Stress tests page (TASK-15)

But those are out of scope for TASK-17.

---

## 11) Troubleshooting Guide

### Common Issues

**"Cannot find module '@/components/layout/PageShell'"**
- TASK-16 primitives not created yet
- Include TASK-16 files in this PR

**"Type 'MetricsSummary' is not assignable..."**
- Update types in `lib/types.ts` to match API response
- Check that all required fields are present

**"cookies() can only be called in a Server Component"**
- You're importing `dashboard.server.ts` in a client component
- Make sure Dashboard page is a Server Component (no 'use client')

**Sidebar not sticky on scroll**
- Ensure sidebar container uses `top-20` (not `top-6`)
- Check that header height is h-14

**Chart not rendering**
- Verify Recharts is installed: `npm install recharts`
- Check data format matches expected shape
- Ensure container has explicit height

**Command palette not opening**
- Check event listener is attached
- Verify Dialog component from shadcn is installed
- Check for conflicting keyboard shortcuts

**Dark mode colors wrong**
- Verify CSS variables are defined in globals.css
- Check components use `hsl(var(--...))` syntax
- Ensure Tailwind dark mode is configured

**"Unexpected token" in server fetch**
- API returned HTML instead of JSON (check API_URL)
- Add error handling for non-JSON responses
