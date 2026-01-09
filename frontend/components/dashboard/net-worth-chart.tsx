'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { ChartSkeleton } from '@/components/ui/Skeletons';
import { AreaChart } from '@tremor/react';
import { MetricSnapshot } from '@/lib/types';
import { formatCurrencyCompact } from '@/lib/format';

interface NetWorthChartProps {
  history: MetricSnapshot[];
  isLoading?: boolean;
}

export function NetWorthChart({ history, isLoading }: NetWorthChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!history || history.length === 0) {
    return (
      <SectionCard title="Net Worth Trajectory">
        <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">
          No historical data available yet
        </div>
      </SectionCard>
    );
  }

  const data = history.map(h => ({
    date: h.asOfDate,
    'Market Value': parseFloat(h.netWorthMarket) || 0,
    'Cost Basis': parseFloat(h.netWorthCost) || 0,
  })).reverse();

  return (
    <SectionCard title="Net Worth Trajectory">
      <AreaChart
        className="h-72"
        data={data}
        index="date"
        categories={['Market Value', 'Cost Basis']}
        colors={['blue', 'emerald']}
        valueFormatter={(v) => formatCurrencyCompact(v)}
        showAnimation
        showLegend
        showGridLines={false}
      />
    </SectionCard>
  );
}
