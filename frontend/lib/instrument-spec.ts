// =============================================================================
// INSTRUMENT SPEC — Unified Data Contract for HMI Components
// =============================================================================
//
// This is the backbone contract that ensures every metric in the system has:
// - value + delta + tone (core display)
// - thresholds (warning/critical + direction)
// - actions (contextual levers at point of need)
// - explain (why is this warning/critical)
// - freshness (data source timestamp)
//
// Page sections become arrays of InstrumentSpec rendered via MetricCard,
// MetricRow, StatusAnnunciator, and chart instruments.
// =============================================================================

import { StatusTone } from './design-tokens';
import { LucideIcon } from 'lucide-react';

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Threshold configuration for an instrument
 */
export interface InstrumentThresholds {
  /** Value at which status becomes "warning" */
  warning: number;
  /** Value at which status becomes "critical" */
  critical: number;
  /** Whether higher values are better (default: true) */
  direction: 'higher-is-better' | 'lower-is-better';
}

/**
 * Action available from an instrument (lever at point of need)
 */
export interface InstrumentAction {
  /** Unique action identifier */
  id: string;
  /** Action button label */
  label: string;
  /** Action icon */
  icon?: LucideIcon;
  /** Action handler */
  handler: () => void;
  /** Intent/style of the action */
  intent: 'primary' | 'secondary' | 'destructive' | 'neutral';
  /** Disable condition */
  disabled?: boolean;
}

/**
 * Delta information for an instrument
 */
export interface InstrumentDelta {
  /** Raw delta value (numeric) */
  value: number;
  /** Formatted delta for display (e.g., "+$1,234" or "-5.2%") */
  formatted: string;
  /** Direction of change */
  direction: 'up' | 'down' | 'flat';
  /** Tone based on whether change is good/bad */
  tone: StatusTone;
  /** Comparison basis (e.g., "vs baseline", "vs last month") */
  basis?: string;
}

/**
 * Data freshness information
 */
export interface InstrumentFreshness {
  /** Source timestamp (when data was last updated) */
  timestamp: Date | string;
  /** Freshness status label */
  label: string;
  /** Freshness tone */
  tone: StatusTone;
}

/**
 * Explanation for current status (why is this warning/critical)
 */
export interface InstrumentExplanation {
  /** Short explanation text */
  summary: string;
  /** Detailed explanation (for tooltip/popover) */
  details?: string;
  /** Recommended actions based on status */
  recommendations?: string[];
}

// =============================================================================
// INSTRUMENT SPEC — The Core Contract
// =============================================================================

/**
 * The unified instrument specification.
 *
 * Every metric in the system should conform to this contract, ensuring
 * consistent rendering and behavior across all pages and components.
 *
 * @example
 * ```ts
 * const liquidityInstrument: InstrumentSpec = {
 *   id: 'liquidity-months',
 *   label: 'Emergency Fund',
 *   value: 4.2,
 *   valueFormatted: '4.2 months',
 *   tone: 'warning',
 *   statusLabel: 'Below Target',
 *   delta: {
 *     value: -1.8,
 *     formatted: '-1.8 mo',
 *     direction: 'down',
 *     tone: 'critical',
 *     basis: 'vs target',
 *   },
 *   thresholds: {
 *     warning: 6,
 *     critical: 3,
 *     direction: 'higher-is-better',
 *   },
 *   actions: [
 *     {
 *       id: 'increase-savings',
 *       label: 'Increase Savings',
 *       intent: 'primary',
 *       handler: () => openSavingsDialog(),
 *     },
 *   ],
 *   explain: {
 *     summary: '1.8 months below your 6-month target',
 *     recommendations: ['Increase monthly savings', 'Reduce discretionary spending'],
 *   },
 * };
 * ```
 */
export interface InstrumentSpec {
  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------
  /** Unique identifier for this instrument */
  id: string;
  /** Display label (e.g., "Emergency Fund", "Debt Service Coverage") */
  label: string;
  /** Optional icon for visual identification */
  icon?: LucideIcon;

  // ---------------------------------------------------------------------------
  // Core Value
  // ---------------------------------------------------------------------------
  /** Raw numeric value */
  value: number;
  /** Formatted value for display (e.g., "$1,234", "4.2 months", "15%") */
  valueFormatted: string;
  /** Unit of measurement (e.g., "months", "USD", "%") */
  unit?: string;

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------
  /** Current status tone */
  tone: StatusTone;
  /** Human-readable status label (e.g., "Healthy", "Warning", "Critical") */
  statusLabel: string;

  // ---------------------------------------------------------------------------
  // Delta (Change)
  // ---------------------------------------------------------------------------
  /** Delta information (change from baseline/previous) */
  delta?: InstrumentDelta;

  // ---------------------------------------------------------------------------
  // Thresholds
  // ---------------------------------------------------------------------------
  /** Threshold configuration for status computation */
  thresholds?: InstrumentThresholds;
  /** Goal/target value (if different from threshold) */
  goalValue?: number;
  /** Formatted goal for display */
  goalFormatted?: string;

  // ---------------------------------------------------------------------------
  // Actions (Levers)
  // ---------------------------------------------------------------------------
  /** Available actions at point of need */
  actions?: InstrumentAction[];

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------
  /** Explanation for current status */
  explain?: InstrumentExplanation;
  /** Data freshness information */
  freshness?: InstrumentFreshness;

  // ---------------------------------------------------------------------------
  // Interactivity
  // ---------------------------------------------------------------------------
  /** Click handler (e.g., drill-down to detail) */
  onClick?: () => void;
  /** Hover/focus tooltip content */
  tooltip?: string;
}

// =============================================================================
// FACTORY HELPERS
// =============================================================================

/**
 * Create an InstrumentSpec from raw values with automatic status derivation.
 */
export function createInstrumentSpec(
  config: Pick<InstrumentSpec, 'id' | 'label' | 'value' | 'valueFormatted'> & {
    thresholds: InstrumentThresholds;
    delta?: Omit<InstrumentDelta, 'tone' | 'direction'> & { value: number };
    icon?: LucideIcon;
    actions?: InstrumentAction[];
    onClick?: () => void;
    goalValue?: number;
    goalFormatted?: string;
    freshness?: { timestamp: Date | string };
  }
): InstrumentSpec {
  const { thresholds, delta, freshness, ...rest } = config;

  // Derive status from value and thresholds
  const tone = deriveStatusFromThresholds(rest.value, thresholds);
  const statusLabel = getStatusLabel(tone);

  // Derive delta direction and tone
  let derivedDelta: InstrumentDelta | undefined;
  if (delta) {
    const direction: 'up' | 'down' | 'flat' =
      delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat';
    const deltaTone = deriveDeltaTone(direction, thresholds.direction);
    derivedDelta = {
      ...delta,
      direction,
      tone: deltaTone,
    };
  }

  // Derive freshness
  let derivedFreshness: InstrumentFreshness | undefined;
  if (freshness) {
    derivedFreshness = deriveFreshness(freshness.timestamp);
  }

  // Generate explanation
  const explain = generateExplanation(rest.value, thresholds, config.goalValue);

  return {
    ...rest,
    tone,
    statusLabel,
    thresholds,
    delta: derivedDelta,
    freshness: derivedFreshness,
    explain,
  };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function deriveStatusFromThresholds(
  value: number,
  thresholds: InstrumentThresholds
): StatusTone {
  if (thresholds.direction === 'higher-is-better') {
    if (value >= thresholds.warning) return 'good';
    if (value >= thresholds.critical) return 'warning';
    return 'critical';
  } else {
    if (value <= thresholds.warning) return 'good';
    if (value <= thresholds.critical) return 'warning';
    return 'critical';
  }
}

function deriveDeltaTone(
  direction: 'up' | 'down' | 'flat',
  thresholdDirection: 'higher-is-better' | 'lower-is-better'
): StatusTone {
  if (direction === 'flat') return 'neutral';

  if (thresholdDirection === 'higher-is-better') {
    return direction === 'up' ? 'good' : 'critical';
  } else {
    return direction === 'down' ? 'good' : 'critical';
  }
}

function getStatusLabel(tone: StatusTone): string {
  const labels: Record<StatusTone, string> = {
    good: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
    neutral: 'Neutral',
    info: 'Info',
  };
  return labels[tone];
}

function deriveFreshness(timestamp: Date | string): InstrumentFreshness {
  const d = new Date(timestamp);
  const ageMs = Date.now() - d.getTime();

  const HOUR = 1000 * 60 * 60;
  const DAY = HOUR * 24;
  const WEEK = DAY * 7;

  if (ageMs <= HOUR) {
    return { timestamp, label: 'Fresh', tone: 'good' };
  }
  if (ageMs <= DAY) {
    return { timestamp, label: 'Recent', tone: 'neutral' };
  }
  if (ageMs <= WEEK) {
    return { timestamp, label: 'Aging', tone: 'warning' };
  }
  return { timestamp, label: 'Stale', tone: 'critical' };
}

function generateExplanation(
  value: number,
  thresholds: InstrumentThresholds,
  goalValue?: number
): InstrumentExplanation | undefined {
  const target = goalValue ?? thresholds.warning;
  const diff = target - value;
  const isHigherBetter = thresholds.direction === 'higher-is-better';

  if (isHigherBetter && value < thresholds.critical) {
    return {
      summary: `${Math.abs(diff).toFixed(1)} below critical threshold`,
      recommendations: ['Take immediate action to improve this metric'],
    };
  }

  if (isHigherBetter && value < thresholds.warning) {
    return {
      summary: `${Math.abs(diff).toFixed(1)} below target`,
      recommendations: ['Consider actions to improve this metric'],
    };
  }

  if (!isHigherBetter && value > thresholds.critical) {
    return {
      summary: `${Math.abs(diff).toFixed(1)} above critical threshold`,
      recommendations: ['Take immediate action to reduce this metric'],
    };
  }

  if (!isHigherBetter && value > thresholds.warning) {
    return {
      summary: `${Math.abs(diff).toFixed(1)} above target`,
      recommendations: ['Consider actions to reduce this metric'],
    };
  }

  return undefined;
}

// =============================================================================
// COLLECTION TYPE
// =============================================================================

/**
 * A section of instruments (for page layout)
 */
export interface InstrumentSection {
  /** Section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Optional section description */
  description?: string;
  /** Instruments in this section */
  instruments: InstrumentSpec[];
}
