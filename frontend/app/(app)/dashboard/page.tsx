'use client';

import { useQuery } from '@tanstack/react-query';
import { metrics, accounts, insights as insightsApi, baseline, goals, dataQuality } from '@/lib/api';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NorthStarCards } from '@/components/dashboard/north-star-cards';
import { ModelConfidenceCard } from '@/components/dashboard/model-confidence-card';
import { ActionPanel } from '@/components/dashboard/action-panel';
import { NetWorthChart } from '@/components/dashboard/net-worth-chart';
import { AccountsList } from '@/components/dashboard/accounts-list';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { BaselineProjectionCharts } from '@/components/baseline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Target, Lightbulb } from 'lucide-react';
import Link from 'next/link';

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

  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
  } = useQuery({
    queryKey: ['metrics', 'history'],
    queryFn: () => metrics.history(90),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const {
    data: accountsData,
    isLoading: accountsLoading,
    isError: accountsError,
  } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const {
    data: insightsData,
    isLoading: insightsLoading,
    isError: insightsError,
  } = useQuery({
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
    queryFn: () => dataQuality.report(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const isLoading = metricsLoading || baselineLoading || goalStatusLoading;
  const hasError = metricsError || historyError || accountsError || insightsError || baselineError || goalStatusError;

  // Build status subtitle from goal status
  const buildStatusSubtitle = () => {
    const results = goalStatusData?.results;
    if (!results || results.length === 0) return 'Set goals to track your financial health';

    const critical = results.filter(g => g.status === 'critical').length;
    const warning = results.filter(g => g.status === 'warning').length;
    const good = results.filter(g => g.status === 'good' || g.status === 'achieved').length;

    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (warning > 0) parts.push(`${warning} need attention`);
    if (good > 0) parts.push(`${good} on track`);

    return parts.join(' • ');
  };

  // Get overall status for badge
  const getOverallStatus = () => {
    const results = goalStatusData?.results;
    if (!results || results.length === 0) return { status: 'neutral' as const, label: 'No Goals' };

    const hasCritical = results.some(g => g.status === 'critical');
    const hasWarning = results.some(g => g.status === 'warning');

    if (hasCritical) return { status: 'critical' as const, label: 'Action Needed' };
    if (hasWarning) return { status: 'warning' as const, label: 'Attention' };
    return { status: 'good' as const, label: 'On Track' };
  };

  const overallStatus = getOverallStatus();

  // Sidebar content
  const sidebar = (
    <>
      <ModelConfidenceCard
        report={dataQualityData || null}
        isLoading={dataQualityLoading}
      />

      <ActionPanel
        metrics={metricsData || null}
        goalStatus={goalStatusData?.results || null}
        isLoading={goalStatusLoading}
      />

      <InsightsPanel
        insights={insightsData?.results || []}
        isLoading={insightsLoading}
      />
    </>
  );

  return (
    <PageShell variant="dashboard" sidebar={sidebar}>
      {/* Dashboard Header */}
      <PageHeader
        title="Dashboard"
        subtitle={buildStatusSubtitle()}
        left={
          !goalStatusLoading && goalStatusData?.results?.length ? (
            <StatusBadge
              status={overallStatus.status}
              statusLabel={overallStatus.label}
            />
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/goals">
                <Target className="h-4 w-4 mr-2" />
                Edit Goals
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/decisions">
                <Lightbulb className="h-4 w-4 mr-2" />
                Model a Decision
              </Link>
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {hasError && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>
            Some dashboard data failed to load. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* North Star Cards - Key metrics with goal status */}
      <div className="mt-6">
        <NorthStarCards
          metrics={metricsData || null}
          goalStatus={goalStatusData?.results || null}
          isLoading={isLoading}
        />
      </div>

      {/* Main content area */}
      <div className="mt-6 space-y-6">
        <NetWorthChart
          history={history?.results || []}
          isLoading={historyLoading}
        />

        {/* Baseline Projection Charts if available */}
        {baselineData?.baseline?.projections && baselineData.baseline.projections.length > 0 && (
          <BaselineProjectionCharts
            projections={baselineData.baseline.projections}
            months={12}
          />
        )}

        <AccountsList
          accounts={accountsData?.results || []}
          isLoading={accountsLoading}
        />
      </div>
    </PageShell>
  );
}
