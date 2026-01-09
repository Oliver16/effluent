// =============================================================================
// CHART CONFIGURATION — Standardized chart styling and formatting
// =============================================================================

import { formatCurrencyCompact, formatPercent, formatMonthYear } from './format';
import { CHART_COLORS } from './design-tokens';

/**
 * Standard Y-axis props for currency charts
 * CRITICAL: Always use formatCurrencyCompact to prevent "000.00" display bug
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
 * Standard Y-axis props for ratio charts (e.g., DSCR)
 */
export const ratioYAxisProps = {
  tickFormatter: (value: number) => `${value.toFixed(2)}x`,
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

/**
 * Chart margin defaults
 */
export const chartMargin = {
  default: { top: 20, right: 20, bottom: 20, left: 20 },
  compact: { top: 10, right: 10, bottom: 10, left: 10 },
  withLegend: { top: 20, right: 20, bottom: 40, left: 20 },
};

/**
 * Standard area chart fill/stroke for scenarios
 */
export const scenarioAreaStyle = {
  stroke: CHART_COLORS.scenario,
  fill: `${CHART_COLORS.scenario}15`, // 15% opacity
  strokeWidth: 2,
};

/**
 * Standard area chart fill/stroke for baseline
 */
export const baselineAreaStyle = {
  stroke: CHART_COLORS.baseline,
  fill: `${CHART_COLORS.baseline}10`, // 10% opacity
  strokeWidth: 1.5,
  strokeDasharray: '4 4',
};

/**
 * Standard line styles
 */
export const lineStyles = {
  primary: {
    stroke: CHART_COLORS.primary,
    strokeWidth: 2,
  },
  secondary: {
    stroke: CHART_COLORS.secondary,
    strokeWidth: 1.5,
    strokeDasharray: '4 4',
  },
  good: {
    stroke: CHART_COLORS.good,
    strokeWidth: 1.5,
  },
  warning: {
    stroke: CHART_COLORS.warning,
    strokeWidth: 1.5,
  },
  critical: {
    stroke: CHART_COLORS.critical,
    strokeWidth: 1.5,
  },
};

/**
 * Reference line (goal/threshold) style
 */
export const referenceLineStyle = {
  strokeDasharray: '6 4',
  strokeWidth: 1.5,
};

/**
 * Chart heights for responsive containers
 */
export const chartHeights = {
  small: 200,
  default: 300,
  medium: 350,
  large: 400,
  full: '100%',
};

/**
 * Get color for status-based chart elements
 */
export function getStatusChartColor(status: 'good' | 'warning' | 'critical' | 'neutral'): string {
  switch (status) {
    case 'good':
      return CHART_COLORS.good;
    case 'warning':
      return CHART_COLORS.warning;
    case 'critical':
      return CHART_COLORS.critical;
    default:
      return CHART_COLORS.secondary;
  }
}
