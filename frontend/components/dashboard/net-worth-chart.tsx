'use client';

import { InstrumentPanel } from '@/components/ui/InstrumentPanel';
import { ChartSkeleton } from '@/components/ui/Skeletons';
import { AreaChart } from '@tremor/react';
import { MetricSnapshot } from '@/lib/types';
import { formatCurrencyCompact } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Rocket, Plus } from 'lucide-react';
import Link from 'next/link';
import { TYPOGRAPHY } from '@/lib/design-tokens';

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
      <InstrumentPanel
        title="Net Worth Trajectory"
        subtitle="Track your wealth over time"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <h3 className={TYPOGRAPHY.sectionTitle}>Set up your financial cockpit</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Add your accounts and income to start tracking your net worth trajectory.
          </p>
          <div className="flex gap-3 mt-6">
            <Button asChild>
              <Link href="/accounts">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/flows">
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Link>
            </Button>
          </div>
        </div>
      </InstrumentPanel>
    );
  }

  const data = history
    .map((h) => ({
      date: h.asOfDate,
      'Market Value': parseFloat(h.netWorthMarket) || 0,
      'Cost Basis': parseFloat(h.netWorthCost) || 0,
    }))
    .reverse();

  return (
    <InstrumentPanel
      title="Net Worth Trajectory"
      subtitle={`${history.length} month${history.length !== 1 ? 's' : ''} of history`}
      footer={
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Market Value
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Cost Basis
          </span>
        </div>
      }
    >
      <AreaChart
        className="h-72"
        data={data}
        index="date"
        categories={['Market Value', 'Cost Basis']}
        colors={['blue', 'emerald']}
        valueFormatter={(v) => formatCurrencyCompact(v)}
        showAnimation
        showLegend={false}
        showGridLines={false}
      />
    </InstrumentPanel>
  );
}
