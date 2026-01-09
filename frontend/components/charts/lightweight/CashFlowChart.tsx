'use client';

import { useState, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';
import { LightweightChart } from './LightweightChart';
import { ChartTooltip } from './ChartTooltip';
import { ChartControls } from './ChartControls';
import type { CashFlowChartProps, SeriesConfig, TooltipData, TimeRangePreset } from './types';

// Chart color constants
const CHART_SERIES_COLORS = {
  primary: {
    line: 'rgb(139, 92, 246)', // violet-500
  },
  positive: 'rgb(16, 185, 129)', // emerald-500
  negative: 'rgb(239, 68, 68)', // red-500
} as const;

export function CashFlowChart({
  data,
  height = 300,
  showNet = true,
  className,
}: CashFlowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('1Y');
  const [seriesVisibility, setSeriesVisibility] = useState({
    income: true,
    expenses: true,
    net: true,
  });

  // Transform data for chart
  // We need to include 'value' for the base type, use net as default
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: point.time,
      value: point.net, // Default value for base type
      income: point.income,
      expenses: point.expenses,
      net: point.net,
    }));
  }, [data]);

  // Series configuration
  const series = useMemo<SeriesConfig[]>(() => {
    const result: SeriesConfig[] = [
      {
        id: 'income',
        name: 'Income',
        type: 'line',
        dataKey: 'income',
        color: CHART_SERIES_COLORS.positive,
        lineWidth: 2,
        visible: seriesVisibility.income,
      },
      {
        id: 'expenses',
        name: 'Expenses',
        type: 'line',
        dataKey: 'expenses',
        color: CHART_SERIES_COLORS.negative,
        lineWidth: 2,
        visible: seriesVisibility.expenses,
      },
    ];

    if (showNet) {
      result.push({
        id: 'net',
        name: 'Net Cash Flow',
        type: 'baseline', // Shows positive/negative fill
        dataKey: 'net',
        color: CHART_SERIES_COLORS.primary.line,
        lineWidth: 2,
        visible: seriesVisibility.net,
      });
    }

    return result;
  }, [showNet, seriesVisibility]);

  return (
    <div className={cn('relative', className)}>
      <div className="mb-3">
        <ChartControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          series={series}
          seriesVisibility={seriesVisibility}
          onSeriesVisibilityChange={(id, visible) =>
            setSeriesVisibility((prev) => ({ ...prev, [id]: visible }))
          }
        />
      </div>

      <div ref={containerRef} className="relative">
        <LightweightChart
          data={chartData}
          series={series}
          height={height}
          formatValue={formatCurrencyCompact}
          formatTime={formatMonthYear}
          onCrosshairMove={setTooltipData}
          enableCrosshair
          enableZoom
        />

        <ChartTooltip data={tooltipData} containerRef={containerRef} />
      </div>
    </div>
  );
}
