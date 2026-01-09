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

/**
 * Format a number as USD currency (smart decimals: 0 for large values)
 * Use for: net worth, debt totals, large amounts
 */
export function formatCurrencyValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const absValue = Math.abs(value);
  const decimals = absValue >= 1000 ? 0 : 2;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Alias for backwards compatibility
export const formatCurrency = formatCurrencyValue;

/**
 * Format a number as USD currency with 2 decimal places
 * Use for: monthly surplus, income, expenses
 */
export function formatCurrencyPrecise(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return currencyFormatterPrecise.format(value);
}

/**
 * Format a number as compact currency (e.g., $1.2M, $500K)
 * Use for: charts, space-constrained displays
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

// ============================================
// Number Formatting
// ============================================

/**
 * Format a number with optional decimal places
 */
export function formatNumberValue(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

// Alias for backwards compatibility
export const formatNumber = formatNumberValue;

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Format a decimal as a percentage
 * @param value - Decimal value (0.15 = 15%)
 */
export function formatPercentValue(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

// Alias for backwards compatibility
export const formatPercent = formatPercentValue;

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
 * Format a ratio (e.g., DSCR of 1.25)
 */
export function formatRatio(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}x`;
}

/**
 * Format as months: "6.0 months" or "6 mo"
 */
export function formatMonths(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '—';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  if (compact) return `${formatted} mo`;
  return `${formatted} months`;
}

// ============================================
// Date Formatting
// ============================================

/**
 * Format a date for display
 */
export function formatDateValue(
  date: string | Date | null | undefined,
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!date) return '—';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(d.getTime())) return '—';

    const styleOptions: Record<'short' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
      short: { month: 'numeric', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { month: 'long', day: 'numeric', year: 'numeric' },
    };

    return new Intl.DateTimeFormat('en-US', styleOptions[style]).format(d);
  } catch {
    return '—';
  }
}

// Alias for backwards compatibility
export const formatDate = formatDateValue;

/**
 * Format a relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date | number | null | undefined): string {
  if (!date) return '—';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

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
  } catch {
    return '—';
  }
}

/**
 * Format date as month/year: "Jan 2026"
 */
export function formatMonthYear(date: Date | string | number): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

/**
 * Format projection month index to real date
 * @param monthIndex - 1-based month index (M1, M2, etc.)
 * @param startDate - Projection start date
 */
export function formatProjectionMonth(monthIndex: number, startDate: Date | string): string {
  try {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return `M${monthIndex}`;
    d.setMonth(d.getMonth() + monthIndex - 1);
    return formatMonthYear(d);
  } catch {
    return `M${monthIndex}`;
  }
}
