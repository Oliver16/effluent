import type { Status } from '@/components/ui/StatusBadge';
import { StatusTone, FRESHNESS } from './design-tokens';

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

/**
 * Standard financial metric thresholds (new HMI format)
 */
export const METRIC_THRESHOLDS = {
  liquidityMonths: { warning: 6, critical: 3 },
  savingsRate: { warning: 0.15, critical: 0.05 },
  dscr: { warning: 1.5, critical: 1.0 },
  debtToIncome: { warning: 0.36, critical: 0.43 },
} as const;

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

// ============================================
// New HMI Status Utilities
// ============================================

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
 * Convert StatusTone to legacy Status type
 */
export function toneToStatus(tone: StatusTone): Status {
  if (tone === 'info') return 'neutral';
  return tone;
}

/**
 * Convert legacy Status to StatusTone
 */
export function statusToTone(status: Status): StatusTone {
  return status;
}

// ============================================
// STATUS REGISTRY — Unified Status Semantics
// ============================================

/**
 * Status entry in the registry
 */
export interface StatusRegistryEntry {
  /** Status tone key */
  tone: StatusTone;
  /** User-facing label */
  label: string;
  /** Description of what this status means */
  description: string;
  /** Recommended actions for this status */
  recommendedActions: string[];
  /** Priority level (higher = more urgent) */
  priority: number;
}

/**
 * Metric registry entry defining how a metric should be evaluated
 */
export interface MetricRegistryEntry {
  /** Metric identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Unit of measurement */
  unit: string;
  /** Default thresholds */
  thresholds: {
    warning: number;
    critical: number;
  };
  /** Direction for evaluation */
  direction: 'higher-is-better' | 'lower-is-better';
  /** Status labels for each tone */
  statusLabels: {
    good: string;
    warning: string;
    critical: string;
  };
  /** Recommended actions for each status */
  recommendedActions: {
    good: string[];
    warning: string[];
    critical: string[];
  };
}

/**
 * Global status definitions with semantics
 */
export const STATUS_REGISTRY: Record<StatusTone, StatusRegistryEntry> = {
  good: {
    tone: 'good',
    label: 'Healthy',
    description: 'This metric is within the target range',
    recommendedActions: ['Continue current strategy', 'Monitor for changes'],
    priority: 0,
  },
  warning: {
    tone: 'warning',
    label: 'Warning',
    description: 'This metric needs attention before it becomes critical',
    recommendedActions: ['Review current trajectory', 'Consider adjustments'],
    priority: 1,
  },
  critical: {
    tone: 'critical',
    label: 'Critical',
    description: 'Immediate action is required to address this metric',
    recommendedActions: ['Take immediate corrective action', 'Review financial plan'],
    priority: 2,
  },
  neutral: {
    tone: 'neutral',
    label: 'Neutral',
    description: 'This metric has no target or is not being evaluated',
    recommendedActions: [],
    priority: -1,
  },
  info: {
    tone: 'info',
    label: 'Info',
    description: 'Informational status with no evaluation',
    recommendedActions: [],
    priority: -1,
  },
};

/**
 * Metric-specific registry with thresholds, labels, and actions
 */
export const METRIC_REGISTRY: Record<string, MetricRegistryEntry> = {
  liquidity_months: {
    id: 'liquidity_months',
    label: 'Emergency Fund',
    unit: 'months',
    thresholds: { warning: 6, critical: 3 },
    direction: 'higher-is-better',
    statusLabels: {
      good: 'Fully Funded',
      warning: 'Building',
      critical: 'Underfunded',
    },
    recommendedActions: {
      good: ['Maintain current savings rate', 'Consider investing excess'],
      warning: ['Increase monthly savings', 'Review discretionary spending'],
      critical: ['Prioritize emergency fund', 'Reduce non-essential expenses', 'Consider additional income'],
    },
  },
  dscr: {
    id: 'dscr',
    label: 'Debt Service Coverage',
    unit: 'x',
    thresholds: { warning: 1.25, critical: 1.0 },
    direction: 'higher-is-better',
    statusLabels: {
      good: 'Comfortable',
      warning: 'Tight',
      critical: 'Stressed',
    },
    recommendedActions: {
      good: ['Maintain income stability', 'Consider debt paydown'],
      warning: ['Build cash buffer', 'Avoid new debt', 'Review expenses'],
      critical: ['Immediate debt review needed', 'Consider refinancing', 'Increase income'],
    },
  },
  savings_rate: {
    id: 'savings_rate',
    label: 'Savings Rate',
    unit: '%',
    thresholds: { warning: 0.15, critical: 0.05 },
    direction: 'higher-is-better',
    statusLabels: {
      good: 'Strong',
      warning: 'Moderate',
      critical: 'Low',
    },
    recommendedActions: {
      good: ['Maximize tax-advantaged accounts', 'Consider investment diversification'],
      warning: ['Review budget for savings opportunities', 'Automate savings'],
      critical: ['Create a budget', 'Track expenses', 'Find savings opportunities'],
    },
  },
  debt_to_income: {
    id: 'debt_to_income',
    label: 'Debt-to-Income Ratio',
    unit: '%',
    thresholds: { warning: 0.36, critical: 0.43 },
    direction: 'lower-is-better',
    statusLabels: {
      good: 'Low',
      warning: 'Moderate',
      critical: 'High',
    },
    recommendedActions: {
      good: ['Maintain current debt levels', 'Focus on wealth building'],
      warning: ['Avoid new debt', 'Consider extra payments on high-interest debt'],
      critical: ['Prioritize debt reduction', 'Consider debt consolidation', 'Review all recurring payments'],
    },
  },
  monthly_surplus: {
    id: 'monthly_surplus',
    label: 'Monthly Cash Flow',
    unit: 'USD',
    thresholds: { warning: 0, critical: -500 },
    direction: 'higher-is-better',
    statusLabels: {
      good: 'Positive',
      warning: 'Break-even',
      critical: 'Negative',
    },
    recommendedActions: {
      good: ['Direct surplus to goals', 'Build emergency fund'],
      warning: ['Track all expenses', 'Review subscriptions and recurring costs'],
      critical: ['Immediate budget review needed', 'Cut discretionary spending', 'Find income opportunities'],
    },
  },
  net_worth_growth: {
    id: 'net_worth_growth',
    label: 'Net Worth Trend',
    unit: '%',
    thresholds: { warning: 0, critical: -0.05 },
    direction: 'higher-is-better',
    statusLabels: {
      good: 'Growing',
      warning: 'Stable',
      critical: 'Declining',
    },
    recommendedActions: {
      good: ['Continue current strategy', 'Review asset allocation'],
      warning: ['Review spending patterns', 'Ensure savings rate is adequate'],
      critical: ['Identify causes of decline', 'Review all financial accounts', 'Create action plan'],
    },
  },
};

/**
 * Get metric registry entry with optional user overrides
 */
export function getMetricConfig(
  metricId: string,
  userOverrides?: Partial<MetricRegistryEntry>
): MetricRegistryEntry | null {
  const base = METRIC_REGISTRY[metricId];
  if (!base) return null;

  if (userOverrides) {
    return {
      ...base,
      ...userOverrides,
      thresholds: { ...base.thresholds, ...userOverrides.thresholds },
      statusLabels: { ...base.statusLabels, ...userOverrides.statusLabels },
      recommendedActions: { ...base.recommendedActions, ...userOverrides.recommendedActions },
    };
  }

  return base;
}

/**
 * Compute status using the metric registry
 */
export function computeStatusFromRegistry(
  metricId: string,
  value: number,
  userOverrides?: Partial<MetricRegistryEntry>
): {
  tone: StatusTone;
  label: string;
  recommendations: string[];
} | null {
  const config = getMetricConfig(metricId, userOverrides);
  if (!config) return null;

  const { thresholds, direction, statusLabels, recommendedActions } = config;

  let tone: StatusTone;
  if (direction === 'higher-is-better') {
    if (value >= thresholds.warning) {
      tone = 'good';
    } else if (value >= thresholds.critical) {
      tone = 'warning';
    } else {
      tone = 'critical';
    }
  } else {
    if (value <= thresholds.warning) {
      tone = 'good';
    } else if (value <= thresholds.critical) {
      tone = 'warning';
    } else {
      tone = 'critical';
    }
  }

  return {
    tone,
    label: statusLabels[tone as 'good' | 'warning' | 'critical'],
    recommendations: recommendedActions[tone as 'good' | 'warning' | 'critical'],
  };
}

/**
 * Get the highest priority status from a list of tones
 */
export function getHighestPriorityStatus(tones: StatusTone[]): StatusTone {
  let highest: StatusTone = 'neutral';
  let highestPriority = -1;

  for (const tone of tones) {
    const entry = STATUS_REGISTRY[tone];
    if (entry.priority > highestPriority) {
      highest = tone;
      highestPriority = entry.priority;
    }
  }

  return highest;
}
