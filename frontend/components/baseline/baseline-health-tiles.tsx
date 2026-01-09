'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, formatDecimal } from '@/lib/utils';
import { Wallet, TrendingUp, Shield, PiggyBank, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { BaselineHealthMetrics, MetricValue } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BaselineHealthTilesProps {
  metrics: BaselineHealthMetrics | null;
  isLoading?: boolean;
}

function getTrendIcon(trend: MetricValue['trend']) {
  if (trend === 'up') return <ArrowUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <ArrowDown className="h-4 w-4 text-red-500" />;
  if (trend === 'stable') return <Minus className="h-4 w-4 text-muted-foreground" />;
  return null;
}

function getHealthStatus(metricName: string, value: string): 'ok' | 'warn' | 'critical' {
  const numValue = parseFloat(value);

  switch (metricName) {
    case 'dscr':
      if (numValue >= 1.5) return 'ok';
      if (numValue >= 1.0) return 'warn';
      return 'critical';
    case 'liquidity_months':
      if (numValue >= 3) return 'ok';
      if (numValue >= 1) return 'warn';
      return 'critical';
    case 'savings_rate':
      if (numValue >= 0.1) return 'ok';
      if (numValue >= 0) return 'warn';
      return 'critical';
    case 'monthly_surplus':
      if (numValue > 0) return 'ok';
      if (numValue === 0) return 'warn';
      return 'critical';
    default:
      return 'ok';
  }
}

function getStatusColor(status: 'ok' | 'warn' | 'critical'): string {
  switch (status) {
    case 'ok':
      return 'border-l-green-500';
    case 'warn':
      return 'border-l-yellow-500';
    case 'critical':
      return 'border-l-red-500';
  }
}

export function BaselineHealthTiles({ metrics, isLoading }: BaselineHealthTilesProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-20" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-24 mb-2" />
              <div className="h-3 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No metrics data available. Complete onboarding to see your baseline health.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tiles = [
    {
      key: 'net_worth',
      title: 'Net Worth',
      value: formatCurrency(metrics.net_worth.value),
      metric: metrics.net_worth,
      icon: Wallet,
    },
    {
      key: 'monthly_surplus',
      title: 'Monthly Surplus',
      value: formatCurrency(metrics.monthly_surplus.value),
      metric: metrics.monthly_surplus,
      icon: TrendingUp,
    },
    {
      key: 'liquidity_months',
      title: 'Liquidity',
      value: `${formatDecimal(metrics.liquidity_months.value, 1)} months`,
      metric: metrics.liquidity_months,
      icon: PiggyBank,
    },
    {
      key: 'savings_rate',
      title: 'Savings Rate',
      value: formatPercent(metrics.savings_rate.value),
      metric: metrics.savings_rate,
      icon: TrendingUp,
    },
    {
      key: 'dscr',
      title: 'DSCR',
      value: formatDecimal(metrics.dscr.value, 2),
      metric: metrics.dscr,
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Baseline Health</h2>
        <p className="text-sm text-muted-foreground">as of {metrics.as_of_date}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((tile) => {
          const status = getHealthStatus(tile.key, tile.metric.value);
          return (
            <Card
              key={tile.key}
              className={cn('border-l-4', getStatusColor(status))}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tile.title}
                </CardTitle>
                <tile.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{tile.value}</span>
                  {getTrendIcon(tile.metric.trend)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
