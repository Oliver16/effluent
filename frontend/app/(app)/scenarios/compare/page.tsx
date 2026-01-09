'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart } from '@tremor/react';
import { scenarios } from '@/lib/api';
import { Scenario, ScenarioProjection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { formatCurrencyCompact } from '@/lib/format';

interface ComparisonResult {
  scenario: Scenario;
  projections: ScenarioProjection[];
}

export default function ScenarioComparePage() {
  const [selected, setSelected] = useState<string[]>([]);

  const { data: scenarioList = [] } = useQuery({
    queryKey: ['scenarios'],
    queryFn: scenarios.list,
  });

  // Use the backend compare endpoint for efficient batch comparison
  const { data: compareData, isLoading: isComparing } = useQuery({
    queryKey: ['scenarios', 'compare', selected],
    queryFn: () => scenarios.compare(selected),
    enabled: selected.length > 0,
  });

  const comparisons = useMemo(() => {
    if (!compareData?.results) return [];
    return compareData.results as ComparisonResult[];
  }, [compareData]);

  const chartData = useMemo(() => {
    const maxLength = Math.max(0, ...comparisons.map((item) => item.projections.length));
    const dataRows = [] as Array<Record<string, string | number>>;

    for (let idx = 0; idx < maxLength; idx += 1) {
      const row: Record<string, string | number> = { month: `M${idx + 1}` };
      comparisons.forEach(({ scenario, projections }, scenarioIndex) => {
        const label = scenario?.name || `Scenario ${scenarioIndex + 1}`;
        const projection = projections[idx];
        if (projection) {
          row[label] = parseFloat(projection.netWorth);
        }
      });
      dataRows.push(row);
    }

    return dataRows;
  }, [comparisons]);

  const categories = comparisons
    .map((item, index) => item.scenario?.name || `Scenario ${index + 1}`)
    .filter(Boolean);

  const handleToggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compare Scenarios</h1>
        <p className="text-sm text-muted-foreground">
          Select scenarios to compare their net worth trajectories.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select scenarios</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {scenarioList.map((scenario) => (
            <Button
              key={scenario.id}
              variant={selected.includes(scenario.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggle(scenario.id)}
            >
              {scenario.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      {selected.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Select at least one scenario to compare.
        </div>
      ) : isComparing ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading comparison data...
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length ? (
                <AreaChart
                  className="h-80"
                  data={chartData}
                  index="month"
                  categories={categories}
                  colors={['blue', 'emerald', 'amber', 'violet']}
                  valueFormatter={(value) => formatCurrencyCompact(value)}
                  showLegend
                  showGridLines={false}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Run projections for each scenario to see comparison data.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {comparisons.map(({ scenario, projections }, index) => {
              const firstProjection = projections[0];
              const lastProjection = projections[projections.length - 1];
              return (
                <Card key={scenario?.id || index}>
                  <CardHeader>
                    <CardTitle className="text-base">{scenario?.name || 'Scenario'}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {lastProjection ? (
                      <div className="space-y-2">
                        <div>
                          Final Net Worth: <span className="font-medium text-foreground">
                            {formatCurrency(lastProjection.netWorth)}
                          </span>
                        </div>
                        <div>
                          Monthly Cash Flow: <span className={`font-medium ${parseFloat(firstProjection?.netCashFlow || '0') >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(firstProjection?.netCashFlow || '0')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>No projections yet.</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
