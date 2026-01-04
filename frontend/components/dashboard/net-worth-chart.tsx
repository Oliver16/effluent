import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart } from '@tremor/react';
import { MetricSnapshot } from '@/lib/types';

interface NetWorthChartProps {
  history: MetricSnapshot[];
}

export function NetWorthChart({ history }: NetWorthChartProps) {
  const data = history.map(h => ({
    date: h.asOfDate,
    'Market Value': parseFloat(h.netWorthMarket),
    'Cost Basis': parseFloat(h.netWorthCost),
  })).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Trajectory</CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChart
          className="h-72"
          data={data}
          index="date"
          categories={['Market Value', 'Cost Basis']}
          colors={['blue', 'emerald']}
          valueFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
        />
      </CardContent>
    </Card>
  );
}
