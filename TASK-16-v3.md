# TASK-16 — Cockpit UI Overhaul (Tailwind-first, Shadcn-native, Premium UX)

> **Revision Notice (v3.0 — Jan 2026):** This document was revised to address additional spec issues:
> - v2.0: Added complete component implementations, status helpers, accessibility specs
> - v3.0: Fixed `computeStatus()` to return `statusLabel` (not `label`)
> - v3.0: Fixed `CommandPaletteItem` type collision with shadcn
> - v3.0: Added `formatCurrencyPrecise()` and `formatRatio()` helpers
> - v3.0: Fixed sticky sidebar to account for header height (`top-20`)
> - v3.0: Added Space key support to StatCard
> - v3.0: Added safe number parsing helpers
> - v3.0: Fixed negative currency formatting
> - v3.0: Added "Known Integration Contracts" section
> - v3.0: Updated UI Cookbook to use `statusLabel`

---

> **Purpose:** Transform the app from "a dashboard with cards" into a **true financial decision cockpit** with consistent layout primitives, premium loading states, unified statuses, and high-density-but-readable information architecture — using the full capabilities of **Tailwind CSS + shadcn/ui** (and Tremor where it makes sense).
>
> **This task is purely UI/UX + frontend architecture** (with small API client reorg); it should NOT change business logic.
>
> **Primary success criteria:** Users can understand their financial health in 10 seconds, model a decision in <2 minutes, and trust the UI because it feels consistent, fast, and intentional.

---

## 0) Scope + Constraints

### In scope
- Establish a coherent design system (tokens + primitives) using Tailwind + shadcn variables.
- Replace ad-hoc page layout with a reusable **Cockpit Layout System**:
  - `PageShell`
  - `PageHeader`
  - `SectionCard`
- Upgrade Dashboard UI to "cockpit" layout (dense, readable, status-driven).
- Implement premium **loading skeletons** everywhere (no raw "Loading…").
- Implement **StatusBadge** + semantic status styling across the app.
- Standardize typography, spacing, number formatting (tabular nums).
- Implement a global **New** dropdown (Decision / Scenario / Stress Test later).
- Implement `⌘K` command palette (navigation + quick actions).
- Modularize frontend API clients + types (if not already done).

### Not in scope
- Backend model changes
- New metrics logic
- Scenario engine changes (handled by TASK-13/14/15)

### Dependencies
- Next.js app router (v14+)
- TailwindCSS + shadcn/ui
- Tremor charts (optional, for dashboard chart)
- Recharts (alternative to Tremor)
- TASK-13/14/15 endpoints eventually, but this task can be implemented incrementally with existing endpoints.

---

## 1) Design Principles (must be followed)

1) **High signal density without visual noise**
   - More information per screen, but clear hierarchy.
2) **Every screen has the same skeleton/loading patterns**
3) **All statuses look and behave the same**
4) **All numeric UI uses tabular-nums**
5) **All primary actions live in the PageHeader**
6) **Dark mode must look intentional**
7) **Everything is componentized into primitives**

---

## 2) Known Integration Contracts

> **IMPORTANT:** These contracts ensure consistency between TASK-16 and TASK-17. Do not deviate.

### 2.1 Status Computation Return Shape
```ts
// computeStatus() and computeNetWorthStatus() ALWAYS return:
{ status: Status; statusLabel: string }

// NOT { status, label } — this was a v2 bug
```

### 2.2 Type Conventions
- All API response types use **snake_case** (matching DRF serializers)
- Frontend types mirror API exactly — no camelCase transformation
- Example: `goal_type`, `target_value`, `created_at`

### 2.3 Formatting Conventions
| Data Type | Formatter | Example Output |
|-----------|-----------|----------------|
| Net worth, debt | `formatCurrency()` | `$125,000` (0 decimals) |
| Monthly surplus | `formatCurrencyPrecise()` | `$1,234.56` (2 decimals) |
| Percentages | `formatPercent()` | `15.6%` |
| Ratios (DSCR) | `formatRatio()` | `1.25` |
| Months | `formatNumber(v, 1)` | `4.5` |

### 2.4 Component Prop Naming
- Status badge label prop: `statusLabel` (not `label`)
- All props use camelCase (React convention)
- All API fields use snake_case

---

## 3) Deliverables (what must exist at the end)

### 3.1 New UI primitives (must be created)

**Layout Components**
- `components/layout/PageShell.tsx`
- `components/layout/PageHeader.tsx`
- `components/layout/SectionCard.tsx`

**UI Components**
- `components/ui/StatusBadge.tsx`
- `components/ui/StatCard.tsx`
- `components/ui/MetricValue.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/Skeletons.tsx`
  - `StatCardSkeleton`
  - `ChartSkeleton`
  - `ListRowSkeleton`
  - `SidebarCardSkeleton`
  - `DashboardSkeleton`
  - `PageSkeleton`

**Navigation Components**
- `components/nav/NewMenu.tsx`
- `components/nav/CommandPalette.tsx`

### 3.2 Dashboard refactor
- `app/(app)/dashboard/page.tsx` uses new layout primitives
- `app/(app)/dashboard/loading.tsx` uses `DashboardSkeleton`
- `app/(app)/dashboard/error.tsx` provides error boundary
- Dashboard:
  - Cockpit header bar
  - North Star Cards row (implemented in TASK-17)
  - Sticky sidebar (Model Confidence, Next Actions, Insights)
  - Chart + Accounts
  - All skeleton states

### 3.3 Tailwind + design token improvements
- `app/globals.css` updated with coherent tokens (no random values)
- `tailwind.config.ts` updated to:
  - enforce consistent `container`, `fontSize`, and `spacing` decisions
  - optional: add utility classes for `tabular-nums`, `text-balance`

### 3.4 Utility libraries
- `lib/format.ts` - Number formatting helpers
- `lib/status.ts` - Status computation helpers

### 3.5 Global UX improvements
- Replace all raw `"Loading..."` with skeletons
- Add consistent empty states where lists can be empty
- Add command palette (⌘K)

### 3.6 Dev docs
- Add `docs/ui-cookbook.md`:
  - "how to build new pages"
  - sample compositions
  - recommended Tailwind classes
  - status color usage

---

## 4) Implementation Plan (strict sequence)

### Phase A — Create the cockpit primitives
1) Create `PageShell`
2) Create `PageHeader`
3) Create `SectionCard`
4) Create `StatusBadge`
5) Create `StatCard` + `MetricValue`
6) Create `EmptyState`
7) Create `Skeletons.tsx`

### Phase B — Add utility libraries
1) Create `lib/format.ts`
2) Create `lib/status.ts`

### Phase C — Add navigation quality features
1) Create `NewMenu`
2) Create `CommandPalette`
3) Integrate into global layout (top header / nav)

### Phase D — Sweep the app for consistency
- Replace loading text
- Convert remaining cards to `SectionCard`
- Ensure spacing + typography consistent

### Phase E — Documentation
1) Create `docs/ui-cookbook.md`

---

## 5) Tailwind + Styling Specifications (exact)

### 5.1 Typography
- Page titles:
  - `text-2xl font-semibold tracking-tight`
- Section titles:
  - `text-base font-semibold`
- Supporting text:
  - `text-sm text-muted-foreground`
- Microcopy:
  - `text-xs text-muted-foreground`

### 5.2 Spacing
- Page padding:
  - `px-4 py-6 md:px-6 lg:px-8`
- Section vertical spacing:
  - `space-y-6`
- Card padding:
  - Standard: `p-4`
  - Dense: `p-3`
  - Feature: `p-6`

### 5.3 Surfaces
- Default card:
  - `bg-card text-card-foreground border border-border/60 shadow-sm rounded-xl`
- Elevated callout:
  - `ring-1 ring-border/70 bg-card`
- Critical emphasis:
  - `ring-1 ring-destructive/30 border-destructive/30`

### 5.4 Numbers
All metric values MUST use:
- `tabular-nums`
- `tracking-tight`
- `font-semibold`
- Right alignment where appropriate: `text-right`

---

## 6) Component Specifications + Example Code

> These are REQUIRED. The agent must implement these components verbatim or equivalent.

### 6.1 `PageShell`

**Purpose**
- Standard page container with consistent max-width, padding, and optional sidebar layout.

**File**
- `components/layout/PageShell.tsx`

**Props**
- `children`
- `className?`
- `variant?` = `"default" | "dashboard"`
- `sidebar?` optional ReactNode

**Implementation**
```tsx
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function PageShell({
  children,
  sidebar,
  variant = 'default',
  className,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
  variant?: 'default' | 'dashboard';
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8', className)}>
      {variant === 'dashboard' && sidebar ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 2xl:col-span-9">{children}</div>
          <aside className="xl:col-span-4 2xl:col-span-3">
            {/* top-20 = 5rem = header height (3.5rem/h-14) + gap (1.5rem) */}
            <div className="sticky top-20 space-y-6">{sidebar}</div>
          </aside>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
```

---

### 6.2 `PageHeader`

**Purpose**
- Shared header with title, subtitle, status chips, and actions.

**File**
- `components/layout/PageHeader.tsx`

**Implementation**
```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  left,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;       // optional status chips or breadcrumbs
  actions?: ReactNode;    // buttons
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-start md:justify-between', className)}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {left}
        </div>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
```

---

### 6.3 `SectionCard`

**Purpose**
- Standard card with optional header slot.

**File**
- `components/layout/SectionCard.tsx`

**Implementation**
```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionCard({
  title,
  description,
  right,
  children,
  className,
  dense = false,
}: {
  title?: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section className={cn('rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm', className)}>
      {(title || right) ? (
        <header className={cn('flex items-start justify-between gap-4 border-b border-border/50', dense ? 'p-3' : 'p-4')}>
          <div className="space-y-0.5">
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {right}
        </header>
      ) : null}
      <div className={dense ? 'p-3' : 'p-4'}>{children}</div>
    </section>
  );
}
```

---

### 6.4 `StatusBadge`

**Purpose**
- Unified status indicator (Good / Warning / Critical / Neutral).

**File**
- `components/ui/StatusBadge.tsx`

**Implementation**
```tsx
import { cn } from '@/lib/utils';

export type Status = 'good' | 'warning' | 'critical' | 'neutral';

const statusStyles: Record<Status, string> = {
  good: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
  neutral: 'bg-muted text-muted-foreground',
};

export function StatusBadge({
  status,
  statusLabel,
  className,
}: {
  status: Status;
  statusLabel: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={`Status: ${statusLabel}`}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {statusLabel}
    </span>
  );
}
```

---

### 6.5 `MetricValue`

**Purpose**
- Consistent large number display with optional suffix.

**File**
- `components/ui/MetricValue.tsx`

**Implementation**
```tsx
import { cn } from '@/lib/utils';

export function MetricValue({
  value,
  suffix,
  className,
}: {
  value: string | number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline gap-1 tabular-nums', className)}>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}
```

---

### 6.6 `StatCard`

**Purpose**
- Standard "North Star" card: value + badge + target + delta + sparkline.

**File**
- `components/ui/StatCard.tsx`

**Implementation**
```tsx
import { SectionCard } from '@/components/layout/SectionCard';
import { StatusBadge, Status } from './StatusBadge';
import { MetricValue } from './MetricValue';
import { cn } from '@/lib/utils';

export function StatCard({
  title,
  value,
  suffix,
  status,
  statusLabel,
  targetLabel,
  deltaLabel,
  sparkline,
  onClick,
  className,
}: {
  title: string;
  value: string | number;
  suffix?: string;
  status: Status;
  statusLabel: string;
  targetLabel?: string;
  deltaLabel?: string;
  sparkline?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const isClickable = Boolean(onClick);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <SectionCard 
      dense 
      className={cn(
        isClickable && 'cursor-pointer hover:bg-muted/30 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
    >
      <div 
        className="flex items-start justify-between gap-3"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={isClickable ? `${title}: ${value}. Status: ${statusLabel}` : undefined}
      >
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate">{title}</h3>
            <StatusBadge status={status} statusLabel={statusLabel} />
          </div>
          <MetricValue value={value} suffix={suffix} />
          {(targetLabel || deltaLabel) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {targetLabel ? <span>{targetLabel}</span> : null}
              {targetLabel && deltaLabel ? <span aria-hidden>•</span> : null}
              {deltaLabel ? <span>{deltaLabel}</span> : null}
            </div>
          )}
        </div>
        {sparkline ? <div className="w-24 flex-shrink-0">{sparkline}</div> : null}
      </div>
    </SectionCard>
  );
}
```

---

### 6.7 `EmptyState`

**Purpose**
- Consistent empty state for lists and sections.

**File**
- `components/ui/EmptyState.tsx`

**Implementation**
```tsx
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon ? (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-sm font-medium">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
```

---

### 6.8 Skeleton System

**File**
- `components/ui/Skeletons.tsx`

**Implementation**
```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton() {
  return (
    <div 
      className="rounded-xl border border-border/60 bg-card p-3 shadow-sm"
      aria-busy="true"
      aria-label="Loading metric card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function SidebarCardSkeleton() {
  return (
    <div 
      className="rounded-xl border border-border/60 bg-card p-4 shadow-sm space-y-3"
      aria-busy="true"
      aria-label="Loading sidebar content"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div 
      className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
      aria-busy="true"
      aria-label="Loading chart"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-64 w-full rounded-lg" />
    </div>
  );
}

export function ListRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* North Star Cards skeleton */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart skeleton */}
      <ChartSkeleton />

      {/* Accounts list skeleton */}
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <Skeleton className="h-5 w-24 mb-4" />
        <ListRowSkeleton count={4} />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
```

---

## 7) Utility Libraries

### 7.1 Number Formatting

**File**
- `lib/format.ts`

**Implementation**
```ts
// ============================================
// Safe Parsing Helpers
// ============================================

/**
 * Safely parse a value to a number, returning 0 for invalid inputs
 */
export function safeParseNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Safely parse a string balance to number (handles currency strings too)
 */
export function parseBalance(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,]/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ============================================
// Currency Formatting
// ============================================

/**
 * Format a number as USD currency (smart decimals: 0 for large values)
 * Use for: net worth, debt totals, large amounts
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const decimals = absValue >= 1000 ? 0 : 2;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as USD currency with 2 decimal places
 * Use for: monthly surplus, income, expenses
 */
export function formatCurrencyPrecise(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as compact currency (e.g., $1.2M, $500K)
 * Use for: charts, space-constrained displays
 */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// ============================================
// Number Formatting
// ============================================

/**
 * Format a number with optional decimal places
 */
export function formatNumber(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Format a decimal as a percentage
 * @param value - Decimal value (0.15 = 15%)
 */
export function formatPercent(value: number, maxDecimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Format a ratio (e.g., DSCR of 1.25)
 */
export function formatRatio(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ============================================
// Date Formatting
// ============================================

/**
 * Format a date for display
 */
export function formatDate(
  date: string | Date | null | undefined, 
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!date) return '—';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check for invalid date
    if (isNaN(d.getTime())) return '—';
    
    const options: Intl.DateTimeFormatOptions = {
      short: { month: 'numeric', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { month: 'long', day: 'numeric', year: 'numeric' },
    }[style];
    
    return new Intl.DateTimeFormat('en-US', options).format(d);
  } catch {
    return '—';
  }
}

/**
 * Format a relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(d, 'short');
  } catch {
    return '—';
  }
}
```

---

### 7.2 Status Computation

**File**
- `lib/status.ts`

**Implementation**
```ts
import type { Status } from '@/components/ui/StatusBadge';

// ============================================
// Types
// ============================================

export interface StatusResult {
  status: Status;
  statusLabel: string;  // NOTE: "statusLabel" not "label" — matches StatusBadge prop
}

export interface ThresholdConfig {
  good: number;
  warning: number;
  higherIsBetter?: boolean; // default true
}

// ============================================
// Default Thresholds
// ============================================

export const DEFAULT_THRESHOLDS: Record<string, ThresholdConfig> = {
  liquidity_months: { good: 6, warning: 3, higherIsBetter: true },
  dscr: { good: 1.25, warning: 1.0, higherIsBetter: true },
  savings_rate: { good: 0.20, warning: 0.10, higherIsBetter: true },
  monthly_surplus: { good: 0, warning: -500, higherIsBetter: true },
};

// ============================================
// Status Computation Functions
// ============================================

/**
 * Compute status for a metric based on thresholds
 * 
 * @returns { status, statusLabel } — NOTE: statusLabel, not label
 */
export function computeStatus(
  metricKey: string,
  value: number,
  goalTarget?: number | null
): StatusResult {
  const threshold = DEFAULT_THRESHOLDS[metricKey];
  
  if (!threshold) {
    return { status: 'neutral', statusLabel: '—' };
  }
  
  const higherIsBetter = threshold.higherIsBetter !== false;
  const goodThreshold = goalTarget ?? threshold.good;
  
  if (higherIsBetter) {
    if (value >= goodThreshold) {
      return { status: 'good', statusLabel: 'Good' };
    }
    if (value >= threshold.warning) {
      return { status: 'warning', statusLabel: 'Warning' };
    }
    return { status: 'critical', statusLabel: 'Critical' };
  } else {
    // Lower is better (e.g., debt ratio)
    if (value <= goodThreshold) {
      return { status: 'good', statusLabel: 'Good' };
    }
    if (value <= threshold.warning) {
      return { status: 'warning', statusLabel: 'Warning' };
    }
    return { status: 'critical', statusLabel: 'Critical' };
  }
}

/**
 * Compute status for net worth based on trend or target
 * 
 * @returns { status, statusLabel } — NOTE: statusLabel, not label
 */
export function computeNetWorthStatus(
  current: number,
  target?: number | null,
  previousMonth?: number | null
): StatusResult {
  // If target exists and met
  if (target && current >= target) {
    return { status: 'good', statusLabel: 'On track' };
  }
  
  // Otherwise use trend
  if (previousMonth !== null && previousMonth !== undefined) {
    if (current > previousMonth) {
      return { status: 'good', statusLabel: 'Growing' };
    }
    if (current < previousMonth) {
      return { status: 'warning', statusLabel: 'Declining' };
    }
    return { status: 'neutral', statusLabel: 'Stable' };
  }
  
  return { status: 'neutral', statusLabel: '—' };
}

/**
 * Get goal target value from goal status array
 * 
 * @param goalStatus - Array from /api/v1/goals/status/ endpoint
 * @param goalType - The goal_type to find (snake_case)
 * @param defaultValue - Fallback if goal not found
 */
export function getGoalTarget(
  goalStatus: Array<{ goal_type: string; target_value: string }> | undefined,
  goalType: string,
  defaultValue?: number
): number | null {
  const goal = goalStatus?.find((g) => g.goal_type === goalType);
  if (goal) {
    const parsed = parseFloat(goal.target_value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return defaultValue ?? null;
}

/**
 * Compute delta label (e.g., "2.4 mo below target")
 */
export function computeDeltaLabel(
  current: number,
  target: number,
  unit: string,
  decimals = 1
): string | undefined {
  const delta = target - current;
  if (Math.abs(delta) < 0.01) return undefined;
  
  const formatted = Math.abs(delta).toFixed(decimals);
  if (delta > 0) {
    return `${formatted} ${unit} below target`;
  }
  return `${formatted} ${unit} above target`;
}

/**
 * Validate that a status string is a valid Status type
 */
export function isValidStatus(value: unknown): value is Status {
  return value === 'good' || value === 'warning' || value === 'critical' || value === 'neutral';
}

/**
 * Safely convert API status to Status type
 */
export function toStatus(value: string | undefined): Status {
  if (isValidStatus(value)) return value;
  return 'neutral';
}
```

---

## 8) Navigation Components

### 8.1 New Menu

**File**
- `components/nav/NewMenu.tsx`

**Implementation**
```tsx
'use client';

import { Plus, Sparkles, GitBranch, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface NewMenuProps {
  showStressTests?: boolean; // Enable after TASK-15
}

export function NewMenu({ showStressTests = false }: NewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/scenarios/new/decision-builder" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Model a Decision
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/scenarios/new" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Create Scenario
          </Link>
        </DropdownMenuItem>
        {showStressTests ? (
          <DropdownMenuItem asChild>
            <Link href="/stress-tests/new" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Run Stress Test
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="flex items-center gap-2 opacity-50">
            <Zap className="h-4 w-4" />
            Run Stress Test
            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### 8.2 Command Palette

**File**
- `components/nav/CommandPalette.tsx`

**Implementation**
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  GitBranch,
  Target,
  Zap,
  Plus,
  RefreshCw,
  Settings,
  HelpCircle,
} from 'lucide-react';

// NOTE: Named "CommandPaletteItem" to avoid collision with shadcn CommandItem
interface CommandPaletteItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
}

const navigationItems: CommandPaletteItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { name: 'Accounts', href: '/accounts', icon: Wallet, keywords: ['bank', 'balance', 'money'] },
  { name: 'Flows', href: '/flows', icon: ArrowRightLeft, keywords: ['income', 'expense', 'recurring'] },
  { name: 'Scenarios', href: '/scenarios', icon: GitBranch, keywords: ['what-if', 'projection'] },
  { name: 'Goals', href: '/settings/goals', icon: Target, keywords: ['target', 'objective'] },
  { name: 'Stress Tests', href: '/stress-tests', icon: Zap, keywords: ['risk', 'simulation'] },
  { name: 'Settings', href: '/settings', icon: Settings, keywords: ['preferences', 'config'] },
];

const actionItems: CommandPaletteItem[] = [
  { name: 'Model a Decision', href: '/scenarios/new/decision-builder', icon: Plus, keywords: ['new', 'create', 'scenario'] },
  { name: 'Update Account Balance', href: '/accounts?action=update', icon: RefreshCw, keywords: ['balance', 'refresh'] },
  { name: 'Help & Documentation', href: '/help', icon: HelpCircle, keywords: ['support', 'docs'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <span>Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.name} ${item.keywords?.join(' ') || ''}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Actions">
            {actionItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.name} ${item.keywords?.join(' ') || ''}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

---

## 9) Charts: Styling Rules

Where Tremor or Recharts is used:
- Use CSS variables for colors (not hard-coded hex values)
- Minimal axis noise (hide grid lines or use subtle colors)
- Always show tooltip values formatted with currency helpers
- Use consistent height: `h-64 md:h-80`
- Ensure responsive behavior

**Allowed inline styles (Recharts tooltip exception):**
```tsx
// This is acceptable — uses CSS variables and is necessary for Recharts
contentStyle: {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
},
labelStyle: {
  color: 'hsl(var(--foreground))',
  fontWeight: 500,
},
itemStyle: {
  color: 'hsl(var(--muted-foreground))',
},
cursor: {
  fill: 'hsl(var(--muted) / 0.3)',
},
```

---

## 10) Accessibility Specifications

### 10.1 Focus Management
- All interactive elements must have visible focus states (`:focus-visible`)
- Command palette must trap focus when open
- Modal dialogs must return focus on close
- Use `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### 10.2 Keyboard Navigation
- `Tab` navigates between interactive elements
- `Enter` AND `Space` activate buttons and menu items
- `Escape` closes dropdowns, dialogs, command palette
- `Arrow keys` navigate within menus and command list

### 10.3 Screen Reader Support
- StatusBadge includes `role="status"` and `aria-label`
- Loading skeletons include `aria-busy="true"` and `aria-label="Loading"`
- Use semantic HTML elements (`<nav>`, `<main>`, `<aside>`, `<section>`)
- Headings follow proper hierarchy (h1 → h2 → h3)

### 10.4 Color Contrast
- All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- Status colors have sufficient contrast in both light and dark modes
- Don't rely on color alone—always include text labels

---

## 11) Acceptance Criteria (must be demonstrably true)

1) Dashboard never shows raw "Loading…"
2) All cards use consistent padding/borders/shadows
3) All metric values use `tabular-nums`
4) StatusBadge is used everywhere for status
5) Dark mode looks correct and readable
6) Command palette opens with ⌘K and navigates
7) New dropdown exists and routes correctly
8) UI components are reusable and used across at least 3 pages
9) All interactive elements are keyboard accessible (Enter AND Space)
10) Screen reader announces status changes appropriately

---

## 12) QA Checklist

### Responsive Design
- [ ] Mobile (375px): single column, stacked layout
- [ ] Tablet (768px): 2-column grid
- [ ] Desktop (1280px): 3-column grid + sidebar
- [ ] Large (1536px): proper max-width containment

### Dark Mode
- [ ] Toggle between light/dark
- [ ] Text is readable in both modes
- [ ] Borders and shadows are visible
- [ ] Status colors have sufficient contrast

### Loading States
- [ ] Skeletons show on slow network (throttle to 3G)
- [ ] No layout shift during load
- [ ] Skeleton dimensions match loaded content

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] ⌘K opens command palette
- [ ] ESC closes modals and dropdowns
- [ ] Enter AND Space activate focused buttons

### Accessibility
- [ ] Run axe DevTools audit
- [ ] Test with VoiceOver/NVDA
- [ ] All images have alt text
- [ ] Form inputs have labels

---

## 13) PR Structure (required)

Create PRs in this order:

1) `ui/primitives-cockpit-layout`
   - PageShell, PageHeader, SectionCard
   - StatusBadge, StatCard, MetricValue
   - EmptyState, Skeletons
   - lib/format.ts, lib/status.ts

2) `ui/navigation-command-palette`
   - NewMenu, CommandPalette
   - Global layout integration

3) `ui/sweep-consistency`
   - Replace loading text app-wide
   - Convert remaining cards

---

## 14) Agent Instructions (DO NOT SKIP)

- Implement the primitives first (Phase A).
- Test each component in isolation before integration.
- Do NOT introduce one-off styling—use the design tokens.
- If a new pattern is needed, add it as a component in `components/ui/`.
- Keep Tailwind class usage consistent; prefer composition over copy/paste.
- Run accessibility checks after each component is complete.
- **IMPORTANT:** `computeStatus()` returns `{ status, statusLabel }` — not `label`
- **IMPORTANT:** Sticky sidebar uses `top-20` to account for header height

---

## 15) UI Cookbook Template

Create `docs/ui-cookbook.md` with the following content:

```markdown
# UI Cookbook

## Quick Start: Building a New Page

1. Wrap page in `PageShell`
2. Add `PageHeader` with title, subtitle, actions
3. Use `SectionCard` for content sections
4. Use skeletons for loading states

### Example Page Structure
\`\`\`tsx
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { PageSkeleton } from '@/components/ui/Skeletons';
import { Button } from '@/components/ui/button';

export default async function MyPage() {
  const data = await getData();
  
  return (
    <PageShell>
      <div className="space-y-6">
        <PageHeader 
          title="My Page" 
          subtitle="Description of this page"
          actions={<Button>Primary Action</Button>} 
        />
        <SectionCard title="Section Title">
          {/* content */}
        </SectionCard>
      </div>
    </PageShell>
  );
}
\`\`\`

## Component Reference

### Layout Components
| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `PageShell` | Page container | `variant`, `sidebar` |
| `PageHeader` | Title + actions | `title`, `subtitle`, `actions` |
| `SectionCard` | Content card | `title`, `description`, `dense` |

### UI Components
| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `StatusBadge` | Status indicator | `status`, `statusLabel` |
| `StatCard` | Metric card | `title`, `value`, `status`, `statusLabel` |
| `MetricValue` | Large number | `value`, `suffix` |
| `EmptyState` | Empty placeholder | `icon`, `title`, `action` |

### Formatting Helpers
\`\`\`ts
import { 
  formatCurrency, 
  formatCurrencyPrecise,
  formatNumber, 
  formatPercent,
  formatRatio 
} from '@/lib/format';

formatCurrency(125000)        // "$125,000" (0 decimals for large)
formatCurrencyPrecise(1234.56) // "$1,234.56" (always 2 decimals)
formatNumber(1234.56, 1)       // "1,234.6"
formatPercent(0.156)           // "15.6%"
formatRatio(1.25)              // "1.25"
\`\`\`

### Status Helpers
\`\`\`ts
import { computeStatus, computeNetWorthStatus } from '@/lib/status';

// Returns { status, statusLabel } — use statusLabel for StatusBadge
const result = computeStatus('liquidity_months', 4.5);
// { status: 'warning', statusLabel: 'Warning' }

const nwResult = computeNetWorthStatus(100000, null, 95000);
// { status: 'good', statusLabel: 'Growing' }
\`\`\`

## Tailwind Conventions

### Typography
| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-semibold tracking-tight` |
| Section title | `text-base font-semibold` |
| Body text | `text-sm` |
| Muted text | `text-sm text-muted-foreground` |
| Micro text | `text-xs text-muted-foreground` |

### Spacing
| Context | Classes |
|---------|---------|
| Page padding | `px-4 py-6 md:px-6 lg:px-8` |
| Between sections | `space-y-6` |
| Card padding (standard) | `p-4` |
| Card padding (dense) | `p-3` |
| Between items | `gap-3` or `space-y-3` |

### Numbers
Always use for metric values:
\`\`\`
tabular-nums tracking-tight font-semibold
\`\`\`

## Status Colors

| Status | Usage | Light | Dark |
|--------|-------|-------|------|
| Good | On track, healthy | emerald-600 | emerald-400 |
| Warning | Needs attention | amber-600 | amber-400 |
| Critical | Requires action | red-600 | red-400 |
| Neutral | Informational | muted-foreground | muted-foreground |

## Common Patterns

### Loading State (Server Component)
\`\`\`tsx
// app/my-page/loading.tsx
export default function Loading() {
  return <PageShell><PageSkeleton /></PageShell>;
}
\`\`\`

### Error State
\`\`\`tsx
// app/my-page/error.tsx
'use client';
export default function Error({ error, reset }) {
  return (
    <PageShell>
      <SectionCard>
        <EmptyState
          icon={AlertCircle}
          title="Something went wrong"
          description={error.message}
          action={<Button onClick={reset}>Retry</Button>}
        />
      </SectionCard>
    </PageShell>
  );
}
\`\`\`

### Empty State
\`\`\`tsx
if (items.length === 0) {
  return (
    <EmptyState
      icon={Inbox}
      title="No items yet"
      description="Get started by creating your first item."
      action={<Button>Create item</Button>}
    />
  );
}
\`\`\`
```

---

## 16) Final Deliverable List (files expected)

### Layout Components
- `components/layout/PageShell.tsx`
- `components/layout/PageHeader.tsx`
- `components/layout/SectionCard.tsx`

### UI Components
- `components/ui/StatusBadge.tsx`
- `components/ui/StatCard.tsx`
- `components/ui/MetricValue.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/Skeletons.tsx`

### Navigation Components
- `components/nav/NewMenu.tsx`
- `components/nav/CommandPalette.tsx`

### Utilities
- `lib/format.ts`
- `lib/status.ts`

### Documentation
- `docs/ui-cookbook.md`

### Modified Pages
- `app/(app)/layout.tsx` (global nav integration)
- Any page currently returning raw "Loading…"

---

If anything in this task conflicts with existing shadcn conventions, default to shadcn patterns (Dialog, DropdownMenu, Command, Skeleton) and use Tailwind only for layout/spacing/styling.
