'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';
import { LightweightChart } from './LightweightChart';
import { ChartTooltip } from './ChartTooltip';
import { ChartControls } from './ChartControls';
import { ChartLegend } from './ChartLegend';
import type {
  ProjectionChartProps,
  SeriesConfig,
  PriceLineConfig,
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
} as const;

export function ProjectionChart({
  data,
  baselineData,
  scenarioName,
  baselineName = 'Baseline',
  goals = [],
  height = 350,
  initialRange = '5Y',
  showControls = true,
  className,
}: ProjectionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>(initialRange);
  const [seriesVisibility, setSeriesVisibility] = useState<Record<string, boolean>>({
    scenario: true,
    baseline: true,
  });

  // Build series configuration
  const series = useMemo<SeriesConfig[]>(() => {
    const result: SeriesConfig[] = [
      {
        id: 'scenario',
        name: scenarioName,
        type: 'area',
        dataKey: 'value',
        color: CHART_SERIES_COLORS.primary.line,
        fillColor: CHART_SERIES_COLORS.primary.fill,
        lineWidth: 2,
        visible: seriesVisibility.scenario,
      },
    ];

    if (baselineData && baselineData.length > 0) {
      result.unshift({
        id: 'baseline',
        name: baselineName,
        type: 'area',
        dataKey: 'baseline',
        color: CHART_SERIES_COLORS.secondary.line,
        fillColor: CHART_SERIES_COLORS.secondary.fill,
        lineWidth: 1.5,
        lineStyle: 'dashed',
        visible: seriesVisibility.baseline,
      });
    }

    return result;
  }, [scenarioName, baselineName, baselineData, seriesVisibility]);

  // Merge data for multi-series
  const chartData = useMemo(() => {
    if (!baselineData || baselineData.length === 0) {
      return data;
    }

    // Merge baseline into each data point
    return data.map((point, i) => ({
      ...point,
      baseline: baselineData[i]?.value ?? point.value,
    }));
  }, [data, baselineData]);

  // Convert goals to price lines
  const priceLines = useMemo<PriceLineConfig[]>(() => {
    return goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      value: goal.value,
      color: goal.color ?? CHART_SERIES_COLORS.good,
      lineStyle: 'dashed',
      lineWidth: 1,
      axisLabelVisible: true,
    }));
  }, [goals]);

  // Handle series visibility toggle
  const handleSeriesVisibilityChange = useCallback((seriesId: string, visible: boolean) => {
    setSeriesVisibility((prev) => ({
      ...prev,
      [seriesId]: visible,
    }));
  }, []);

  // Handle time range change
  const handleTimeRangeChange = useCallback((range: TimeRangePreset) => {
    setTimeRange(range);
  }, []);

  // Format time for tooltip
  const formatTime = useCallback((time: string) => {
    return formatMonthYear(time);
  }, []);

  return (
    <div className={cn('relative', className)}>
      {/* Controls */}
      {showControls && (
        <div className="mb-3">
          <ChartControls
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            series={series}
            seriesVisibility={seriesVisibility}
            onSeriesVisibilityChange={handleSeriesVisibilityChange}
          />
        </div>
      )}

      {/* Chart container */}
      <div ref={containerRef} className="relative">
        <LightweightChart
          data={chartData}
          series={series}
          priceLines={priceLines}
          height={height}
          formatValue={formatCurrencyCompact}
          formatTime={formatTime}
          onCrosshairMove={setTooltipData}
          enableCrosshair
          enableZoom
        />

        {/* Custom tooltip */}
        <ChartTooltip data={tooltipData} containerRef={containerRef} />
      </div>

      {/* Legend */}
      {priceLines.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <ChartLegend priceLines={priceLines} />
        </div>
      )}
    </div>
  );
}
