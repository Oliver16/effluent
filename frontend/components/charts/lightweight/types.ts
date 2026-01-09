import type { IChartApi, ISeriesApi, SeriesType, Time } from 'lightweight-charts';

// =============================================================================
// DATA TYPES
// =============================================================================

/**
 * Standard data point for time-series charts
 */
export interface ChartDataPoint {
  /** ISO date string: 'YYYY-MM-DD' */
  time: string;
  /** Numeric value */
  value: number;
}

/**
 * Multi-series data point (for comparison charts)
 */
export interface ComparisonDataPoint {
  time: string;
  baseline: number;
  scenario: number;
}

/**
 * Cash flow data point (positive/negative)
 */
export interface CashFlowDataPoint {
  time: string;
  income: number;
  expenses: number;
  net: number;
}

// =============================================================================
// SERIES CONFIGURATION
// =============================================================================

/**
 * Series configuration for chart
 */
export interface SeriesConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Series type */
  type: 'area' | 'line' | 'baseline' | 'histogram';
  /** Data key in data points */
  dataKey: string;
  /** Line/area color */
  color: string;
  /** Fill color (for area series) */
  fillColor?: string;
  /** Line width */
  lineWidth?: number;
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Initially visible */
  visible?: boolean;
  /** Price scale ID ('left' | 'right') */
  priceScaleId?: 'left' | 'right';
}

// =============================================================================
// PRICE LINE (GOALS/THRESHOLDS)
// =============================================================================

/**
 * Price line configuration for goals/thresholds
 */
export interface PriceLineConfig {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Value on Y-axis */
  value: number;
  /** Line color */
  color: string;
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Line width */
  lineWidth?: number;
  /** Show label on axis */
  axisLabelVisible?: boolean;
}

// =============================================================================
// CHART OPTIONS
// =============================================================================

/**
 * Time range preset
 */
export type TimeRangePreset = '1Y' | '2Y' | '5Y' | '10Y' | 'ALL';

/**
 * Chart interaction mode
 */
export type InteractionMode = 'crosshair' | 'zoom' | 'pan';

/**
 * Tooltip data passed to custom tooltip component
 */
export interface TooltipData {
  /** Time value */
  time: string;
  /** Formatted time for display */
  timeFormatted: string;
  /** Series values */
  values: Array<{
    seriesId: string;
    seriesName: string;
    value: number;
    valueFormatted: string;
    color: string;
  }>;
  /** Screen position */
  position: {
    x: number;
    y: number;
  };
}

/**
 * Chart theme (derived from app theme)
 */
export interface ChartTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  borderColor: string;
  crosshairColor: string;
  // Series defaults
  upColor: string;
  downColor: string;
  primaryColor: string;
  secondaryColor: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Base chart component props
 */
export interface LightweightChartProps {
  /** Chart data */
  data: ChartDataPoint[];
  /** Series configurations */
  series: SeriesConfig[];
  /** Price lines (goals/thresholds) */
  priceLines?: PriceLineConfig[];
  /** Chart height */
  height?: number;
  /** Show time scale (X-axis) */
  showTimeScale?: boolean;
  /** Show price scale (Y-axis) */
  showPriceScale?: boolean;
  /** Price scale position */
  priceScalePosition?: 'left' | 'right';
  /** Enable crosshair */
  enableCrosshair?: boolean;
  /** Enable zoom/pan */
  enableZoom?: boolean;
  /** Format function for Y-axis values */
  formatValue?: (value: number) => string;
  /** Format function for time values */
  formatTime?: (time: string) => string;
  /** Crosshair move callback */
  onCrosshairMove?: (data: TooltipData | null) => void;
  /** Time range change callback */
  onTimeRangeChange?: (range: { from: string; to: string }) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Projection chart props (extends base)
 */
export interface ProjectionChartProps {
  /** Projection data points */
  data: ChartDataPoint[];
  /** Baseline data (for comparison) */
  baselineData?: ChartDataPoint[];
  /** Scenario name */
  scenarioName: string;
  /** Baseline name */
  baselineName?: string;
  /** Goal lines */
  goals?: PriceLineConfig[];
  /** Chart height */
  height?: number;
  /** Initial time range */
  initialRange?: TimeRangePreset;
  /** Show controls */
  showControls?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Comparison chart props
 */
export interface ComparisonChartProps {
  /** Comparison data */
  data: ComparisonDataPoint[];
  /** Scenario name */
  scenarioName: string;
  /** Baseline name */
  baselineName: string;
  /** Goal lines */
  goals?: PriceLineConfig[];
  /** Show difference fill */
  showDifferenceFill?: boolean;
  /** Chart height */
  height?: number;
  /** Additional class name */
  className?: string;
}

/**
 * Cash flow chart props
 */
export interface CashFlowChartProps {
  /** Cash flow data */
  data: CashFlowDataPoint[];
  /** Chart height */
  height?: number;
  /** Show net cash flow series */
  showNet?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// CHART INSTRUMENT SPEC — HMI Contract for Chart Components
// =============================================================================

import type { StatusTone } from '@/lib/design-tokens';
import type { LucideIcon } from 'lucide-react';

/**
 * Primary metric displayed above the chart
 */
export interface ChartPrimaryMetric {
  /** Metric label */
  label: string;
  /** Current value (numeric) */
  value: number;
  /** Formatted value for display */
  valueFormatted: string;
  /** Status tone */
  tone: StatusTone;
  /** Status label */
  statusLabel?: string;
  /** Delta from baseline/previous */
  delta?: {
    value: number;
    formatted: string;
    direction: 'up' | 'down' | 'flat';
    tone: StatusTone;
    basis?: string;
  };
}

/**
 * Goal line configuration for charts
 */
export interface ChartGoalLine {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Value on Y-axis */
  value: number;
  /** Line color (derived from tone if not specified) */
  color?: string;
  /** Status tone (determines color if color not specified) */
  tone?: StatusTone;
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Show label on axis */
  axisLabelVisible?: boolean;
}

/**
 * Annotation band for warning/critical zones
 */
export interface ChartAnnotationBand {
  /** Unique identifier */
  id: string;
  /** Band label (for legend) */
  label: string;
  /** Band type */
  type: 'warning' | 'critical' | 'good' | 'neutral';
  /** Y-axis range */
  range: {
    from: number;
    to: number;
  };
  /** Opacity (0-1) */
  opacity?: number;
}

/**
 * Chart action (contextual lever)
 */
export interface ChartAction {
  /** Unique identifier */
  id: string;
  /** Action label */
  label: string;
  /** Action icon */
  icon?: LucideIcon;
  /** Click handler */
  handler: () => void;
  /** Intent/style */
  intent: 'primary' | 'secondary' | 'neutral';
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Chart Instrument Specification
 *
 * A higher-level contract that makes charts behave like cockpit instruments.
 * Every chart can render:
 * - The chart visualization
 * - A "metric header" (MetricCard-like) above it
 * - Contextual actions beside it
 * - Goal/threshold lines and annotation bands
 *
 * This is what makes the chart feel like part of an HMI, not "a chart sitting in a UI."
 *
 * @example
 * ```ts
 * const netWorthChartSpec: ChartInstrumentSpec = {
 *   id: 'net-worth-projection',
 *   title: 'Net Worth Projection',
 *   primaryMetric: {
 *     label: 'Projected Net Worth',
 *     value: 2500000,
 *     valueFormatted: '$2.5M',
 *     tone: 'good',
 *     statusLabel: 'On Track',
 *     delta: {
 *       value: 150000,
 *       formatted: '+$150K',
 *       direction: 'up',
 *       tone: 'good',
 *       basis: 'vs baseline',
 *     },
 *   },
 *   goalLines: [
 *     { id: 'retirement-goal', label: 'Retirement Goal', value: 2000000, tone: 'good' },
 *   ],
 *   annotationBands: [
 *     { id: 'target-zone', label: 'Target Zone', type: 'good', range: { from: 2000000, to: 3000000 } },
 *   ],
 *   actions: [
 *     { id: 'adjust-savings', label: 'Adjust Savings Rate', intent: 'primary', handler: () => {} },
 *   ],
 * };
 * ```
 */
export interface ChartInstrumentSpec {
  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------
  /** Unique identifier */
  id: string;
  /** Chart title */
  title: string;
  /** Chart subtitle/description */
  subtitle?: string;

  // ---------------------------------------------------------------------------
  // Primary Metric (Header)
  // ---------------------------------------------------------------------------
  /** Primary metric displayed above the chart */
  primaryMetric?: ChartPrimaryMetric;

  // ---------------------------------------------------------------------------
  // Goal Lines
  // ---------------------------------------------------------------------------
  /** Goal/threshold lines (mapped from thresholds/goals) */
  goalLines?: ChartGoalLine[];

  // ---------------------------------------------------------------------------
  // Annotation Bands
  // ---------------------------------------------------------------------------
  /** Warning/critical zone bands */
  annotationBands?: ChartAnnotationBand[];

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  /** Contextual actions (scenario tweak, drill-down) */
  actions?: ChartAction[];

  // ---------------------------------------------------------------------------
  // Data Source
  // ---------------------------------------------------------------------------
  /** Data freshness timestamp */
  lastUpdated?: Date | string;
  /** Data source label */
  dataSource?: string;
}

/**
 * Convert ChartGoalLine to PriceLineConfig
 */
export function goalLineToPriceLine(
  goalLine: ChartGoalLine,
  statusColors: Record<StatusTone, string>
): PriceLineConfig {
  const color = goalLine.color ?? statusColors[goalLine.tone ?? 'neutral'];

  return {
    id: goalLine.id,
    label: goalLine.label,
    value: goalLine.value,
    color,
    lineStyle: goalLine.lineStyle ?? 'dashed',
    lineWidth: 1,
    axisLabelVisible: goalLine.axisLabelVisible ?? true,
  };
}

/**
 * Convert InstrumentSpec thresholds to ChartGoalLines
 */
export function thresholdsToGoalLines(
  thresholds: { warning: number; critical: number },
  options?: {
    warningLabel?: string;
    criticalLabel?: string;
    direction?: 'higher-is-better' | 'lower-is-better';
  }
): ChartGoalLine[] {
  const { warningLabel = 'Warning', criticalLabel = 'Critical' } = options ?? {};

  return [
    {
      id: 'threshold-warning',
      label: warningLabel,
      value: thresholds.warning,
      tone: 'warning',
      lineStyle: 'dashed',
    },
    {
      id: 'threshold-critical',
      label: criticalLabel,
      value: thresholds.critical,
      tone: 'critical',
      lineStyle: 'dashed',
    },
  ];
}

/**
 * Create annotation bands from thresholds
 */
export function thresholdsToAnnotationBands(
  thresholds: { warning: number; critical: number },
  direction: 'higher-is-better' | 'lower-is-better',
  maxValue: number,
  minValue: number = 0
): ChartAnnotationBand[] {
  if (direction === 'higher-is-better') {
    return [
      {
        id: 'band-critical',
        label: 'Critical Zone',
        type: 'critical',
        range: { from: minValue, to: thresholds.critical },
        opacity: 0.1,
      },
      {
        id: 'band-warning',
        label: 'Warning Zone',
        type: 'warning',
        range: { from: thresholds.critical, to: thresholds.warning },
        opacity: 0.1,
      },
      {
        id: 'band-good',
        label: 'Target Zone',
        type: 'good',
        range: { from: thresholds.warning, to: maxValue },
        opacity: 0.05,
      },
    ];
  } else {
    return [
      {
        id: 'band-good',
        label: 'Target Zone',
        type: 'good',
        range: { from: minValue, to: thresholds.warning },
        opacity: 0.05,
      },
      {
        id: 'band-warning',
        label: 'Warning Zone',
        type: 'warning',
        range: { from: thresholds.warning, to: thresholds.critical },
        opacity: 0.1,
      },
      {
        id: 'band-critical',
        label: 'Critical Zone',
        type: 'critical',
        range: { from: thresholds.critical, to: maxValue },
        opacity: 0.1,
      },
    ];
  }
}
