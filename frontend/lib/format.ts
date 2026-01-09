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
export function formatCurrencyValue(value: number): string {
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
export function formatNumberValue(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Format a decimal as a percentage
 * @param value - Decimal value (0.15 = 15%)
 */
export function formatPercentValue(value: number, maxDecimals = 1): string {
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
    return formatDateValue(d, 'short');
  } catch {
    return '—';
  }
}
