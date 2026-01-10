'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';
import { LW_CHART_COLORS } from '@/lib/design-tokens';
import { LightweightChart, LightweightChartHandle } from './LightweightChart';
import { ChartTooltip } from './ChartTooltip';
import { ChartControls } from './ChartControls';
import { getTimeRangeFromPreset } from './useChartData';
import type {
  ComparisonChartProps,
  SeriesConfig,
  TooltipData,
  TimeRangePreset,
  ChartDataPoint,
} from './types';

export function ComparisonChart({
  data,
  scenarioName,
  baselineName,
  goals = [],
  height = 350,
  className,
}: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<LightweightChartHandle>(null);
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

  // Series configuration using design tokens
  const series = useMemo<SeriesConfig[]>(
    () => [
      {
        id: 'baseline',
        name: baselineName,
        type: 'line',
        dataKey: 'baseline',
        color: LW_CHART_COLORS.secondary.line,
        lineWidth: 2,
        lineStyle: 'dashed',
      },
      {
        id: 'scenario',
        name: scenarioName,
        type: 'area',
        dataKey: 'value',
        color: LW_CHART_COLORS.primary.line,
        fillColor: LW_CHART_COLORS.primary.fill,
        lineWidth: 2,
      },
    ],
    [scenarioName, baselineName]
  );

  // Price lines from goals using design tokens
  const priceLines = useMemo(() => {
    return goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      value: goal.value,
      color: goal.color ?? LW_CHART_COLORS.good,
      lineStyle: 'dashed' as const,
      lineWidth: 1,
      axisLabelVisible: true,
    }));
  }, [goals]);

  // Apply time range to chart when it changes
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    // Convert chartData to ChartDataPoint format for the helper
    const dataPoints: ChartDataPoint[] = chartData.map(d => ({
      time: d.time,
      value: d.value,
    }));

    if (timeRange === 'ALL') {
      chartRef.current.fitContent();
    } else {
      const { from, to } = getTimeRangeFromPreset(timeRange, dataPoints);
      chartRef.current.setVisibleRange(from, to);
    }
  }, [timeRange, chartData]);

  // Custom tooltip with difference using design tokens
  const handleCrosshairMove = useCallback(
    (data: TooltipData | null) => {
      if (data && data.values.length >= 2) {
        const baselineValue = data.values.find((v) => v.seriesId === 'baseline')?.value ?? 0;
        const scenarioValue = data.values.find((v) => v.seriesId === 'scenario')?.value ?? 0;
        const difference = scenarioValue - baselineValue;

        // Add difference to tooltip using design tokens
        data.values.push({
          seriesId: 'difference',
          seriesName: 'Difference',
          value: difference,
          valueFormatted: formatCurrencyCompact(difference),
          color: difference >= 0 ? LW_CHART_COLORS.good : LW_CHART_COLORS.critical,
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
          ref={chartRef}
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
