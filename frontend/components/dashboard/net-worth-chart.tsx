'use client';

import { useMemo } from 'react';
import { InstrumentPanel } from '@/components/ui/InstrumentPanel';
import { ChartSkeleton } from '@/components/ui/Skeletons';
import { MetricSnapshot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Rocket, Plus } from 'lucide-react';
import Link from 'next/link';
import { TYPOGRAPHY } from '@/lib/design-tokens';
import { LightweightChart } from '@/components/charts/lightweight';
import type { ChartDataPoint, SeriesConfig } from '@/components/charts/lightweight';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';

interface NetWorthChartProps {
  history: MetricSnapshot[];
  isLoading?: boolean;
}

// Chart color constants
const CHART_SERIES_COLORS = {
  blue: {
    line: 'rgb(59, 130, 246)', // blue-500
    fill: 'rgba(59, 130, 246, 0.15)',
  },
  emerald: {
    line: 'rgb(16, 185, 129)', // emerald-500
    fill: 'rgba(16, 185, 129, 0.1)',
  },
} as const;

export function NetWorthChart({ history, isLoading }: NetWorthChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!history || history.length === 0) {
    return (
      <InstrumentPanel title="Net Worth Trajectory" subtitle="Track your wealth over time">
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

  // Transform history data to chart format
  // History is in reverse chronological order, so we reverse it
  const chartData: Array<ChartDataPoint & { marketValue: number; costBasis: number }> =
    useMemo(() => {
      return [...history].reverse().map((h) => ({
        time: h.asOfDate,
        value: parseFloat(h.netWorthMarket) || 0,
        marketValue: parseFloat(h.netWorthMarket) || 0,
        costBasis: parseFloat(h.netWorthCost) || 0,
      }));
    }, [history]);

  // Series configuration
  const series: SeriesConfig[] = useMemo(
    () => [
      {
        id: 'marketValue',
        name: 'Market Value',
        type: 'area',
        dataKey: 'marketValue',
        color: CHART_SERIES_COLORS.blue.line,
        fillColor: CHART_SERIES_COLORS.blue.fill,
        lineWidth: 2,
      },
      {
        id: 'costBasis',
        name: 'Cost Basis',
        type: 'area',
        dataKey: 'costBasis',
        color: CHART_SERIES_COLORS.emerald.line,
        fillColor: CHART_SERIES_COLORS.emerald.fill,
        lineWidth: 2,
      },
    ],
    []
  );

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
      <LightweightChart
        data={chartData}
        series={series}
        height={288}
        formatValue={formatCurrencyCompact}
        formatTime={formatMonthYear}
        enableCrosshair
        enableZoom
      />
    </InstrumentPanel>
  );
}
