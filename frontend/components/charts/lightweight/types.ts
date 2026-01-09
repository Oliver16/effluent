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
