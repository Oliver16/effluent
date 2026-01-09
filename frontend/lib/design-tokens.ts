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
// Lightweight Charts Colors (RGB format for canvas rendering)
// -----------------------------------------------------------------------------
export const LW_CHART_COLORS = {
  // Series colors
  primary: {
    line: 'rgb(139, 92, 246)', // violet-500
    fill: 'rgba(139, 92, 246, 0.15)',
    fillTop: 'rgba(139, 92, 246, 0.4)',
    fillBottom: 'rgba(139, 92, 246, 0)',
  },
  secondary: {
    line: 'rgb(156, 163, 175)', // gray-400
    fill: 'rgba(156, 163, 175, 0.1)',
    fillTop: 'rgba(156, 163, 175, 0.3)',
    fillBottom: 'rgba(156, 163, 175, 0)',
  },
  tertiary: {
    line: 'rgb(59, 130, 246)', // blue-500
    fill: 'rgba(59, 130, 246, 0.15)',
    fillTop: 'rgba(59, 130, 246, 0.4)',
    fillBottom: 'rgba(59, 130, 246, 0)',
  },

  // Status colors for price lines
  good: 'rgb(16, 185, 129)', // emerald-500
  warning: 'rgb(245, 158, 11)', // amber-500
  critical: 'rgb(239, 68, 68)', // red-500
  neutral: 'rgb(107, 114, 128)', // gray-500

  // Positive/Negative for cash flow
  positive: 'rgb(16, 185, 129)',
  negative: 'rgb(239, 68, 68)',

  // Chart chrome
  grid: {
    light: 'rgba(209, 213, 219, 0.5)', // gray-300/50
    dark: 'rgba(75, 85, 99, 0.3)', // gray-600/30
  },
  border: {
    light: 'rgb(229, 231, 235)', // gray-200
    dark: 'rgb(55, 65, 81)', // gray-700
  },
  text: {
    light: 'rgb(107, 114, 128)', // gray-500
    dark: 'rgb(156, 163, 175)', // gray-400
  },
  crosshair: {
    light: 'rgb(107, 114, 128)',
    dark: 'rgb(156, 163, 175)',
  },
} as const;

// Chart sizing constants
export const CHART_SIZES = {
  default: 300,
  compact: 200,
  large: 400,
  full: 500,
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
