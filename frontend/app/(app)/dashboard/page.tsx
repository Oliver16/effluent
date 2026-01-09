'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { metrics, accounts, insights as insightsApi, baseline } from '@/lib/api';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { NetWorthChart } from '@/components/dashboard/net-worth-chart';
import { AccountsList } from '@/components/dashboard/accounts-list';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { CashFlowSummary } from '@/components/dashboard/cash-flow-summary';
import { DecisionPicker } from '@/components/decisions/decision-picker';
import { BaselineHealthTiles, BaselineStatus, BaselineProjectionCharts } from '@/components/baseline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';

export default function DashboardPage() {
  const [decisionPickerOpen, setDecisionPickerOpen] = useState(false);
  const { data: metricsData, isLoading, isError: metricsError } = useQuery({
    queryKey: ['metrics', 'current'],
    queryFn: () => metrics.current(),
  });

  const { data: history, isError: historyError } = useQuery({
    queryKey: ['metrics', 'history'],
    queryFn: () => metrics.history(90),
  });

  const { data: accountsData, isError: accountsError } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list(),
  });

  const { data: insightsData, isError: insightsError } = useQuery({
    queryKey: ['insights'],
    queryFn: () => insightsApi.insights(),
  });

  const {
    data: baselineData,
    isLoading: baselineLoading,
    isError: baselineError,
    refetch: refetchBaseline,
  } = useQuery({
    queryKey: ['baseline'],
    queryFn: () => baseline.get(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const hasError = metricsError || historyError || accountsError || insightsError || baselineError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => setDecisionPickerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Decision
        </Button>
      </div>

      <DecisionPicker open={decisionPickerOpen} onOpenChange={setDecisionPickerOpen} />

      {hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>
            Some dashboard data failed to load. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* Baseline Health Section */}
      <BaselineHealthTiles
        metrics={baselineData?.health?.metrics || null}
        isLoading={baselineLoading}
      />

      {/* Baseline Projection Charts */}
      {baselineData?.baseline?.projections && baselineData.baseline.projections.length > 0 && (
        <BaselineProjectionCharts
          projections={baselineData.baseline.projections}
          months={12}
        />
      )}

      {/* Baseline Status */}
      <BaselineStatus
        health={baselineData?.health || null}
        onRefresh={() => refetchBaseline()}
      />

      <MetricCards metrics={metricsData} />
      <InsightsPanel insights={insightsData?.results || []} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetWorthChart history={history?.results || []} />
        <CashFlowSummary metrics={metricsData} />
      </div>
      <AccountsList accounts={accountsData?.results || []} />
    </div>
  );
}
