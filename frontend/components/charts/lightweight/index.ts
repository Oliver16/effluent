// Core chart component
export { LightweightChart } from './LightweightChart';

// High-level chart components
export { ProjectionChart } from './ProjectionChart';
export { ComparisonChart } from './ComparisonChart';
export { CashFlowChart } from './CashFlowChart';

// Supporting components
export { ChartTooltip } from './ChartTooltip';
export { ChartControls } from './ChartControls';
export { ChartLegend } from './ChartLegend';

// Hooks
export { useChartTheme, useChartOptions } from './useChartTheme';
export {
  useProjectionChartData,
  useComparisonChartData,
  toLightweightData,
  filterDataToRange,
  getTimeRangeFromPreset,
} from './useChartData';

// Types
export type {
  ChartDataPoint,
  ComparisonDataPoint,
  CashFlowDataPoint,
  SeriesConfig,
  PriceLineConfig,
  TimeRangePreset,
  InteractionMode,
  TooltipData,
  ChartTheme,
  LightweightChartProps,
  ProjectionChartProps,
  ComparisonChartProps,
  CashFlowChartProps,
} from './types';
