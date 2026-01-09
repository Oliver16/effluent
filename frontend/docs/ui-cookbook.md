# UI Cookbook

## Quick Start: Building a New Page

1. Wrap page in `PageShell`
2. Add `PageHeader` with title, subtitle, actions
3. Use `SectionCard` for content sections
4. Use skeletons for loading states

### Example Page Structure
```tsx
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
```

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
```ts
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
```

### Status Helpers
```ts
import { computeStatus, computeNetWorthStatus } from '@/lib/status';

// Returns { status, statusLabel } — use statusLabel for StatusBadge
const result = computeStatus('liquidity_months', 4.5);
// { status: 'warning', statusLabel: 'Warning' }

const nwResult = computeNetWorthStatus(100000, null, 95000);
// { status: 'good', statusLabel: 'Growing' }
```

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
```
tabular-nums tracking-tight font-semibold
```

## Status Colors

| Status | Usage | Light | Dark |
|--------|-------|-------|------|
| Good | On track, healthy | emerald-600 | emerald-400 |
| Warning | Needs attention | amber-600 | amber-400 |
| Critical | Requires action | red-600 | red-400 |
| Neutral | Informational | muted-foreground | muted-foreground |

## Common Patterns

### Loading State (Server Component)
```tsx
// app/my-page/loading.tsx
export default function Loading() {
  return <PageShell><PageSkeleton /></PageShell>;
}
```

### Error State
```tsx
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
```

### Empty State
```tsx
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
```

## Dashboard Layout with Sidebar

```tsx
import { PageShell } from '@/components/layout/PageShell';

export default function DashboardPage() {
  return (
    <PageShell
      variant="dashboard"
      sidebar={
        <div className="space-y-6">
          <SidebarCard1 />
          <SidebarCard2 />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Main content */}
      </div>
    </PageShell>
  );
}
```

## Navigation Components

### NewMenu (Global Create Button)
```tsx
import { NewMenu } from '@/components/nav/NewMenu';

// In header:
<NewMenu showStressTests={false} />
```

### Command Palette (⌘K)
```tsx
import { CommandPalette } from '@/components/nav/CommandPalette';

// In header:
<CommandPalette />
```

## Skeleton Components

Use appropriate skeleton for loading states:

```tsx
import {
  StatCardSkeleton,
  SidebarCardSkeleton,
  ChartSkeleton,
  ListRowSkeleton,
  DashboardSkeleton,
  PageSkeleton
} from '@/components/ui/Skeletons';

// For individual stat cards
<StatCardSkeleton />

// For sidebar items
<SidebarCardSkeleton />

// For charts
<ChartSkeleton />

// For lists (with count parameter)
<ListRowSkeleton count={5} />

// For full dashboard loading
<DashboardSkeleton />

// For generic page loading
<PageSkeleton />
```

## Best Practices

1. **Use primitives consistently** - Always use PageShell, PageHeader, SectionCard instead of custom layouts
2. **Never show raw "Loading..."** - Always use skeleton components
3. **Use tabular-nums for numbers** - Ensures alignment in tables and lists
4. **Include accessibility attributes** - Use role, aria-label, aria-busy as shown in components
5. **Support keyboard navigation** - Ensure Enter AND Space activate interactive elements
6. **Test in dark mode** - All components should look correct in both light and dark modes
