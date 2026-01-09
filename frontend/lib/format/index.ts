// =============================================================================
// FORMATTING — Centralized Export Module
// =============================================================================
//
// IMPORTANT: This is the ONLY place formatting utilities should be imported from.
//
// DO NOT:
// - Use .toFixed() directly in components
// - Use Intl.NumberFormat directly outside this module
// - Create ad-hoc formatting functions in components
//
// All formatting MUST go through these utilities to ensure consistency across
// the entire application. This prevents subtle inconsistencies in number
// formatting, currency display, and date rendering.
//
// Usage:
//   import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
//
// =============================================================================

// Re-export all formatting utilities from the main format.ts file
export {
  // Safe parsing
  safeParseNumber,
  parseBalance,

  // Currency formatting
  formatCurrencyValue,
  formatCurrency,
  formatCurrencyPrecise,
  formatCurrencyCompact,
  formatCurrencySigned,

  // Number formatting
  formatNumberValue,
  formatNumber,
  formatPercentValue,
  formatPercent,
  formatPercentSigned,
  formatRatio,
  formatMonths,

  // Date formatting
  formatDateValue,
  formatDate,
  formatRelativeTime,
  formatMonthYear,
  formatProjectionMonth,
} from '../format';

// =============================================================================
// CHART-SPECIFIC FORMATTERS
// =============================================================================

/**
 * Format a value for chart Y-axis ticks (compact currency)
 * Use this for all chart axes to maintain consistency
 */
export { formatCurrencyCompact as formatChartTick } from '../format';

/**
 * Format a value for chart tooltips (full precision)
 */
export { formatCurrencyValue as formatChartTooltip } from '../format';

// =============================================================================
// DELTA FORMATTERS
// =============================================================================

import {
  formatCurrencySigned as _formatCurrencySigned,
  formatPercentSigned as _formatPercentSigned,
} from '../format';

/**
 * Format a currency delta with direction indicator
 * Returns: "+$1,234" or "-$1,234" or "$0"
 */
export function formatCurrencyDelta(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return _formatCurrencySigned(value);
}

/**
 * Format a percent delta with direction indicator
 * @param value - Decimal value (0.05 = 5%)
 * Returns: "+5.0%" or "-5.0%" or "0.0%"
 */
export function formatPercentDelta(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return _formatPercentSigned(value);
}

/**
 * Format months delta with direction
 * Returns: "+2.1 mo" or "-1.5 mo"
 */
export function formatMonthsDelta(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(abs);
  if (value > 0) return `+${formatted} mo`;
  if (value < 0) return `-${formatted} mo`;
  return `${formatted} mo`;
}

/**
 * Format ratio delta with direction
 * Returns: "+0.25x" or "-0.10x"
 */
export function formatRatioDelta(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs);
  if (value > 0) return `+${formatted}x`;
  if (value < 0) return `-${formatted}x`;
  return `${formatted}x`;
}

// =============================================================================
// METRIC-SPECIFIC FORMATTERS
// =============================================================================

import { formatMonths as _formatMonths, formatRatio as _formatRatio } from '../format';

export type MetricUnit = 'currency' | 'percent' | 'months' | 'ratio' | 'number';

/**
 * Format a metric value based on its unit type
 */
export function formatMetricValue(value: number, unit: MetricUnit): string {
  if (!Number.isFinite(value)) return '—';

  switch (unit) {
    case 'currency':
      return _formatCurrencySigned(value);
    case 'percent':
      return _formatPercentSigned(value);
    case 'months':
      return _formatMonths(value, true);
    case 'ratio':
      return _formatRatio(value);
    case 'number':
    default:
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }).format(value);
  }
}

/**
 * Format a metric delta based on its unit type
 */
export function formatMetricDelta(value: number, unit: MetricUnit): string {
  if (!Number.isFinite(value)) return '—';

  switch (unit) {
    case 'currency':
      return formatCurrencyDelta(value);
    case 'percent':
      return formatPercentDelta(value);
    case 'months':
      return formatMonthsDelta(value);
    case 'ratio':
      return formatRatioDelta(value);
    case 'number':
    default: {
      const formatted = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }).format(Math.abs(value));
      if (value > 0) return `+${formatted}`;
      if (value < 0) return `-${formatted}`;
      return formatted;
    }
  }
}

// =============================================================================
// PROJECTION TIME FORMATTERS
// =============================================================================

import { formatMonthYear as _formatMonthYear, formatProjectionMonth as _formatProjectionMonth } from '../format';

/**
 * Format a projection date for chart display
 * Converts ISO string to "Jan 2026" format
 */
export function formatProjectionDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return _formatMonthYear(d);
  } catch {
    return isoDate;
  }
}

/**
 * Format a month index for projection display
 * @param monthIndex - 0-based month index from projection start
 * @param startDate - Projection start date
 */
export function formatProjectionMonthIndex(monthIndex: number, startDate: Date | string): string {
  return _formatProjectionMonth(monthIndex + 1, startDate);
}
