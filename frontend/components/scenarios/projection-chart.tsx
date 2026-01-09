'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart } from '@tremor/react';
import { ScenarioProjection } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface ProjectionChartProps {
  projections: ScenarioProjection[];
  compareProjections?: ScenarioProjection[];
  compareLabel?: string;
  scenarioLabel?: string;
}

export function ProjectionChart({
  projections,
  compareProjections,
  compareLabel = 'Baseline',
  scenarioLabel = 'Scenario',
}: ProjectionChartProps) {
  const hasComparison = compareProjections && compareProjections.length > 0;

  // Build chart data by aligning both projections by month number
  const data = useMemo(() => {
    // Create a map of month -> data for both projections
    const projectionsByMonth = new Map<number, { scenario?: number; baseline?: number }>();

    // Add scenario projections
    projections.forEach((projection) => {
      const monthNum = projection.month_number;
      const existing = projectionsByMonth.get(monthNum) || {};
      projectionsByMonth.set(monthNum, {
        ...existing,
        scenario: parseFloat(projection.net_worth),
      });
    });

    // Add comparison projections (baseline)
    if (hasComparison) {
      compareProjections.forEach((projection) => {
        const monthNum = projection.month_number;
        const existing = projectionsByMonth.get(monthNum) || {};
        projectionsByMonth.set(monthNum, {
          ...existing,
          baseline: parseFloat(projection.net_worth),
        });
      });
    }

    // Convert to sorted array
    const sortedMonths = Array.from(projectionsByMonth.keys()).sort((a, b) => a - b);

    return sortedMonths.map((monthNum) => {
      const values = projectionsByMonth.get(monthNum)!;
      const row: Record<string, number | string> = {
        month: `M${monthNum + 1}`,
      };

      if (values.scenario !== undefined) {
        row[scenarioLabel] = values.scenario;
      }
      if (hasComparison && values.baseline !== undefined) {
        row[compareLabel] = values.baseline;
      }

      return row;
    });
  }, [projections, compareProjections, hasComparison, scenarioLabel, compareLabel]);

  const categories = useMemo(() => {
    const cats = [scenarioLabel];
    if (hasComparison) {
      cats.push(compareLabel);
    }
    return cats;
  }, [scenarioLabel, compareLabel, hasComparison]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChart
          className="h-80"
          data={data}
          index="month"
          categories={categories}
          colors={hasComparison ? ['blue', 'emerald'] : ['blue']}
          valueFormatter={(value) => formatCurrency(value)}
          showLegend={true}
        />
      </CardContent>
    </Card>
  );
}
