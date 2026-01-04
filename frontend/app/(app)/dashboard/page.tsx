'use client';

import { useQuery } from '@tanstack/react-query';
import { metrics, accounts, insights as insightsApi } from '@/lib/api';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { NetWorthChart } from '@/components/dashboard/net-worth-chart';
import { AccountsList } from '@/components/dashboard/accounts-list';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { CashFlowSummary } from '@/components/dashboard/cash-flow-summary';

export default function DashboardPage() {
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['metrics', 'current'],
    queryFn: () => metrics.current().then(r => r),
  });

  const { data: history } = useQuery({
    queryKey: ['metrics', 'history'],
    queryFn: () => metrics.history(90).then(r => r),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list().then(r => r),
  });

  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: () => insightsApi.insights().then(r => r),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
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
