'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';
import { LightweightChart } from './LightweightChart';
import { ChartTooltip } from './ChartTooltip';
import { ChartControls } from './ChartControls';
import type {
  ComparisonChartProps,
  SeriesConfig,
  TooltipData,
  TimeRangePreset,
} from './types';

// Chart color constants
const CHART_SERIES_COLORS = {
  primary: {
    line: 'rgb(139, 92, 246)', // violet-500
    fill: 'rgba(139, 92, 246, 0.15)',
  },
  secondary: {
    line: 'rgb(156, 163, 175)', // gray-400
    fill: 'rgba(156, 163, 175, 0.1)',
  },
  good: 'rgb(16, 185, 129)', // emerald-500
  critical: 'rgb(239, 68, 68)', // red-500
} as const;

export function ComparisonChart({
  data,
  scenarioName,
  baselineName,
  goals = [],
  height = 350,
  className,
}: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('5Y');

  // Convert comparison data to chart format
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: point.time,
      value: point.scenario, // Primary series
      baseline: point.baseline,
      // For difference visualization
      difference: point.scenario - point.baseline,
    }));
  }, [data]);

  // Series configuration
  const series = useMemo<SeriesConfig[]>(
    () => [
      {
        id: 'baseline',
        name: baselineName,
        type: 'line',
        dataKey: 'baseline',
        color: CHART_SERIES_COLORS.secondary.line,
        lineWidth: 2,
        lineStyle: 'dashed',
      },
      {
        id: 'scenario',
        name: scenarioName,
        type: 'area',
        dataKey: 'value',
        color: CHART_SERIES_COLORS.primary.line,
        fillColor: CHART_SERIES_COLORS.primary.fill,
        lineWidth: 2,
      },
    ],
    [scenarioName, baselineName]
  );

  // Price lines from goals
  const priceLines = useMemo(() => {
    return goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      value: goal.value,
      color: goal.color ?? CHART_SERIES_COLORS.good,
      lineStyle: 'dashed' as const,
      lineWidth: 1,
      axisLabelVisible: true,
    }));
  }, [goals]);

  // Custom tooltip with difference
  const handleCrosshairMove = useCallback(
    (data: TooltipData | null) => {
      if (data && data.values.length >= 2) {
        const baselineValue = data.values.find((v) => v.seriesId === 'baseline')?.value ?? 0;
        const scenarioValue = data.values.find((v) => v.seriesId === 'scenario')?.value ?? 0;
        const difference = scenarioValue - baselineValue;

        // Add difference to tooltip
        data.values.push({
          seriesId: 'difference',
          seriesName: 'Difference',
          value: difference,
          valueFormatted: formatCurrencyCompact(difference),
          color: difference >= 0 ? CHART_SERIES_COLORS.good : CHART_SERIES_COLORS.critical,
        });
      }
      setTooltipData(data);
    },
    []
  );

  return (
    <div className={cn('relative', className)}>
      {/* Controls */}
      <div className="mb-3">
        <ChartControls timeRange={timeRange} onTimeRangeChange={setTimeRange} series={series} />
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative">
        <LightweightChart
          data={chartData}
          series={series}
          priceLines={priceLines}
          height={height}
          formatValue={formatCurrencyCompact}
          formatTime={formatMonthYear}
          onCrosshairMove={handleCrosshairMove}
          enableCrosshair
          enableZoom
        />

        <ChartTooltip data={tooltipData} containerRef={containerRef} />
      </div>
    </div>
  );
}
