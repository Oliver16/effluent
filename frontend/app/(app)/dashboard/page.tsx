'use client';

import { useQuery } from '@tanstack/react-query';
import { metrics, accounts, insights as insightsApi, baseline, goals } from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { NorthStarCards } from '@/components/dashboard/north-star-cards';
import { ModelConfidenceCard } from '@/components/dashboard/model-confidence-card';
import { ActionPanel } from '@/components/dashboard/action-panel';
import { NetWorthChart } from '@/components/dashboard/net-worth-chart';
import { AccountsList } from '@/components/dashboard/accounts-list';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { BaselineProjectionCharts } from '@/components/baseline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useQuery({
    queryKey: ['metrics', 'current'],
    queryFn: () => metrics.current(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: history, isError: historyError } = useQuery({
    queryKey: ['metrics', 'history'],
    queryFn: () => metrics.history(90),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: accountsData, isError: accountsError } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: insightsData, isError: insightsError } = useQuery({
    queryKey: ['insights'],
    queryFn: () => insightsApi.insights(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const {
    data: baselineData,
    isLoading: baselineLoading,
    isError: baselineError,
  } = useQuery({
    queryKey: ['baseline'],
    queryFn: () => baseline.get(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const {
    data: goalStatusData,
    isLoading: goalStatusLoading,
    isError: goalStatusError,
  } = useQuery({
    queryKey: ['goals', 'status'],
    queryFn: () => goals.status(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const {
    data: dataQualityData,
    isLoading: dataQualityLoading,
    isError: dataQualityError,
  } = useQuery({
    queryKey: ['metrics', 'data-quality'],
    queryFn: () => metrics.dataQuality(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const isLoading = metricsLoading || baselineLoading || goalStatusLoading;
  const hasError = metricsError || historyError || accountsError || insightsError || baselineError || goalStatusError;

  return (
    <div className="space-y-6">
      {/* Dashboard Header with goal status summary and action buttons */}
      <DashboardHeader
        goalStatus={goalStatusData?.results || null}
        isLoading={goalStatusLoading}
      />

      {hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>
            Some dashboard data failed to load. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* North Star Cards - Key metrics with goal status */}
      <NorthStarCards
        metrics={metricsData}
        goalStatus={goalStatusData?.results || null}
        isLoading={isLoading}
      />

      {/* Main content area with sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main area - charts and accounts */}
        <div className="xl:col-span-2 space-y-6">
          <NetWorthChart history={history?.results || []} />

          {/* Baseline Projection Charts if available */}
          {baselineData?.baseline?.projections && baselineData.baseline.projections.length > 0 && (
            <BaselineProjectionCharts
              projections={baselineData.baseline.projections}
              months={12}
            />
          )}

          <AccountsList accounts={accountsData?.results || []} />
        </div>

        {/* Sidebar - confidence, actions, insights */}
        <div className="space-y-6">
          <ModelConfidenceCard
            report={dataQualityData || null}
            isLoading={dataQualityLoading}
          />

          <ActionPanel
            metrics={metricsData}
            goalStatus={goalStatusData?.results || null}
            isLoading={goalStatusLoading}
          />

          <InsightsPanel insights={insightsData?.results || []} />
        </div>
      </div>
    </div>
  );
}
