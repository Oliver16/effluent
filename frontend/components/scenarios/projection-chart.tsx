'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart } from '@tremor/react';
import { ScenarioProjection } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface ProjectionChartProps {
  projections: ScenarioProjection[];
  compareProjections?: ScenarioProjection[];
  compareLabel?: string;
}

export function ProjectionChart({
  projections,
  compareProjections,
  compareLabel = 'Baseline',
}: ProjectionChartProps) {
  const data = projections.map((projection, index) => {
    const row: Record<string, number | string> = {
      month: `M${projection.month_number + 1}`,
      Scenario: parseFloat(projection.net_worth),
    };

    if (compareProjections?.[index]) {
      row[compareLabel] = parseFloat(compareProjections[index].net_worth);
    }

    return row;
  });

  const categories = ['Scenario'];
  if (compareProjections?.length) {
    categories.push(compareLabel);
  }

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
          colors={compareProjections?.length ? ['blue', 'slate'] : ['blue']}
          valueFormatter={(value) => formatCurrency(value)}
        />
      </CardContent>
    </Card>
  );
}
