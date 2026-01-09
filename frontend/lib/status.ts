import type { Status } from '@/components/ui/StatusBadge';

// ============================================
// Types
// ============================================

export interface StatusResult {
  status: Status;
  statusLabel: string; // NOTE: "statusLabel" not "label" — matches StatusBadge prop
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
  goalStatus: Array<{ goalType: string; targetValue: string }> | undefined,
  goalType: string,
  defaultValue?: number
): number | null {
  const goal = goalStatus?.find((g) => g.goalType === goalType);
  if (goal) {
    const parsed = parseFloat(goal.targetValue);
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

/**
 * Convert goal status from API to our Status type
 */
export function goalStatusToStatus(goalStatus: string): Status {
  switch (goalStatus) {
    case 'good':
    case 'achieved':
      return 'good';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'critical';
    default:
      return 'neutral';
  }
}
