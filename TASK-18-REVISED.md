# TASK-18 — High-Performance HMI Cockpit UI System (Revised)

> **Revision 2.0 — January 2026**
> 
> This task transforms the application from a "friendly SaaS dashboard" into a **high-performance financial cockpit**. It establishes a unified visual system, introduces new HMI-grade components, and refactors all pages to follow cockpit design principles.
>
> **This document is written for AI agent implementation.** All specifications include exact file paths, complete code examples, and explicit acceptance criteria.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design Tokens & Constants](#2-design-tokens--constants)
3. [New UI Primitives](#3-new-ui-primitives)
4. [Page Layout Templates](#4-page-layout-templates)
5. [Page-by-Page Refactors](#5-page-by-page-refactors)
6. [Chart System Overhaul](#6-chart-system-overhaul)
7. [Status & Color Semantics](#7-status--color-semantics)
8. [Accessibility & Keyboard](#8-accessibility--keyboard)
9. [Implementation Order](#9-implementation-order)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Design Philosophy

### 1.1 The North Star

> **"Everything is an instrument; every instrument has a threshold; every threshold has a lever."**

This means:
- Every metric displays current state AND status (good/warning/critical)
- Every status has a defined threshold that triggers it
- Every problem state has an adjacent action to address it

### 1.2 HMI vs. Dashboard Mindset

| Dashboard (Current)                | HMI Cockpit (Target)                     |
|------------------------------------|------------------------------------------|
| Shows data you requested           | Shows what you need to know              |
| Organized by data type             | Organized by decision context            |
| Status badges are decorative       | Status drives visual hierarchy           |
| Actions live in menus              | Actions are at the point of need         |
| You read it                        | You scan it in <10 seconds               |
| Deltas are supplementary           | Deltas are primary                       |
| Empty space is "clean"             | Empty space is wasted instrument space   |

### 1.3 Visual Identity

**Target aesthetic:** Linear + Stripe + Bloomberg Terminal (lite)

**NOT:** Notion, generic admin template, gamified dashboard

**Key characteristics:**
- Clean, quiet surfaces with subtle borders (not heavy shadows)
- Strong typography hierarchy where numbers are heroes
- Minimal but meaningful color (color = status, not decoration)
- Tight grids, compact density, maximum information per viewport
- Consistent "control strip" providing scenario context

### 1.4 Core Principles

1. **Situation Synthesis** — Every page answers "so what?" not just "here's data"
2. **Delta-First** — Changes matter more than absolutes; show deltas prominently
3. **Status-Driven** — Every metric has a status; status has consistent meaning
4. **Threshold Visibility** — Goals and limits are always visible on charts
5. **Context-Local Actions** — Controls adjacent to the data they affect
6. **Data Freshness** — Always show when data was last updated
7. **Density Over Whitespace** — Compact by default; information-rich

---

## 2. Design Tokens & Constants

### 2.1 File: `lib/design-tokens.ts`

Create this file as the single source of truth for all design constants.

```typescript
// =============================================================================
// DESIGN TOKENS — High-Performance HMI System
// =============================================================================

// -----------------------------------------------------------------------------
// Typography Scale
// -----------------------------------------------------------------------------
export const TYPOGRAPHY = {
  // Page-level
  pageTitle: 'text-2xl font-semibold tracking-tight',
  pageSubtitle: 'text-sm text-muted-foreground',
  
  // Section-level
  sectionTitle: 'text-lg font-semibold',
  sectionSubtitle: 'text-sm text-muted-foreground',
  
  // Metrics (the heroes)
  metricValue: 'text-3xl font-semibold tabular-nums tracking-tight',
  metricValueLarge: 'text-4xl font-bold tabular-nums tracking-tight',
  metricValueCompact: 'text-2xl font-semibold tabular-nums tracking-tight',
  metricLabel: 'text-sm font-medium text-muted-foreground',
  
  // Table/List
  tableHeader: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
  tableCell: 'text-sm tabular-nums',
  tableCellMono: 'text-sm font-mono tabular-nums',
  
  // UI Elements
  badgeText: 'text-xs font-medium',
  buttonText: 'text-sm font-medium',
  labelText: 'text-sm font-medium',
  helperText: 'text-xs text-muted-foreground',
  
  // Code/Technical
  code: 'font-mono text-sm',
} as const;

// -----------------------------------------------------------------------------
// Spacing Scale (consistent padding/margin)
// -----------------------------------------------------------------------------
export const SPACING = {
  // Page layout
  pageGutter: 'px-6 py-6',
  pageGutterCompact: 'px-4 py-4',
  
  // Section spacing
  sectionGap: 'space-y-6',
  sectionGapCompact: 'space-y-4',
  
  // Card internal
  cardPadding: 'p-4',
  cardPaddingCompact: 'p-3',
  cardPaddingDense: 'p-2',
  
  // Grid gaps
  gridGap: 'gap-4',
  gridGapCompact: 'gap-3',
  gridGapDense: 'gap-2',
} as const;

// -----------------------------------------------------------------------------
// Density Modes (for tables and lists)
// -----------------------------------------------------------------------------
export const DENSITY = {
  comfort: {
    row: 'py-3',
    cell: 'px-4',
    text: 'text-sm',
    height: 'h-12',
  },
  compact: {
    row: 'py-2',
    cell: 'px-3',
    text: 'text-sm',
    height: 'h-10',
  },
  dense: {
    row: 'py-1.5',
    cell: 'px-2.5',
    text: 'text-xs',
    height: 'h-8',
  },
} as const;

export type DensityMode = keyof typeof DENSITY;

// Default density for HMI feel
export const DEFAULT_DENSITY: DensityMode = 'compact';

// -----------------------------------------------------------------------------
// Surface Styles (cards, panels, containers)
// -----------------------------------------------------------------------------
export const SURFACE = {
  // Primary card (most common)
  card: 'rounded-xl border border-border/60 bg-card',
  cardHover: 'hover:border-border hover:bg-muted/30 transition-colors',
  cardInteractive: 'rounded-xl border border-border/60 bg-card hover:border-border hover:bg-muted/30 transition-colors cursor-pointer',
  
  // Elevated card (for modals, dropdowns)
  cardElevated: 'rounded-xl border border-border bg-card shadow-lg',
  
  // Instrument panel (for charts, key metrics)
  instrument: 'rounded-xl border border-border/60 bg-card shadow-sm',
  
  // Inset panel (nested content)
  inset: 'rounded-lg bg-muted/30 border border-border/40',
  
  // Status-driven surfaces
  cardGood: 'rounded-xl border border-emerald-500/30 bg-emerald-500/5',
  cardWarning: 'rounded-xl border border-amber-500/30 bg-amber-500/5',
  cardCritical: 'rounded-xl border border-red-500/30 bg-red-500/5',
  cardNeutral: 'rounded-xl border border-border/60 bg-card',
} as const;

// -----------------------------------------------------------------------------
// Status Colors (semantic, not decorative)
// -----------------------------------------------------------------------------
export const STATUS_COLORS = {
  good: {
    bg: 'bg-emerald-500/10',
    bgSolid: 'bg-emerald-500',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-500',
  },
  warning: {
    bg: 'bg-amber-500/10',
    bgSolid: 'bg-amber-500',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    icon: 'text-amber-500',
  },
  critical: {
    bg: 'bg-red-500/10',
    bgSolid: 'bg-red-500',
    border: 'border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500',
  },
  neutral: {
    bg: 'bg-muted',
    bgSolid: 'bg-muted-foreground',
    border: 'border-border',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  info: {
    bg: 'bg-blue-500/10',
    bgSolid: 'bg-blue-500',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500',
  },
} as const;

export type StatusTone = keyof typeof STATUS_COLORS;

// -----------------------------------------------------------------------------
// Data Freshness Thresholds
// -----------------------------------------------------------------------------
export const FRESHNESS = {
  fresh: { maxAgeMs: 1000 * 60 * 60, label: 'Fresh', tone: 'good' as StatusTone },
  recent: { maxAgeMs: 1000 * 60 * 60 * 24, label: 'Recent', tone: 'neutral' as StatusTone },
  aging: { maxAgeMs: 1000 * 60 * 60 * 24 * 7, label: 'Aging', tone: 'warning' as StatusTone },
  stale: { maxAgeMs: Infinity, label: 'Stale', tone: 'critical' as StatusTone },
} as const;

// -----------------------------------------------------------------------------
// Chart Colors (limited palette for clarity)
// -----------------------------------------------------------------------------
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--muted-foreground))',
  baseline: 'hsl(var(--muted-foreground) / 0.5)',
  scenario: 'hsl(var(--primary))',
  good: 'hsl(142, 76%, 36%)', // emerald-600
  warning: 'hsl(45, 93%, 47%)', // amber-500
  critical: 'hsl(0, 84%, 60%)', // red-500
  grid: 'hsl(var(--border) / 0.5)',
  axis: 'hsl(var(--muted-foreground))',
} as const;

// -----------------------------------------------------------------------------
// Z-Index Scale
// -----------------------------------------------------------------------------
export const Z_INDEX = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;

// -----------------------------------------------------------------------------
// Animation Durations
// -----------------------------------------------------------------------------
export const ANIMATION = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
} as const;

// -----------------------------------------------------------------------------
// Breakpoints (for responsive density)
// -----------------------------------------------------------------------------
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;
```

### 2.2 File: `lib/format.ts`

Ensure this file exists with all formatting functions. These MUST be used everywhere—no raw `toFixed()` or manual formatting.

```typescript
// =============================================================================
// FORMATTING UTILITIES — Consistent number display across the app
// =============================================================================

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFormatterPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatterCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Format as currency: $1,234
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return currencyFormatter.format(value);
}

/**
 * Format as precise currency: $1,234.56
 */
export function formatCurrencyPrecise(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return currencyFormatterPrecise.format(value);
}

/**
 * Format as compact currency: $1.2M, $450K
 * Use for chart axes and space-constrained displays
 */
export function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return currencyFormatterCompact.format(value);
}

/**
 * Format as signed currency with +/- prefix: +$1,234 or -$1,234
 */
export function formatCurrencySigned(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const formatted = currencyFormatter.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format as number with commas: 1,234.56
 */
export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format as percentage: 12.5%
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return percentFormatter.format(value);
}

/**
 * Format as signed percentage: +12.5% or -12.5%
 */
export function formatPercentSigned(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const formatted = percentFormatter.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format as ratio: 2.5x
 */
export function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${formatNumber(value, 2)}x`;
}

/**
 * Format as months: "6.0 months" or "6 mo"
 */
export function formatMonths(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '—';
  if (compact) return `${formatNumber(value, 1)} mo`;
  return `${formatNumber(value, 1)} months`;
}

/**
 * Format date as relative time: "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date as month/year: "Jan 2026"
 */
export function formatMonthYear(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format projection month index to real date
 * @param monthIndex - 1-based month index (M1, M2, etc.)
 * @param startDate - Projection start date
 */
export function formatProjectionMonth(monthIndex: number, startDate: Date): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + monthIndex - 1);
  return formatMonthYear(d);
}
```

### 2.3 File: `lib/status.ts`

Status calculation utilities.

```typescript
// =============================================================================
// STATUS UTILITIES — Consistent status derivation
// =============================================================================

import { StatusTone, FRESHNESS } from './design-tokens';

/**
 * Derive status tone from a value and thresholds
 */
export function deriveStatus(
  value: number,
  thresholds: { warning: number; critical: number },
  direction: 'higher-is-better' | 'lower-is-better' = 'higher-is-better'
): StatusTone {
  if (direction === 'higher-is-better') {
    if (value >= thresholds.warning) return 'good';
    if (value >= thresholds.critical) return 'warning';
    return 'critical';
  } else {
    if (value <= thresholds.warning) return 'good';
    if (value <= thresholds.critical) return 'warning';
    return 'critical';
  }
}

/**
 * Derive status from a delta value
 * @param delta - The change value
 * @param goodDirection - Whether positive change is good
 */
export function deriveDeltaStatus(
  delta: number,
  goodDirection: 'up' | 'down' = 'up'
): StatusTone {
  if (delta === 0) return 'neutral';
  
  if (goodDirection === 'up') {
    return delta > 0 ? 'good' : 'critical';
  } else {
    return delta < 0 ? 'good' : 'critical';
  }
}

/**
 * Derive delta direction
 */
export function deriveDeltaDirection(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

/**
 * Derive data freshness status
 */
export function deriveFreshnessStatus(lastUpdated: Date | string | number): {
  tone: StatusTone;
  label: string;
} {
  const d = new Date(lastUpdated);
  const ageMs = Date.now() - d.getTime();
  
  if (ageMs <= FRESHNESS.fresh.maxAgeMs) {
    return { tone: 'good', label: 'Fresh' };
  }
  if (ageMs <= FRESHNESS.recent.maxAgeMs) {
    return { tone: 'neutral', label: 'Recent' };
  }
  if (ageMs <= FRESHNESS.aging.maxAgeMs) {
    return { tone: 'warning', label: 'Aging' };
  }
  return { tone: 'critical', label: 'Stale' };
}

/**
 * Standard financial metric thresholds
 */
export const METRIC_THRESHOLDS = {
  liquidityMonths: { warning: 6, critical: 3 },
  savingsRate: { warning: 0.15, critical: 0.05 },
  dscr: { warning: 1.5, critical: 1.0 },
  debtToIncome: { warning: 0.36, critical: 0.43 },
} as const;
```

---

## 3. New UI Primitives

### 3.1 `StatusBadge` — Unified Status Display

**File:** `components/ui/StatusBadge.tsx`

Replaces inconsistent status pills throughout the app.

```tsx
import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone, TYPOGRAPHY } from '@/lib/design-tokens';
import { CheckCircle2, AlertTriangle, XCircle, Minus, Info } from 'lucide-react';

interface StatusBadgeProps {
  /** Status tone determines color */
  tone: StatusTone;
  /** Label text to display */
  label: string;
  /** Show icon alongside label */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional classes */
  className?: string;
}

const ICONS = {
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  neutral: Minus,
  info: Info,
};

export function StatusBadge({
  tone,
  label,
  showIcon = false,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  const colors = STATUS_COLORS[tone];
  const Icon = ICONS[tone];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {showIcon && <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {label}
    </span>
  );
}
```

### 3.2 `DeltaPill` — Change Indicator

**File:** `components/ui/DeltaPill.tsx`

Shows deltas with direction arrow and status color.

```tsx
import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface DeltaPillProps {
  /** Formatted value string (e.g., "+$1,234" or "-5.2%") */
  value: string;
  /** Direction of change */
  direction: 'up' | 'down' | 'flat';
  /** Status tone for coloring */
  tone: StatusTone;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional classes */
  className?: string;
}

export function DeltaPill({
  value,
  direction,
  tone,
  size = 'sm',
  className,
}: DeltaPillProps) {
  const colors = STATUS_COLORS[tone];
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-0.5',
    md: 'px-2.5 py-1 text-sm gap-1',
    lg: 'px-3 py-1.5 text-base gap-1.5',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium tabular-nums',
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn('shrink-0', iconSizes[size])} aria-hidden />
      <span>{value}</span>
    </span>
  );
}
```

### 3.3 `FreshnessIndicator` — Data Age Display

**File:** `components/ui/FreshnessIndicator.tsx`

Shows when data was last updated with status coloring.

```tsx
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/design-tokens';
import { formatRelativeTime } from '@/lib/format';
import { deriveFreshnessStatus } from '@/lib/status';
import { RefreshCw } from 'lucide-react';

interface FreshnessIndicatorProps {
  /** Last update timestamp */
  lastUpdated: Date | string | number;
  /** Show as dot only (no text) */
  dotOnly?: boolean;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Additional classes */
  className?: string;
}

export function FreshnessIndicator({
  lastUpdated,
  dotOnly = false,
  showRefresh = false,
  onRefresh,
  className,
}: FreshnessIndicatorProps) {
  const { tone, label } = deriveFreshnessStatus(lastUpdated);
  const colors = STATUS_COLORS[tone];
  
  if (dotOnly) {
    return (
      <span
        className={cn('inline-block h-2 w-2 rounded-full', colors.bgSolid, className)}
        title={`${label}: ${formatRelativeTime(lastUpdated)}`}
      />
    );
  }
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', colors.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.bgSolid)} />
      <span>{formatRelativeTime(lastUpdated)}</span>
      {showRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className="p-0.5 hover:bg-muted rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
```

### 3.4 `StatusAnnunciator` — Compact Status Grid

**File:** `components/ui/StatusAnnunciator.tsx`

Aircraft-style warning panel showing multiple status indicators compactly.

```tsx
import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatusItem {
  /** Short code (2-3 chars): "NW", "CF", "LQ" */
  code: string;
  /** Full label for tooltip */
  label: string;
  /** Current status */
  tone: StatusTone;
  /** Current value for tooltip */
  value?: string;
  /** Click handler */
  onClick?: () => void;
}

interface StatusAnnunciatorProps {
  items: StatusItem[];
  /** Layout direction */
  direction?: 'row' | 'column';
  /** Additional classes */
  className?: string;
}

export function StatusAnnunciator({
  items,
  direction = 'row',
  className,
}: StatusAnnunciatorProps) {
  return (
    <div
      className={cn(
        'inline-flex gap-1',
        direction === 'column' ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {items.map((item) => {
        const colors = STATUS_COLORS[item.tone];
        
        return (
          <Tooltip key={item.code}>
            <TooltipTrigger asChild>
              <button
                onClick={item.onClick}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg px-2 py-1 transition-colors',
                  'border',
                  colors.bg,
                  colors.border,
                  item.onClick && 'hover:opacity-80 cursor-pointer'
                )}
              >
                <span className={cn('text-[10px] font-bold uppercase tracking-wider', colors.text)}>
                  {item.code}
                </span>
                <span className={cn('h-1.5 w-4 rounded-full mt-0.5', colors.bgSolid)} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{item.label}</p>
              {item.value && <p className="text-muted-foreground">{item.value}</p>}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
```

### 3.5 `MetricCard` — Primary Metric Display

**File:** `components/ui/MetricCard.tsx`

Displays a key metric with status, trend, and optional action.

```tsx
import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY, STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { StatusBadge } from './StatusBadge';
import { DeltaPill } from './DeltaPill';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  /** Metric label */
  label: string;
  /** Formatted value */
  value: string;
  /** Status tone */
  tone?: StatusTone;
  /** Status label (e.g., "Healthy", "Critical") */
  statusLabel?: string;
  /** Delta from previous/baseline */
  delta?: {
    value: string;
    direction: 'up' | 'down' | 'flat';
    tone: StatusTone;
  };
  /** Optional icon */
  icon?: LucideIcon;
  /** Click handler (makes card interactive) */
  onClick?: () => void;
  /** Additional classes */
  className?: string;
}

export function MetricCard({
  label,
  value,
  tone = 'neutral',
  statusLabel,
  delta,
  icon: Icon,
  onClick,
  className,
}: MetricCardProps) {
  const isInteractive = !!onClick;
  const colors = STATUS_COLORS[tone];
  
  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        SURFACE.card,
        'p-4',
        // Left border indicator for status
        tone !== 'neutral' && `border-l-2 ${colors.border.replace('border-', 'border-l-')}`,
        isInteractive && 'cursor-pointer hover:bg-muted/30 transition-colors',
        className
      )}
    >
      {/* Header: Label + Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn('p-1.5 rounded-lg', colors.bg)}>
              <Icon className={cn('h-4 w-4', colors.icon)} />
            </div>
          )}
          <span className={TYPOGRAPHY.metricLabel}>{label}</span>
        </div>
        {statusLabel && <StatusBadge tone={tone} label={statusLabel} />}
      </div>
      
      {/* Value */}
      <div className={cn(TYPOGRAPHY.metricValue, 'mb-1')}>{value}</div>
      
      {/* Delta (if provided) */}
      {delta && (
        <div className="flex items-center gap-1">
          <DeltaPill value={delta.value} direction={delta.direction} tone={delta.tone} />
          <span className="text-xs text-muted-foreground">vs baseline</span>
        </div>
      )}
    </div>
  );
}
```

### 3.6 `MetricRow` — Compare Table Row

**File:** `components/ui/MetricRow.tsx`

Delta-first comparison row for tables.

```tsx
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/lib/design-tokens';
import { DeltaPill } from './DeltaPill';
import { deriveDeltaStatus, deriveDeltaDirection } from '@/lib/status';
import { LucideIcon } from 'lucide-react';

type MetricFormat = 'currency' | 'currency_compact' | 'percent' | 'ratio' | 'months' | 'number';

interface MetricRowProps {
  /** Row label */
  label: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Baseline value (number) */
  baseline: number;
  /** Scenario value (number) */
  scenario: number;
  /** How to format the values */
  format?: MetricFormat;
  /** Whether higher values are better (for status coloring) */
  goodDirection?: 'up' | 'down';
  /** Additional classes */
  className?: string;
}

import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatRatio,
  formatMonths,
  formatNumber,
  formatCurrencySigned,
  formatPercentSigned,
} from '@/lib/format';

function formatValue(value: number, format: MetricFormat): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'currency_compact':
      return formatCurrencyCompact(value);
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    case 'months':
      return formatMonths(value, true);
    default:
      return formatNumber(value);
  }
}

function formatDelta(value: number, format: MetricFormat): string {
  switch (format) {
    case 'currency':
    case 'currency_compact':
      return formatCurrencySigned(value);
    case 'percent':
      return formatPercentSigned(value);
    default:
      return value > 0 ? `+${formatValue(value, format)}` : formatValue(value, format);
  }
}

export function MetricRow({
  label,
  icon: Icon,
  baseline,
  scenario,
  format = 'currency',
  goodDirection = 'up',
  className,
}: MetricRowProps) {
  const delta = scenario - baseline;
  const direction = deriveDeltaDirection(delta);
  const tone = deriveDeltaStatus(delta, goodDirection);
  
  return (
    <div
      className={cn(
        'grid grid-cols-12 items-center gap-3 py-2.5 border-b border-border/40 last:border-0',
        className
      )}
    >
      {/* Label (col 1-4) */}
      <div className="col-span-4 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium truncate">{label}</span>
      </div>
      
      {/* Delta - PRIMARY (col 5-6) */}
      <div className="col-span-2 flex justify-end">
        <DeltaPill value={formatDelta(delta, format)} direction={direction} tone={tone} size="md" />
      </div>
      
      {/* Scenario value (col 7-9) */}
      <div className={cn('col-span-3 text-right', TYPOGRAPHY.tableCell, 'font-semibold')}>
        {formatValue(scenario, format)}
      </div>
      
      {/* Baseline value (col 10-12) */}
      <div className={cn('col-span-3 text-right', TYPOGRAPHY.tableCell, 'text-muted-foreground')}>
        {formatValue(baseline, format)}
      </div>
    </div>
  );
}

/**
 * Header row for MetricRow tables
 */
export function MetricRowHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-12 items-center gap-3 py-2 border-b border-border',
        TYPOGRAPHY.tableHeader,
        className
      )}
    >
      <div className="col-span-4">Metric</div>
      <div className="col-span-2 text-right">Change</div>
      <div className="col-span-3 text-right">Scenario</div>
      <div className="col-span-3 text-right">Baseline</div>
    </div>
  );
}
```

### 3.7 `InstrumentPanel` — Chart/Metric Container

**File:** `components/ui/InstrumentPanel.tsx`

Container optimized for charts and live metrics with controls in header.

```tsx
import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY } from '@/lib/design-tokens';
import { ReactNode } from 'react';

interface InstrumentPanelProps {
  /** Panel title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Controls to show in header (right side) */
  controls?: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Optional footer (e.g., legend, threshold info) */
  footer?: ReactNode;
  /** Remove padding from content area (for full-bleed charts) */
  noPadding?: boolean;
  /** Additional classes */
  className?: string;
}

export function InstrumentPanel({
  title,
  subtitle,
  controls,
  children,
  footer,
  noPadding = false,
  className,
}: InstrumentPanelProps) {
  return (
    <section className={cn(SURFACE.instrument, className)}>
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          <h2 className={cn(TYPOGRAPHY.sectionTitle, 'truncate')}>{title}</h2>
          {subtitle && <p className={cn(TYPOGRAPHY.sectionSubtitle, 'mt-0.5')}>{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-2 shrink-0">{controls}</div>}
      </header>
      
      {/* Content */}
      <div className={cn(noPadding ? '' : 'p-4')}>{children}</div>
      
      {/* Footer */}
      {footer && (
        <footer className="border-t border-border/50 px-4 py-2.5 bg-muted/30">{footer}</footer>
      )}
    </section>
  );
}
```

### 3.8 `ScenarioContextBar` — Cockpit Strip

**File:** `components/layout/ScenarioContextBar.tsx`

Persistent context bar for scenario-related pages (the "cockpit strip").

```tsx
import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY } from '@/lib/design-tokens';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Plus, Sparkles, Loader2 } from 'lucide-react';
import { StatusTone } from '@/lib/design-tokens';

interface ScenarioContextBarProps {
  /** Current scenario name */
  scenarioName: string;
  /** Baseline name (for comparison context) */
  baselineName?: string;
  /** Overall scenario status */
  status?: {
    tone: StatusTone;
    label: string;
  };
  /** Current projection horizon */
  horizon: '12' | '24' | '60' | '120' | '360';
  /** Horizon change handler */
  onHorizonChange: (horizon: string) => void;
  /** Run projection handler */
  onRunProjection?: () => void;
  /** Add change handler */
  onAddChange?: () => void;
  /** Life event handler */
  onLifeEvent?: () => void;
  /** Is projection running */
  isRunning?: boolean;
  /** Additional classes */
  className?: string;
}

export function ScenarioContextBar({
  scenarioName,
  baselineName,
  status,
  horizon,
  onHorizonChange,
  onRunProjection,
  onAddChange,
  onLifeEvent,
  isRunning = false,
  className,
}: ScenarioContextBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2.5',
        'border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10',
        className
      )}
    >
      {/* Left: Scenario context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className={cn(TYPOGRAPHY.sectionTitle, 'truncate')}>{scenarioName}</h1>
            {status && <StatusBadge tone={status.tone} label={status.label} />}
          </div>
          {baselineName && (
            <p className="text-xs text-muted-foreground">vs {baselineName}</p>
          )}
        </div>
      </div>
      
      {/* Center: Horizon selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Horizon:</span>
        <Select value={horizon} onValueChange={onHorizonChange}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">1 Year</SelectItem>
            <SelectItem value="24">2 Years</SelectItem>
            <SelectItem value="60">5 Years</SelectItem>
            <SelectItem value="120">10 Years</SelectItem>
            <SelectItem value="360">30 Years</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onLifeEvent && (
          <Button variant="outline" size="sm" onClick={onLifeEvent} className="h-8">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Life Event
          </Button>
        )}
        {onAddChange && (
          <Button variant="outline" size="sm" onClick={onAddChange} className="h-8">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Change
          </Button>
        )}
        {onRunProjection && (
          <Button size="sm" onClick={onRunProjection} disabled={isRunning} className="h-8">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Computing…
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1.5" />
                Run Projection
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 3.9 `SystemAlert` — Top-of-Page Alert

**File:** `components/ui/SystemAlert.tsx`

Collapsible alert banner for errors and warnings.

```tsx
import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface SystemAlertProps {
  /** Alert severity */
  tone: StatusTone;
  /** Alert title */
  title: string;
  /** Alert description */
  description?: string;
  /** Is dismissible */
  dismissible?: boolean;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Is collapsible */
  collapsible?: boolean;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional classes */
  className?: string;
}

const ICONS = {
  good: CheckCircle,
  warning: AlertTriangle,
  critical: AlertCircle,
  neutral: Info,
  info: Info,
};

export function SystemAlert({
  tone,
  title,
  description,
  dismissible = false,
  onDismiss,
  collapsible = false,
  action,
  className,
}: SystemAlertProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const colors = STATUS_COLORS[tone];
  const Icon = ICONS[tone];
  
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          colors.bg,
          colors.text,
          'hover:opacity-90 transition-opacity',
          className
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="font-medium">{title}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
    );
  }
  
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        colors.bg,
        colors.border,
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', colors.icon)} />
      
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', colors.text)}>{title}</p>
        {description && (
          <p className={cn('text-sm mt-1', colors.text, 'opacity-90')}>{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn('text-sm font-medium mt-2 hover:underline', colors.text)}
          >
            {action.label}
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(true)}
            className={cn('p-1 rounded hover:bg-black/5', colors.text)}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn('p-1 rounded hover:bg-black/5', colors.text)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

### 3.10 `DriversBlock` — Delta Explanation

**File:** `components/ui/DriversBlock.tsx`

Explains what's driving a delta/change.

```tsx
import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY, STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { formatCurrencySigned } from '@/lib/format';
import { TrendingUp, TrendingDown, Repeat, LucideIcon } from 'lucide-react';

interface Driver {
  /** Description of the driver */
  label: string;
  /** Impact amount (positive or negative) */
  impact: number;
  /** Whether this is positive or negative for the user */
  tone: StatusTone;
  /** Is this a recurring impact */
  recurring?: boolean;
  /** Optional icon */
  icon?: LucideIcon;
}

interface DriversBlockProps {
  /** Section title */
  title: string;
  /** List of drivers */
  drivers: Driver[];
  /** Additional classes */
  className?: string;
}

export function DriversBlock({ title, drivers, className }: DriversBlockProps) {
  return (
    <div className={cn(SURFACE.inset, 'p-4', className)}>
      <h3 className={cn(TYPOGRAPHY.sectionTitle, 'text-sm mb-3')}>{title}</h3>
      
      <ul className="space-y-2">
        {drivers.map((driver, i) => {
          const colors = STATUS_COLORS[driver.tone];
          const Icon = driver.icon || (driver.impact >= 0 ? TrendingUp : TrendingDown);
          
          return (
            <li key={i} className="flex items-center gap-3">
              <div className={cn('p-1.5 rounded-lg', colors.bg)}>
                <Icon className={cn('h-3.5 w-3.5', colors.icon)} />
              </div>
              
              <span className="flex-1 text-sm">{driver.label}</span>
              
              {driver.recurring && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  /mo
                </span>
              )}
              
              <span className={cn('text-sm font-semibold tabular-nums', colors.text)}>
                {formatCurrencySigned(driver.impact)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

### 3.11 `TableDensityToggle` — Density Switcher

**File:** `components/ui/TableDensityToggle.tsx`

Toggle between comfort/compact/dense table modes.

```tsx
import { cn } from '@/lib/utils';
import { DensityMode } from '@/lib/design-tokens';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlignJustify, List, LayoutList } from 'lucide-react';

interface TableDensityToggleProps {
  value: DensityMode;
  onChange: (value: DensityMode) => void;
  className?: string;
}

export function TableDensityToggle({ value, onChange, className }: TableDensityToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as DensityMode)}
      className={cn('h-8', className)}
    >
      <ToggleGroupItem value="comfort" aria-label="Comfort density" className="h-8 w-8 p-0">
        <LayoutList className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="compact" aria-label="Compact density" className="h-8 w-8 p-0">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dense" aria-label="Dense density" className="h-8 w-8 p-0">
        <AlignJustify className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```

### 3.12 `ScenarioTile` — Enhanced Scenario Card

**File:** `components/scenarios/ScenarioTile.tsx`

Information-dense scenario card with key metrics and status.

```tsx
import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY, StatusTone } from '@/lib/design-tokens';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FreshnessIndicator } from '@/components/ui/FreshnessIndicator';
import { DeltaPill } from '@/components/ui/DeltaPill';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrencyCompact } from '@/lib/format';
import { deriveDeltaDirection, deriveDeltaStatus } from '@/lib/status';

interface ScenarioTileProps {
  /** Scenario ID */
  id: string;
  /** Scenario name */
  name: string;
  /** Description or source */
  description?: string;
  /** Is this the baseline scenario */
  isBaseline?: boolean;
  /** Projection horizon in months */
  horizonMonths: number;
  /** Last projection run time */
  lastRun?: Date | string;
  /** Overall status */
  status?: {
    tone: StatusTone;
    label: string;
  };
  /** Key metrics */
  metrics?: {
    netWorth?: number;
    netWorthDelta?: number;
    surplus?: number;
    surplusDelta?: number;
    liquidity?: number;
  };
  /** Is selected for comparison */
  isSelected?: boolean;
  /** Selection change handler */
  onSelectionChange?: (selected: boolean) => void;
  /** Open scenario handler */
  onOpen: () => void;
  /** Additional classes */
  className?: string;
}

export function ScenarioTile({
  id,
  name,
  description,
  isBaseline = false,
  horizonMonths,
  lastRun,
  status,
  metrics,
  isSelected = false,
  onSelectionChange,
  onOpen,
  className,
}: ScenarioTileProps) {
  return (
    <div
      className={cn(
        SURFACE.card,
        'p-4 relative',
        isBaseline && 'bg-muted/30 border-primary/20',
        isSelected && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Selection checkbox */}
      {onSelectionChange && !isBaseline && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectionChange}
          className="absolute top-3 right-3"
        />
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(TYPOGRAPHY.sectionTitle, 'truncate')}>{name}</h3>
            {isBaseline && (
              <StatusBadge tone="info" label="Baseline" />
            )}
            {status && !isBaseline && (
              <StatusBadge tone={status.tone} label={status.label} />
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      
      {/* Metrics grid */}
      {metrics && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Net Worth */}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Net Worth</div>
            <div className="text-sm font-semibold tabular-nums">
              {metrics.netWorth !== undefined ? formatCurrencyCompact(metrics.netWorth) : '—'}
            </div>
            {metrics.netWorthDelta !== undefined && !isBaseline && (
              <DeltaPill
                value={formatCurrencyCompact(Math.abs(metrics.netWorthDelta))}
                direction={deriveDeltaDirection(metrics.netWorthDelta)}
                tone={deriveDeltaStatus(metrics.netWorthDelta, 'up')}
                size="sm"
              />
            )}
          </div>
          
          {/* Surplus */}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Surplus</div>
            <div className="text-sm font-semibold tabular-nums">
              {metrics.surplus !== undefined ? formatCurrencyCompact(metrics.surplus) : '—'}
            </div>
            {metrics.surplusDelta !== undefined && !isBaseline && (
              <DeltaPill
                value={formatCurrencyCompact(Math.abs(metrics.surplusDelta))}
                direction={deriveDeltaDirection(metrics.surplusDelta)}
                tone={deriveDeltaStatus(metrics.surplusDelta, 'up')}
                size="sm"
              />
            )}
          </div>
          
          {/* Liquidity */}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Liquidity</div>
            <div className="text-sm font-semibold tabular-nums">
              {metrics.liquidity !== undefined ? `${metrics.liquidity.toFixed(1)} mo` : '—'}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{horizonMonths}mo horizon</span>
          {lastRun && (
            <>
              <span>•</span>
              <FreshnessIndicator lastUpdated={lastRun} />
            </>
          )}
        </div>
        
        <Button size="sm" onClick={onOpen} className="h-7">
          {isBaseline ? 'View' : 'Open'}
        </Button>
      </div>
    </div>
  );
}
```

### 3.13 `CompareSelectionBar` — Sticky Compare Bar

**File:** `components/scenarios/CompareSelectionBar.tsx`

Sticky bar that appears when scenarios are selected for comparison.

```tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

interface CompareSelectionBarProps {
  /** Number of selected scenarios */
  selectedCount: number;
  /** Maximum scenarios that can be compared */
  maxSelections?: number;
  /** Compare handler */
  onCompare: () => void;
  /** Clear selection handler */
  onClear: () => void;
  /** Is visible */
  visible: boolean;
  /** Additional classes */
  className?: string;
}

export function CompareSelectionBar({
  selectedCount,
  maxSelections = 2,
  onCompare,
  onClear,
  visible,
  className,
}: CompareSelectionBarProps) {
  if (!visible) return null;
  
  const canCompare = selectedCount >= 2 && selectedCount <= maxSelections;
  
  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-card border border-border shadow-lg',
        className
      )}
    >
      <span className="text-sm font-medium">
        {selectedCount} scenario{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="h-8"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
        
        <Button
          size="sm"
          onClick={onCompare}
          disabled={!canCompare}
          className="h-8"
        >
          Compare
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
```

### 3.14 `GoalLine` — Chart Threshold Line

**File:** `components/charts/GoalLine.tsx`

Horizontal reference line for charts showing goals/thresholds.

```tsx
import { ReferenceLine, Label } from 'recharts';
import { formatCurrencyCompact } from '@/lib/format';
import { StatusTone, STATUS_COLORS } from '@/lib/design-tokens';

interface GoalLineProps {
  /** Y-axis value for the line */
  value: number;
  /** Label to display */
  label: string;
  /** Line color based on status */
  tone?: StatusTone;
  /** Show value in label */
  showValue?: boolean;
}

export function GoalLine({
  value,
  label,
  tone = 'neutral',
  showValue = true,
}: GoalLineProps) {
  // Map tone to actual color
  const colorMap: Record<StatusTone, string> = {
    good: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    critical: '#ef4444', // red-500
    neutral: '#6b7280', // gray-500
    info: '#3b82f6', // blue-500
  };
  
  const color = colorMap[tone];
  const displayLabel = showValue ? `${label}: ${formatCurrencyCompact(value)}` : label;
  
  return (
    <ReferenceLine
      y={value}
      stroke={color}
      strokeDasharray="6 4"
      strokeWidth={1.5}
    >
      <Label
        value={displayLabel}
        position="insideTopRight"
        fill={color}
        fontSize={11}
        fontWeight={500}
      />
    </ReferenceLine>
  );
}
```

---

## 4. Page Layout Templates

### 4.1 Layout Types

All pages must use one of these three layout templates:

#### Template A: Cockpit Page
- Main content area with optional right sidebar
- Used for: Dashboard, Scenario Detail, Compare
- Features: Scenario context bar (when applicable), instruments/charts, action sidebar

#### Template B: Control List Page
- Summary stats strip at top, table/list below
- Used for: Accounts, Flows
- Features: Stat cards, filterable/sortable table, density toggle

#### Template C: Template Library Page
- Section headers with card grids
- Used for: Decisions, Life Events
- Features: Category filtering, search, dense card grid

### 4.2 File: `components/layout/CockpitLayout.tsx`

```tsx
import { cn } from '@/lib/utils';
import { SPACING } from '@/lib/design-tokens';
import { ReactNode } from 'react';

interface CockpitLayoutProps {
  /** Main content area */
  children: ReactNode;
  /** Right sidebar content (optional) */
  sidebar?: ReactNode;
  /** Context bar (renders above main content) */
  contextBar?: ReactNode;
  /** Additional classes for main area */
  className?: string;
}

export function CockpitLayout({
  children,
  sidebar,
  contextBar,
  className,
}: CockpitLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Context bar (sticky) */}
      {contextBar}
      
      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <main className={cn('flex-1 overflow-auto', SPACING.pageGutter, className)}>
          {children}
        </main>
        
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-80 shrink-0 border-l border-border overflow-auto">
            <div className={SPACING.pageGutter}>{sidebar}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
```

### 4.3 File: `components/layout/ControlListLayout.tsx`

```tsx
import { cn } from '@/lib/utils';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { ReactNode } from 'react';

interface ControlListLayoutProps {
  /** Page title */
  title: string;
  /** Page subtitle */
  subtitle?: string;
  /** Header actions (right side) */
  actions?: ReactNode;
  /** Stat cards section */
  stats?: ReactNode;
  /** Table controls (filters, density toggle, etc.) */
  tableControls?: ReactNode;
  /** Table content */
  children: ReactNode;
  /** Additional classes */
  className?: string;
}

export function ControlListLayout({
  title,
  subtitle,
  actions,
  stats,
  tableControls,
  children,
  className,
}: ControlListLayoutProps) {
  return (
    <div className={cn(SPACING.pageGutter, SPACING.sectionGap, className)}>
      {/* Page header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className={TYPOGRAPHY.pageTitle}>{title}</h1>
          {subtitle && <p className={cn(TYPOGRAPHY.pageSubtitle, 'mt-1')}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      
      {/* Stats strip */}
      {stats && <div className="grid grid-cols-3 gap-4">{stats}</div>}
      
      {/* Table section */}
      <div className="space-y-3">
        {tableControls && (
          <div className="flex items-center justify-between gap-4">
            {tableControls}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
```

---

## 5. Page-by-Page Refactors

### 5.1 Dashboard Page

**File:** `app/(app)/dashboard/page.tsx` (or equivalent)

#### Current Issues (from screenshots):
1. Shows $0.00 values with "Positive" badges when data fails to load
2. Error banner is good but should be collapsible
3. Six large metric cards take up viewport without synthesis
4. Empty chart just shows "No historical data" passively
5. Sidebar suggestions feel decorative, not actionable

#### Required Changes:

**A) Replace StatCard grid with `StatusAnnunciator` + focused metrics**

```tsx
// Before: 6 large cards
<div className="grid grid-cols-3 gap-4">
  <StatCard label="Net Worth" value="$0.00" status="Positive" />
  {/* ...5 more */}
</div>

// After: Annunciator + 2-3 key metrics
<div className="flex items-start justify-between gap-6">
  {/* Primary metric */}
  <MetricCard
    label="Net Worth"
    value={formatCurrency(data.netWorth)}
    tone={data.netWorthStatus}
    statusLabel={data.netWorthStatusLabel}
    delta={data.netWorthDelta ? {
      value: formatCurrencySigned(data.netWorthDelta),
      direction: deriveDeltaDirection(data.netWorthDelta),
      tone: deriveDeltaStatus(data.netWorthDelta, 'up'),
    } : undefined}
    icon={TrendingUp}
  />
  
  {/* Secondary metrics */}
  <MetricCard
    label="Monthly Surplus"
    value={formatCurrency(data.surplus)}
    tone={data.surplusStatus}
    icon={ArrowUpRight}
  />
  
  {/* Status annunciator for all metrics */}
  <StatusAnnunciator
    items={[
      { code: 'NW', label: 'Net Worth', tone: data.netWorthStatus, value: formatCurrency(data.netWorth) },
      { code: 'CF', label: 'Cash Flow', tone: data.cashFlowStatus, value: formatCurrency(data.surplus) },
      { code: 'LQ', label: 'Liquidity', tone: data.liquidityStatus, value: formatMonths(data.liquidityMonths) },
      { code: 'SR', label: 'Savings Rate', tone: data.savingsRateStatus, value: formatPercent(data.savingsRate) },
      { code: 'DS', label: 'DSCR', tone: data.dscrStatus, value: formatRatio(data.dscr) },
      { code: 'DT', label: 'Total Debt', tone: data.debtStatus, value: formatCurrency(data.totalDebt) },
    ]}
  />
</div>
```

**B) Error state must invalidate affected instruments**

```tsx
// When data fails to load, don't show fake values with real badges
{error ? (
  <>
    <SystemAlert
      tone="critical"
      title="Error loading data"
      description="Some dashboard data failed to load. Please try refreshing the page."
      action={{ label: 'Refresh', onClick: () => window.location.reload() }}
      collapsible
    />
    
    {/* Gray out / invalidate metrics */}
    <div className="opacity-50 pointer-events-none">
      <MetricCard
        label="Net Worth"
        value="—"
        tone="neutral"
        statusLabel="Data unavailable"
      />
      {/* ... */}
    </div>
  </>
) : (
  // Normal rendering
)}
```

**C) Empty dashboard becomes guided setup**

```tsx
{!hasData ? (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 rounded-full bg-primary/10 mb-4">
      <Rocket className="h-8 w-8 text-primary" />
    </div>
    <h2 className={TYPOGRAPHY.sectionTitle}>Set up your financial cockpit</h2>
    <p className="text-muted-foreground mt-2 max-w-md">
      Add your accounts and income to start tracking your financial health.
    </p>
    <div className="flex gap-3 mt-6">
      <Button onClick={() => router.push('/accounts/new')}>
        <Plus className="h-4 w-4 mr-2" />
        Add Account
      </Button>
      <Button variant="outline" onClick={() => router.push('/flows/new')}>
        <Plus className="h-4 w-4 mr-2" />
        Add Income
      </Button>
    </div>
  </div>
) : (
  // Normal dashboard
)}
```

**D) Chart must have goal lines and proper formatting**

```tsx
<InstrumentPanel
  title="Net Worth Trajectory"
  subtitle="12-month projection"
  controls={
    <Select value={chartHorizon} onValueChange={setChartHorizon}>
      <SelectTrigger className="w-24 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="12">1 Year</SelectItem>
        <SelectItem value="60">5 Years</SelectItem>
      </SelectContent>
    </Select>
  }
>
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={projectionData}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis
        dataKey="month"
        tickFormatter={(m) => formatProjectionMonth(m, startDate)}
        tick={{ fontSize: 11 }}
      />
      <YAxis
        tickFormatter={(v) => formatCurrencyCompact(v)}
        width={70}
        tick={{ fontSize: 11 }}
      />
      <Tooltip
        formatter={(v: number) => formatCurrency(v)}
        labelFormatter={(m) => formatProjectionMonth(m, startDate)}
      />
      
      {/* Goal line */}
      {retirementGoal && (
        <GoalLine
          value={retirementGoal}
          label="Retirement Goal"
          tone="info"
        />
      )}
      
      <Area
        type="monotone"
        dataKey="netWorth"
        stroke="hsl(var(--primary))"
        fill="hsl(var(--primary) / 0.1)"
        strokeWidth={2}
      />
    </AreaChart>
  </ResponsiveContainer>
</InstrumentPanel>
```

---

### 5.2 Scenarios Index Page

**File:** `app/(app)/scenarios/page.tsx`

#### Current Issues:
1. Cards show provenance, not outcomes
2. No comparison affordance (must click separate button)
3. No freshness/validity indicators
4. Baseline isn't visually distinguished enough

#### Required Changes:

**A) Replace basic cards with `ScenarioTile`**

```tsx
export default function ScenariosPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };
  
  return (
    <ControlListLayout
      title="Scenarios"
      subtitle="Model financial what-if scenarios and compare outcomes"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/scenarios/compare')}>
            Compare Scenarios
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button onClick={() => router.push('/scenarios/new')}>
            <Plus className="h-4 w-4 mr-1" />
            New Scenario
          </Button>
        </div>
      }
    >
      {/* Baseline - always first, visually distinct */}
      <div className="mb-6">
        <h2 className={cn(TYPOGRAPHY.sectionTitle, 'mb-3')}>Baseline</h2>
        <ScenarioTile
          id={baseline.id}
          name={baseline.name}
          description="Baseline projection from current state"
          isBaseline
          horizonMonths={baseline.horizonMonths}
          lastRun={baseline.lastRun}
          metrics={{
            netWorth: baseline.netWorth,
            surplus: baseline.surplus,
            liquidity: baseline.liquidity,
          }}
          onOpen={() => router.push(`/scenarios/${baseline.id}`)}
        />
      </div>
      
      {/* Scenarios grid */}
      <div>
        <h2 className={cn(TYPOGRAPHY.sectionTitle, 'mb-3')}>
          Scenarios ({scenarios.length})
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {scenarios.map(scenario => (
            <ScenarioTile
              key={scenario.id}
              id={scenario.id}
              name={scenario.name}
              description={scenario.description}
              horizonMonths={scenario.horizonMonths}
              lastRun={scenario.lastRun}
              status={scenario.status}
              metrics={{
                netWorth: scenario.netWorth,
                netWorthDelta: scenario.netWorth - baseline.netWorth,
                surplus: scenario.surplus,
                surplusDelta: scenario.surplus - baseline.surplus,
                liquidity: scenario.liquidity,
              }}
              isSelected={selectedIds.has(scenario.id)}
              onSelectionChange={() => toggleSelection(scenario.id)}
              onOpen={() => router.push(`/scenarios/${scenario.id}`)}
            />
          ))}
        </div>
      </div>
      
      {/* Sticky compare bar */}
      <CompareSelectionBar
        selectedCount={selectedIds.size}
        visible={selectedIds.size > 0}
        onCompare={() => router.push(`/scenarios/compare?ids=${Array.from(selectedIds).join(',')}`)}
        onClear={() => setSelectedIds(new Set())}
      />
    </ControlListLayout>
  );
}
```

---

### 5.3 Scenario Detail Page (Projection Tab)

**File:** `app/(app)/scenarios/[id]/page.tsx`

#### Current Issues:
1. Y-axis shows "000.00" — critical formatting bug
2. Legend inside chart competes with data
3. Table uses "M1, M2, M3" instead of real dates
4. No hover details or threshold lines
5. No context bar

#### Required Changes:

**A) Add ScenarioContextBar**

```tsx
<CockpitLayout
  contextBar={
    <ScenarioContextBar
      scenarioName={scenario.name}
      baselineName={baseline.name}
      status={{ tone: scenario.statusTone, label: scenario.statusLabel }}
      horizon={String(scenario.horizonMonths) as any}
      onHorizonChange={(h) => updateHorizon(parseInt(h))}
      onRunProjection={handleRunProjection}
      onAddChange={() => setShowAddChange(true)}
      onLifeEvent={() => setShowLifeEvent(true)}
      isRunning={isProjectionRunning}
    />
  }
>
  {/* Tab content */}
</CockpitLayout>
```

**B) Fix chart formatting**

```tsx
<InstrumentPanel
  title="Net Worth Projection"
  subtitle={`${scenario.horizonMonths}-month forecast`}
  controls={
    <div className="flex items-center gap-2">
      {/* Chart type toggle */}
      <ToggleGroup type="single" value={chartType} onValueChange={setChartType}>
        <ToggleGroupItem value="area" className="h-8 w-8 p-0">
          <AreaChartIcon className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="line" className="h-8 w-8 p-0">
          <LineChartIcon className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      
      {/* Scenario toggles (move legend to controls) */}
      <div className="flex items-center gap-3 ml-3">
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span>{scenario.name}</span>
        </label>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <div className="h-3 w-3 rounded-sm bg-muted-foreground/50" />
          <span>{baseline.name}</span>
        </label>
      </div>
    </div>
  }
  footer={
    goals.length > 0 && (
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">Thresholds:</span>
        {goals.map(goal => (
          <span key={goal.id} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', STATUS_COLORS[goal.tone].bgSolid)} />
            {goal.label}: {formatCurrencyCompact(goal.value)}
          </span>
        ))}
      </div>
    )
  }
  noPadding
>
  <ResponsiveContainer width="100%" height={350}>
    <AreaChart data={projectionData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
      
      <XAxis
        dataKey="monthIndex"
        tickFormatter={(m) => formatProjectionMonth(m, scenario.startDate)}
        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
        tickLine={{ stroke: 'hsl(var(--border))' }}
      />
      
      {/* CRITICAL: Use formatCurrencyCompact for Y-axis */}
      <YAxis
        tickFormatter={(v) => formatCurrencyCompact(v)}
        width={75}
        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        axisLine={{ stroke: 'hsl(var(--border))' }}
        tickLine={{ stroke: 'hsl(var(--border))' }}
      />
      
      <Tooltip
        content={({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          return (
            <div className="rounded-lg border bg-card p-3 shadow-lg">
              <p className="font-medium mb-2">
                {formatProjectionMonth(label, scenario.startDate)}
              </p>
              {payload.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(entry.value as number)}
                  </span>
                </div>
              ))}
            </div>
          );
        }}
      />
      
      {/* Goal lines */}
      {goals.map(goal => (
        <GoalLine
          key={goal.id}
          value={goal.value}
          label={goal.label}
          tone={goal.tone}
        />
      ))}
      
      {/* Baseline area (behind) */}
      <Area
        type="monotone"
        dataKey="baselineNetWorth"
        name={baseline.name}
        stroke="hsl(var(--muted-foreground) / 0.5)"
        fill="hsl(var(--muted-foreground) / 0.1)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      
      {/* Scenario area (front) */}
      <Area
        type="monotone"
        dataKey="scenarioNetWorth"
        name={scenario.name}
        stroke="hsl(var(--primary))"
        fill="hsl(var(--primary) / 0.15)"
        strokeWidth={2}
      />
    </AreaChart>
  </ResponsiveContainer>
</InstrumentPanel>
```

**C) Fix table with real dates and proper alignment**

```tsx
<InstrumentPanel
  title="Projection Details"
  controls={
    <TableDensityToggle value={density} onChange={setDensity} />
  }
>
  <div className="overflow-auto max-h-[400px]">
    <table className="w-full">
      <thead className="sticky top-0 bg-card z-10">
        <tr className={cn('border-b border-border', TYPOGRAPHY.tableHeader)}>
          <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-left')}>Month</th>
          <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Net Worth</th>
          <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Income</th>
          <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Expenses</th>
          <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Cash Flow</th>
          <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>DSCR</th>
          <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Savings Rate</th>
        </tr>
      </thead>
      <tbody>
        {projectionData.map((row, i) => (
          <tr
            key={row.monthIndex}
            className={cn(
              'border-b border-border/40 hover:bg-muted/30 transition-colors',
              DENSITY[density].text
            )}
          >
            <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'font-medium')}>
              {formatProjectionMonth(row.monthIndex, scenario.startDate)}
            </td>
            <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums font-semibold')}>
              {formatCurrency(row.netWorth)}
            </td>
            <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums')}>
              {formatCurrency(row.income)}
            </td>
            <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums')}>
              {formatCurrency(row.expenses)}
            </td>
            <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums')}>
              {formatCurrency(row.cashFlow)}
            </td>
            <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums')}>
              {formatRatio(row.dscr)}
            </td>
            <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums')}>
              {formatPercent(row.savingsRate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</InstrumentPanel>
```

---

### 5.4 Scenario Detail Page (Compare Tab)

**File:** `app/(app)/scenarios/[id]/compare/page.tsx` or tab component

#### Current Issues:
1. Toggle pills are ambiguous (which is scenario vs baseline?)
2. Deltas are rightmost column (should be primary)
3. Column headers repeat on every row
4. Icons are decorative noise
5. Only 1-year milestone shown
6. Missing "why" explanation (drivers)

#### Required Changes:

**A) Add milestone summary cards**

```tsx
<div className="grid grid-cols-3 gap-4 mb-6">
  {milestones.map(milestone => (
    <div
      key={milestone.horizon}
      className={cn(
        SURFACE.card,
        'p-4 border-l-2',
        STATUS_COLORS[milestone.tone].border.replace('border-', 'border-l-')
      )}
    >
      <div className="text-sm text-muted-foreground mb-1">{milestone.label}</div>
      <div className="flex items-center gap-2">
        <DeltaPill
          value={formatCurrencySigned(milestone.netWorthDelta)}
          direction={deriveDeltaDirection(milestone.netWorthDelta)}
          tone={milestone.tone}
          size="lg"
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Net worth: {formatCurrency(milestone.scenarioNetWorth)}
      </div>
    </div>
  ))}
</div>
```

**B) Clear scenario selector in header**

```tsx
<InstrumentPanel
  title="Milestone Comparison"
  subtitle={`${scenario.name} vs ${baseline.name}`}
  controls={
    <div className="flex items-center gap-2">
      {/* Clear A vs B display */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm font-medium">
        <span className="h-2 w-2 rounded-full bg-primary" />
        {scenario.name}
      </div>
      <span className="text-muted-foreground">vs</span>
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        {baseline.name}
      </div>
    </div>
  }
>
  {/* Milestone tabs */}
  <Tabs value={activeMilestone} onValueChange={setActiveMilestone} className="mb-4">
    <TabsList>
      <TabsTrigger value="12">1 Year</TabsTrigger>
      <TabsTrigger value="60">5 Years</TabsTrigger>
      <TabsTrigger value="retirement">Retirement</TabsTrigger>
    </TabsList>
  </Tabs>
  
  {/* Header row - only once */}
  <MetricRowHeader />
  
  {/* Metric rows - delta first */}
  <div className="divide-y divide-border/40">
    <MetricRow
      label="Net Worth"
      baseline={comparison.baseline.netWorth}
      scenario={comparison.scenario.netWorth}
      format="currency"
      goodDirection="up"
    />
    <MetricRow
      label="Monthly Income"
      baseline={comparison.baseline.monthlyIncome}
      scenario={comparison.scenario.monthlyIncome}
      format="currency"
      goodDirection="up"
    />
    <MetricRow
      label="Monthly Expenses"
      baseline={comparison.baseline.monthlyExpenses}
      scenario={comparison.scenario.monthlyExpenses}
      format="currency"
      goodDirection="down"
    />
    <MetricRow
      label="Net Cash Flow"
      baseline={comparison.baseline.netCashFlow}
      scenario={comparison.scenario.netCashFlow}
      format="currency"
      goodDirection="up"
    />
    <MetricRow
      label="Retirement Assets"
      baseline={comparison.baseline.retirementAssets}
      scenario={comparison.scenario.retirementAssets}
      format="currency"
      goodDirection="up"
    />
    <MetricRow
      label="Liquid Assets"
      baseline={comparison.baseline.liquidAssets}
      scenario={comparison.scenario.liquidAssets}
      format="currency"
      goodDirection="up"
    />
    <MetricRow
      label="Liquidity"
      baseline={comparison.baseline.liquidityMonths}
      scenario={comparison.scenario.liquidityMonths}
      format="months"
      goodDirection="up"
    />
    <MetricRow
      label="Savings Rate"
      baseline={comparison.baseline.savingsRate}
      scenario={comparison.scenario.savingsRate}
      format="percent"
      goodDirection="up"
    />
  </div>
</InstrumentPanel>
```

**C) Add drivers block**

```tsx
<DriversBlock
  title="What's driving the difference"
  drivers={[
    {
      label: '401(k) contribution increase',
      impact: 8250,
      tone: 'good',
      icon: TrendingUp,
    },
    {
      label: 'Healthcare premium increase',
      impact: -725,
      tone: 'critical',
      recurring: true,
    },
    {
      label: 'Reduced liquid assets (shifted to retirement)',
      impact: -15950,
      tone: 'warning',
    },
  ]}
/>
```

---

### 5.5 Accounts Page

**File:** `app/(app)/accounts/page.tsx`

#### Current Issues:
1. Refresh icons on every row create clutter
2. No data freshness indication
3. No account health signals
4. System accounts visible

#### Required Changes:

```tsx
export default function AccountsPage() {
  const [density, setDensity] = useState<DensityMode>('compact');
  
  // Filter out system accounts
  const visibleAssets = assets.filter(a => a.institution !== 'System');
  
  return (
    <ControlListLayout
      title="Accounts"
      subtitle="Manage your assets and liabilities"
      actions={
        <Button onClick={() => router.push('/accounts/new')}>
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      }
      stats={
        <>
          <MetricCard
            label="Total Assets"
            value={formatCurrency(totals.assets)}
            tone="good"
            icon={TrendingUp}
          />
          <MetricCard
            label="Total Liabilities"
            value={formatCurrency(totals.liabilities)}
            tone={totals.liabilities > 0 ? 'warning' : 'neutral'}
            icon={TrendingDown}
          />
          <MetricCard
            label="Net Worth"
            value={formatCurrency(totals.netWorth)}
            tone={totals.netWorth > 0 ? 'good' : 'critical'}
            icon={Wallet}
          />
        </>
      }
      tableControls={
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="h-8"
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isRefreshing && 'animate-spin')} />
            Refresh All
          </Button>
          <TableDensityToggle value={density} onChange={setDensity} />
        </div>
      }
    >
      {/* Assets table */}
      <InstrumentPanel title="Assets" subtitle={`${visibleAssets.length} accounts`}>
        <table className="w-full">
          <thead>
            <tr className={cn('border-b border-border', TYPOGRAPHY.tableHeader)}>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-left')}>Account</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-left')}>Type</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-left')}>Institution</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Balance</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Updated</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'w-10')}></th>
            </tr>
          </thead>
          <tbody>
            {visibleAssets.map(account => (
              <tr
                key={account.id}
                className={cn(
                  'border-b border-border/40 group hover:bg-muted/30 transition-colors',
                  DENSITY[density].text
                )}
              >
                <td className={cn(DENSITY[density].cell, DENSITY[density].row)}>
                  <div className="flex items-center gap-2">
                    <AccountIcon type={account.type} className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{account.name}</span>
                  </div>
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-muted-foreground')}>
                  {account.typeLabel}
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-muted-foreground')}>
                  {account.institution || '—'}
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums font-semibold')}>
                  {formatCurrency(account.balance)}
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>
                  <FreshnessIndicator lastUpdated={account.updatedAt} />
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row)}>
                  {/* Actions appear on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRefresh(account.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(account.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </InstrumentPanel>
      
      {/* Liabilities table - similar structure */}
    </ControlListLayout>
  );
}
```

---

### 5.6 Flows Page

**File:** `app/(app)/flows/page.tsx`

#### Current Issues:
1. "Active" badges are meaningless (all rows have them)
2. Two amount columns confuse (Amount vs Monthly)
3. No flow visualization

#### Required Changes:

```tsx
export default function FlowsPage() {
  const [density, setDensity] = useState<DensityMode>('compact');
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'transfers'>('income');
  
  return (
    <ControlListLayout
      title="Cash Flows"
      subtitle="Manage your recurring income and expenses"
      actions={
        <Button onClick={() => router.push(`/flows/new?type=${activeTab}`)}>
          <Plus className="h-4 w-4 mr-1" />
          Add {activeTab === 'income' ? 'Income' : activeTab === 'expenses' ? 'Expense' : 'Transfer'}
        </Button>
      }
      stats={
        <>
          <MetricCard
            label="Monthly Income"
            value={formatCurrency(totals.income)}
            tone="good"
            icon={ArrowDownLeft}
          />
          <MetricCard
            label="Monthly Expenses"
            value={formatCurrency(totals.expenses)}
            tone="neutral" // Not red! Expenses aren't bad by default
            icon={ArrowUpRight}
          />
          <MetricCard
            label="Monthly Surplus"
            value={formatCurrency(totals.surplus)}
            tone={totals.surplus > 0 ? 'good' : totals.surplus < 0 ? 'critical' : 'neutral'}
            icon={Scale}
          />
        </>
      }
      tableControls={
        <div className="flex items-center justify-between w-full">
          {/* Tabs with totals, not counts */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="income">
                Income ({formatCurrencyCompact(totals.income)})
              </TabsTrigger>
              <TabsTrigger value="expenses">
                Expenses ({formatCurrencyCompact(totals.expenses)})
              </TabsTrigger>
              <TabsTrigger value="transfers">
                Transfers ({transfers.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <TableDensityToggle value={density} onChange={setDensity} />
        </div>
      }
    >
      <InstrumentPanel title={activeTab === 'income' ? 'Income Sources' : activeTab === 'expenses' ? 'Expense Categories' : 'Transfers'}>
        <table className="w-full">
          <thead>
            <tr className={cn('border-b border-border', TYPOGRAPHY.tableHeader)}>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-left')}>Name</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-left')}>Category</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Amount</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-left')}>Frequency</th>
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right')}>Monthly</th>
              {/* Remove meaningless "Status" column if all are Active */}
              {/* Only show status if there are inactive items */}
              {hasInactiveItems && (
                <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-center')}>Status</th>
              )}
              <th className={cn(DENSITY[density].cell, DENSITY[density].row, 'w-10')}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                className={cn(
                  'border-b border-border/40 group hover:bg-muted/30 transition-colors',
                  DENSITY[density].text,
                  !item.isActive && 'opacity-50'
                )}
              >
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'font-medium')}>
                  {item.name}
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-muted-foreground')}>
                  {item.category}
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums')}>
                  {formatCurrency(item.amount)}
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-muted-foreground')}>
                  {item.frequency}
                </td>
                <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-right tabular-nums font-semibold')}>
                  {formatCurrency(item.monthlyAmount)}
                </td>
                {hasInactiveItems && (
                  <td className={cn(DENSITY[density].cell, DENSITY[density].row, 'text-center')}>
                    {!item.isActive && (
                      <StatusBadge tone="neutral" label="Inactive" />
                    )}
                  </td>
                )}
                <td className={cn(DENSITY[density].cell, DENSITY[density].row)}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(item.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleActive(item.id)}
                    >
                      {item.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </InstrumentPanel>
    </ControlListLayout>
  );
}
```

---

### 5.7 Decisions Page

**File:** `app/(app)/decisions/page.tsx`

#### Current Issues:
1. No prioritization or guidance
2. No impact preview
3. Unbalanced density
4. No search or filter
5. Section headers are passive

#### Required Changes:

```tsx
export default function DecisionsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const filteredDecisions = decisions.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory && d.category !== activeCategory) return false;
    return true;
  });
  
  const groupedDecisions = groupBy(filteredDecisions, 'category');
  
  return (
    <div className={cn(SPACING.pageGutter, SPACING.sectionGap)}>
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className={TYPOGRAPHY.pageTitle}>Decisions</h1>
          <p className={cn(TYPOGRAPHY.pageSubtitle, 'mt-1')}>
            Model financial decisions and see how they impact your future
          </p>
        </div>
      </header>
      
      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decisions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Category filter pills */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(null)}
            className="h-8"
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
              className="h-8"
            >
              <cat.icon className="h-4 w-4 mr-1" />
              {cat.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Recommended section (contextual) */}
      {!search && !activeCategory && recommendedDecisions.length > 0 && (
        <section>
          <h2 className={cn(TYPOGRAPHY.sectionTitle, 'mb-3 flex items-center gap-2')}>
            <Sparkles className="h-4 w-4 text-primary" />
            Recommended for you
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {recommendedDecisions.map(decision => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                variant="featured"
                onClick={() => handleStartDecision(decision.id)}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Decision categories */}
      {Object.entries(groupedDecisions).map(([category, categoryDecisions]) => {
        const categoryInfo = categories.find(c => c.id === category);
        const CategoryIcon = categoryInfo?.icon || Folder;
        
        return (
          <section key={category}>
            <h2 className={cn(TYPOGRAPHY.sectionTitle, 'mb-3 flex items-center gap-2')}>
              <CategoryIcon className="h-4 w-4" />
              {categoryInfo?.label || category}
              <span className="text-muted-foreground font-normal">
                ({categoryDecisions.length})
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {categoryDecisions.map(decision => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  onClick={() => handleStartDecision(decision.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// Decision card component
function DecisionCard({
  decision,
  variant = 'default',
  onClick,
}: {
  decision: Decision;
  variant?: 'default' | 'featured';
  onClick: () => void;
}) {
  const Icon = decision.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        SURFACE.cardInteractive,
        'p-4 text-left flex flex-col',
        variant === 'featured' && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3 mb-2">
        <div className={cn(
          'p-2 rounded-lg',
          variant === 'featured' ? 'bg-primary/10' : 'bg-muted/60'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            variant === 'featured' ? 'text-primary' : 'text-muted-foreground'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{decision.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {decision.description}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
      
      {/* Impact indicator */}
      {decision.typicalImpact && (
        <div className="mt-auto pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground">Typical impact: </span>
          <span className="text-xs font-medium">{decision.typicalImpact}</span>
        </div>
      )}
    </button>
  );
}
```

---

### 5.8 Life Event Modal

**File:** `components/modals/LifeEventModal.tsx`

#### Current Issues:
1. No search
2. No keyboard navigation
3. Cards are too tall (only ~3 visible)
4. No preview

#### Required Changes:

```tsx
export function LifeEventModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(categories[0].id);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  
  const filteredTemplates = templates.filter(t => {
    if (search) {
      return t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    }
    return t.category === activeCategory;
  });
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredTemplates.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTemplates[selectedIndex]) {
            onSelect(filteredTemplates[selectedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredTemplates, selectedIndex]);
  
  // Reset selection when filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search, activeCategory]);
  
  const selectedTemplate = filteredTemplates[selectedIndex];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Add Life Event</DialogTitle>
          <DialogDescription>
            Choose a life event template to quickly add common changes to your scenario
          </DialogDescription>
        </DialogHeader>
        
        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search life events... (↑↓ to navigate, Enter to select)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
        
        <div className="flex flex-1 min-h-0">
          {/* Left: Categories (when not searching) */}
          {!search && (
            <div className="w-48 shrink-0 border-r p-2 overflow-auto">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    activeCategory === cat.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </button>
              ))}
            </div>
          )}
          
          {/* Center: Template list */}
          <div className="flex-1 min-w-0 p-2 overflow-auto">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm text-muted-foreground">
                {filteredTemplates.length} templates
              </span>
              <ToggleGroup type="single" value={viewMode} onValueChange={v => v && setViewMode(v as any)}>
                <ToggleGroupItem value="list" className="h-7 w-7 p-0">
                  <List className="h-3.5 w-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem value="cards" className="h-7 w-7 p-0">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {viewMode === 'list' ? (
              <div className="space-y-1">
                {filteredTemplates.map((template, i) => (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template.id)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      i === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <template.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{template.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredTemplates.map((template, i) => (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template.id)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      SURFACE.cardInteractive,
                      'p-3 text-left',
                      i === selectedIndex && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <template.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{template.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Preview panel */}
          {selectedTemplate && (
            <div className="w-72 shrink-0 border-l p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <selectedTemplate.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{selectedTemplate.name}</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {selectedTemplate.description}
              </p>
              
              {/* Changes preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Will create changes for:
                </h4>
                <ul className="space-y-1">
                  {selectedTemplate.changes.map((change, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button
                className="w-full mt-4"
                onClick={() => onSelect(selectedTemplate.id)}
              >
                Use Template
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Chart System Overhaul

### 6.1 Global Chart Formatting Fix

**CRITICAL:** All charts must use `formatCurrencyCompact()` for Y-axis ticks. The "000.00" bug must be eliminated.

**File:** `lib/chart-config.ts`

```typescript
import { formatCurrencyCompact, formatPercent, formatMonthYear } from './format';
import { CHART_COLORS } from './design-tokens';

/**
 * Standard Y-axis props for currency charts
 */
export const currencyYAxisProps = {
  tickFormatter: (value: number) => formatCurrencyCompact(value),
  width: 70,
  tick: {
    fontSize: 11,
    fill: 'hsl(var(--muted-foreground))',
  },
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: { stroke: 'hsl(var(--border))' },
};

/**
 * Standard Y-axis props for percentage charts
 */
export const percentYAxisProps = {
  tickFormatter: (value: number) => formatPercent(value),
  width: 50,
  tick: {
    fontSize: 11,
    fill: 'hsl(var(--muted-foreground))',
  },
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: { stroke: 'hsl(var(--border))' },
};

/**
 * Standard X-axis props for time series
 */
export const timeXAxisProps = {
  tick: {
    fontSize: 11,
    fill: 'hsl(var(--muted-foreground))',
  },
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: { stroke: 'hsl(var(--border))' },
};

/**
 * Standard grid props
 */
export const gridProps = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--border) / 0.5)',
};

/**
 * Standard tooltip style
 */
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
  labelStyle: {
    fontWeight: 600,
    marginBottom: '4px',
  },
};
```

### 6.2 Usage Pattern

Every chart in the application MUST follow this pattern:

```tsx
import {
  currencyYAxisProps,
  timeXAxisProps,
  gridProps,
  tooltipStyle,
} from '@/lib/chart-config';
import { formatCurrency, formatProjectionMonth } from '@/lib/format';

<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data}>
    <CartesianGrid {...gridProps} />
    <XAxis
      dataKey="monthIndex"
      tickFormatter={(m) => formatProjectionMonth(m, startDate)}
      {...timeXAxisProps}
    />
    <YAxis {...currencyYAxisProps} />
    <Tooltip
      {...tooltipStyle}
      formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
      labelFormatter={(m) => formatProjectionMonth(m, startDate)}
    />
    <Area
      type="monotone"
      dataKey="netWorth"
      stroke="hsl(var(--primary))"
      fill="hsl(var(--primary) / 0.15)"
      strokeWidth={2}
    />
  </AreaChart>
</ResponsiveContainer>
```

---

## 7. Status & Color Semantics

### 7.1 Color Rules

**Rule 1:** Color means status, not decoration
- Green = good/positive status
- Amber/Yellow = warning/watch status
- Red = critical/problem status
- Gray = neutral/inactive status

**Rule 2:** Use primary accent (purple) only for interactive elements
- Buttons
- Links
- Selected states
- Focus rings

**Rule 3:** Don't color-code by category
- Expenses are NOT automatically red
- Income is NOT automatically green
- Color is applied based on whether the VALUE is good/bad relative to goals

### 7.2 Application Examples

```tsx
// WRONG: Expenses value is red just because it's expenses
<MetricCard
  label="Monthly Expenses"
  value={formatCurrency(expenses)}
  className="text-red-500"  // ❌ Don't do this
/>

// RIGHT: Expenses value is neutral; delta uses status color
<MetricCard
  label="Monthly Expenses"
  value={formatCurrency(expenses)}  // Neutral color
  tone="neutral"  // ✓ Correct
  delta={{
    value: formatCurrencySigned(expensesDelta),
    direction: deriveDeltaDirection(expensesDelta),
    // If expenses went UP, that's bad → critical
    // If expenses went DOWN, that's good → good
    tone: deriveDeltaStatus(expensesDelta, 'down'),
  }}
/>
```

---

## 8. Accessibility & Keyboard

### 8.1 Requirements

1. **All primary actions reachable by keyboard**
   - Tab navigation works logically
   - Enter/Space activates buttons and interactive cards
   - Escape closes modals

2. **Focus states visible**
   - All focusable elements have visible focus ring
   - Use `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

3. **Modal keyboard support**
   - Arrow keys navigate list items
   - Typeahead/search filters immediately
   - Focus trapped within modal

4. **Screen reader support**
   - Semantic HTML (buttons, headings, lists)
   - ARIA labels for icon-only buttons
   - Status changes announced

### 8.2 Implementation Checklist

- [ ] All `<Button>` components use semantic `<button>` element
- [ ] Interactive cards have `role="button"` and `tabIndex={0}`
- [ ] Icon-only buttons have `aria-label`
- [ ] Status badges have `role="status"` or similar
- [ ] Modals use `Dialog` component with proper focus management
- [ ] Tables have proper `<thead>` and `<th scope>` attributes

---

## 9. Implementation Order

Execute in this order to minimize conflicts and enable incremental testing:

### Phase 1: Foundation (Day 1)
1. Create `lib/design-tokens.ts`
2. Create/update `lib/format.ts` with all formatters
3. Create `lib/status.ts` with status derivation utilities
4. Create `lib/chart-config.ts` with chart standards

### Phase 2: Core Components (Day 1-2)
5. Create `StatusBadge`
6. Create `DeltaPill`
7. Create `FreshnessIndicator`
8. Create `StatusAnnunciator`
9. Create `MetricCard`
10. Create `MetricRow` + `MetricRowHeader`

### Phase 3: Layout Components (Day 2)
11. Create `InstrumentPanel`
12. Create `ScenarioContextBar`
13. Create `SystemAlert`
14. Create `DriversBlock`
15. Create `TableDensityToggle`
16. Create `CockpitLayout` and `ControlListLayout`

### Phase 4: Scenario Components (Day 2-3)
17. Create `ScenarioTile`
18. Create `CompareSelectionBar`
19. Create `GoalLine`

### Phase 5: Page Refactors (Day 3-5)
20. Refactor Dashboard page
21. Refactor Scenarios index page
22. Refactor Scenario detail page (Projection tab)
23. Refactor Scenario detail page (Compare tab)
24. Refactor Accounts page
25. Refactor Flows page
26. Refactor Decisions page
27. Refactor Life Event modal

### Phase 6: Polish (Day 5-6)
28. Global chart formatting audit (fix any remaining "000.00")
29. Dark mode verification on all pages
30. Keyboard navigation testing
31. Loading states and error boundaries
32. Final density and spacing pass

---

## 10. Acceptance Criteria

### 10.1 Visual Criteria

- [ ] Every page uses `PageShell` / layout templates
- [ ] No raw numeric formatting (all use `lib/format.ts`)
- [ ] Charts NEVER show "000.00" on axes
- [ ] All numbers are right-aligned and use `tabular-nums`
- [ ] Status colors are consistent across all pages
- [ ] Dark mode looks intentional (not washed gray)
- [ ] Density defaults to "compact" for tables

### 10.2 Functional Criteria

- [ ] Scenario context bar appears on all scenario-related pages
- [ ] Delta-first comparison layout on Compare tab
- [ ] Milestone cards show 1yr, 5yr, and retirement horizons
- [ ] Drivers block explains what's causing deltas
- [ ] Scenario tiles show key metrics and deltas
- [ ] Multi-select comparison works with sticky bar
- [ ] Life Event modal has search and keyboard navigation
- [ ] Tables have density toggle and sticky headers

### 10.3 Technical Criteria

- [ ] No Tailwind class drift (use design tokens)
- [ ] All status derivation uses `lib/status.ts`
- [ ] All formatting uses `lib/format.ts`
- [ ] Chart config uses `lib/chart-config.ts`
- [ ] Components use design tokens from `lib/design-tokens.ts`
- [ ] No `toFixed()` or manual number formatting in components
- [ ] Lighthouse: no layout shift from error banners

### 10.4 Accessibility Criteria

- [ ] All primary actions reachable by keyboard
- [ ] Focus states visible on all interactive elements
- [ ] Modal keyboard navigation works (arrows, Enter, Escape)
- [ ] Screen reader can navigate all content
- [ ] Color is not the only means of conveying status

---

## Appendix A: Component Import Cheatsheet

```typescript
// Design system
import { TYPOGRAPHY, SPACING, DENSITY, SURFACE, STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { formatCurrency, formatCurrencyCompact, formatCurrencySigned, formatPercent, formatRatio, formatMonths, formatRelativeTime, formatProjectionMonth } from '@/lib/format';
import { deriveStatus, deriveDeltaStatus, deriveDeltaDirection, deriveFreshnessStatus, METRIC_THRESHOLDS } from '@/lib/status';
import { currencyYAxisProps, timeXAxisProps, gridProps, tooltipStyle } from '@/lib/chart-config';

// UI Components
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DeltaPill } from '@/components/ui/DeltaPill';
import { FreshnessIndicator } from '@/components/ui/FreshnessIndicator';
import { StatusAnnunciator } from '@/components/ui/StatusAnnunciator';
import { MetricCard } from '@/components/ui/MetricCard';
import { MetricRow, MetricRowHeader } from '@/components/ui/MetricRow';
import { InstrumentPanel } from '@/components/ui/InstrumentPanel';
import { SystemAlert } from '@/components/ui/SystemAlert';
import { DriversBlock } from '@/components/ui/DriversBlock';
import { TableDensityToggle } from '@/components/ui/TableDensityToggle';

// Layout Components
import { ScenarioContextBar } from '@/components/layout/ScenarioContextBar';
import { CockpitLayout } from '@/components/layout/CockpitLayout';
import { ControlListLayout } from '@/components/layout/ControlListLayout';

// Scenario Components
import { ScenarioTile } from '@/components/scenarios/ScenarioTile';
import { CompareSelectionBar } from '@/components/scenarios/CompareSelectionBar';

// Chart Components
import { GoalLine } from '@/components/charts/GoalLine';
```

---

## Appendix B: PR Description Template

```markdown
## TASK-18: High-Performance HMI Cockpit UI System

This PR transforms the application UI into a high-performance financial cockpit, focusing on:

- **Decision clarity**: Delta-first comparisons, drivers explanations, status-driven hierarchy
- **Instrument-grade rendering**: Fixed chart formatting, goal lines, proper number display
- **Cockpit density**: Compact defaults, information-dense cards, reduced whitespace
- **Unified visual system**: Design tokens, consistent status colors, standardized formatting

### Changes

#### New Components
- `StatusBadge` - Unified status display
- `DeltaPill` - Change indicator with direction
- `FreshnessIndicator` - Data age display
- `StatusAnnunciator` - Compact status grid (aircraft-style)
- `MetricCard` - Primary metric display with status
- `MetricRow` - Delta-first comparison row
- `InstrumentPanel` - Chart/metric container
- `ScenarioContextBar` - Cockpit strip for scenario pages
- `SystemAlert` - Collapsible alert banner
- `DriversBlock` - Delta explanation block
- `TableDensityToggle` - Comfort/Compact/Dense switcher
- `ScenarioTile` - Information-dense scenario card
- `CompareSelectionBar` - Sticky multi-select bar
- `GoalLine` - Chart threshold line

#### Page Refactors
- Dashboard: Status synthesis, guided empty states, fixed chart
- Scenarios Index: Tiles with metrics, multi-select comparison
- Scenario Detail: Context bar, fixed charts, delta-first compare
- Accounts: Freshness indicators, hover actions, density toggle
- Flows: Removed meaningless badges, proper status colors
- Decisions: Search, filtering, impact previews
- Life Event Modal: Keyboard navigation, preview panel

### Testing
- [ ] All pages render correctly in light and dark mode
- [ ] Charts display formatted currency on Y-axis (no "000.00")
- [ ] Keyboard navigation works in Life Event modal
- [ ] Compare flow works end-to-end
- [ ] No Lighthouse layout shift warnings
```

---

*End of TASK-18 Specification*
