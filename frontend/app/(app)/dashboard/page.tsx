import { getDashboardData } from '@/lib/api/dashboard.server';
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
import type { GoalStatusResult } from '@/lib/types';

/**
 * Build status subtitle from goal status results
 */
function buildStatusSubtitle(results: GoalStatusResult[] | undefined): string {
  if (!results || results.length === 0) return 'Set goals to track your financial health';

  const critical = results.filter(g => g.status === 'critical').length;
  const warning = results.filter(g => g.status === 'warning').length;
  const good = results.filter(g => g.status === 'good' || g.status === 'achieved').length;

  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} critical`);
  if (warning > 0) parts.push(`${warning} need attention`);
  if (good > 0) parts.push(`${good} on track`);

  return parts.join(' • ');
}

/**
 * Get overall status for badge
 */
function getOverallStatus(results: GoalStatusResult[] | undefined): { status: 'neutral' | 'critical' | 'warning' | 'good'; label: string } {
  if (!results || results.length === 0) return { status: 'neutral', label: 'No Goals' };

  const hasCritical = results.some(g => g.status === 'critical');
  const hasWarning = results.some(g => g.status === 'warning');

  if (hasCritical) return { status: 'critical', label: 'Action Needed' };
  if (hasWarning) return { status: 'warning', label: 'Attention' };
  return { status: 'good', label: 'On Track' };
}

/**
 * Dashboard Page - Server Component
 *
 * Fetches data server-side for SSR/streaming and SEO.
 * Uses camelCase types with server-side response transformation.
 */
export default async function DashboardPage() {
  let data;
  let hasError = false;

  try {
    data = await getDashboardData();
  } catch {
    hasError = true;
    data = null;
  }

  const goalStatus = data?.goalStatus || [];
  const overallStatus = getOverallStatus(goalStatus);
  const statusSubtitle = buildStatusSubtitle(goalStatus);

  // Check for data quality errors - but only if we have data
  // Don't show error banner just because dataQuality is missing
  // The ModelConfidenceCard will handle displaying appropriate messaging
  const dataQualityHasError = false; // Previously: data && !data.dataQuality

  // Check if we have any actual data (user has set up their profile)
  const hasNoData = data && !data.metrics && data.accounts.length === 0;

  // Sidebar content
  const sidebar = (
    <>
      <ModelConfidenceCard
        report={data?.dataQuality || null}
        isLoading={false}
      />

      <ActionPanel
        metrics={data?.metrics || null}
        goalStatus={goalStatus}
        isLoading={false}
      />

      <InsightsPanel
        insights={data?.insights || []}
        isLoading={false}
      />
    </>
  );

  return (
    <PageShell variant="dashboard" sidebar={sidebar}>
      {/* Dashboard Header */}
      <PageHeader
        title="Dashboard"
        subtitle={statusSubtitle}
        left={
          goalStatus.length > 0 ? (
            <StatusBadge
              status={overallStatus.status}
              statusLabel={overallStatus.label}
            />
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/goals">
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
            Unable to load dashboard data. This could be due to a session timeout.{' '}
            <Link href="/login" className="underline font-medium">
              Try logging in again
            </Link>{' '}
            or refresh the page.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty data notice - user hasn't set up their profile yet */}
      {hasNoData && !hasError && (
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Welcome! Let&apos;s get started</AlertTitle>
          <AlertDescription>
            Your dashboard is empty because you haven&apos;t added any financial data yet.{' '}
            <Link href="/onboarding" className="underline font-medium">
              Complete your onboarding
            </Link>{' '}
            to see your financial health metrics.
          </AlertDescription>
        </Alert>
      )}

      {/* North Star Cards - Key metrics with goal status */}
      <div className="mt-6">
        <NorthStarCards
          metrics={data?.metrics || null}
          goalStatus={goalStatus}
          isLoading={false}
        />
      </div>

      {/* Main content area */}
      <div className="mt-6 space-y-6">
        <NetWorthChart
          history={data?.history || []}
          isLoading={false}
        />

        {/* Baseline Projection Charts if available */}
        {data?.baseline?.projections && data.baseline.projections.length > 0 && (
          <BaselineProjectionCharts
            projections={data.baseline.projections}
            months={12}
          />
        )}

        <AccountsList
          accounts={data?.accounts || []}
          isLoading={false}
        />
      </div>
    </PageShell>
  );
}
