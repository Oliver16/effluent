'use client';

import { useMemo } from 'react';
import { ScenarioProjection } from '@/lib/types';
import { ProjectionChart as LWProjectionChart } from '@/components/charts/lightweight';
import type { ChartDataPoint, PriceLineConfig } from '@/components/charts/lightweight';

interface ProjectionChartProps {
  projections: ScenarioProjection[];
  compareProjections?: ScenarioProjection[];
  compareLabel?: string;
  scenarioLabel?: string;
  goals?: Array<{
    id: string;
    label: string;
    value: number;
    color?: string;
  }>;
}

/**
 * Converts ScenarioProjection[] to ChartDataPoint[]
 */
function projectionsToChartData(projections: ScenarioProjection[]): ChartDataPoint[] {
  // Use today as start date
  const start = new Date();

  return projections.map((projection) => {
    const date = new Date(start);
    date.setMonth(date.getMonth() + projection.monthNumber);

    return {
      time: date.toISOString().split('T')[0], // YYYY-MM-DD format
      value: parseFloat(projection.netWorth) || 0,
    };
  });
}

export function ProjectionChart({
  projections,
  compareProjections,
  compareLabel = 'Baseline',
  scenarioLabel = 'Scenario',
  goals = [],
}: ProjectionChartProps) {
  // Convert projections to chart data format
  const chartData = useMemo(() => {
    return projectionsToChartData(projections);
  }, [projections]);

  // Convert baseline projections if provided
  const baselineData = useMemo(() => {
    if (!compareProjections || compareProjections.length === 0) return undefined;
    return projectionsToChartData(compareProjections);
  }, [compareProjections]);

  // Convert goals to price line format
  const priceLines = useMemo<PriceLineConfig[]>(() => {
    return goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      value: goal.value,
      color: goal.color ?? 'rgb(16, 185, 129)', // emerald-500
      lineStyle: 'dashed',
      lineWidth: 1,
      axisLabelVisible: true,
    }));
  }, [goals]);

  // If no projections, show empty state
  if (projections.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        No projection data available. Run the projection to see results.
      </div>
    );
  }

  return (
    <LWProjectionChart
      data={chartData}
      baselineData={baselineData}
      scenarioName={scenarioLabel}
      baselineName={compareLabel}
      goals={priceLines}
      height={320}
      initialRange="5Y"
      showControls={true}
    />
  );
}
