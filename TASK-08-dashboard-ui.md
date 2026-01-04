# Task 8: Dashboard UI Components

## Objective
Build the main dashboard with metrics cards, net worth chart, account list, and insights panel.

## Prerequisites
- Task 7 (Frontend Setup) completed
- Task 5 (Metrics) backend completed

## Deliverables
1. Dashboard page layout
2. Metric cards (Net Worth, DSCR, Liquidity, Savings Rate)
3. Net worth trajectory chart
4. Account list with balance update modal
5. Insights panel
6. Cash flow summary

---

## app/(app)/dashboard/page.tsx

```tsx
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
    queryFn: () => metrics.current().then(r => r.data),
  });
  
  const { data: history } = useQuery({
    queryKey: ['metrics', 'history'],
    queryFn: () => metrics.history(90).then(r => r.data),
  });
  
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list().then(r => r.data),
  });
  
  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: () => insightsApi.insights().then(r => r.data),
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
```

---

## components/dashboard/metric-cards.tsx

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, formatDecimal } from '@/lib/utils';
import { Wallet, Shield, PiggyBank, TrendingUp } from 'lucide-react';

export function MetricCards({ metrics }) {
  const cards = [
    {
      title: 'Net Worth',
      value: formatCurrency(metrics.net_worth_market),
      subtitle: `Cost basis: ${formatCurrency(metrics.net_worth_cost)}`,
      icon: Wallet,
    },
    {
      title: 'Monthly Surplus',
      value: formatCurrency(metrics.monthly_surplus),
      subtitle: `${formatPercent(metrics.savings_rate)} savings rate`,
      icon: TrendingUp,
    },
    {
      title: 'DSCR',
      value: formatDecimal(metrics.dscr, 2),
      subtitle: getDSCRLabel(parseFloat(metrics.dscr)),
      icon: Shield,
    },
    {
      title: 'Liquidity',
      value: `${formatDecimal(metrics.liquidity_months, 1)} mo`,
      subtitle: 'Emergency fund',
      icon: PiggyBank,
    },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getDSCRLabel(dscr: number): string {
  if (dscr >= 2) return 'Excellent';
  if (dscr >= 1.5) return 'Good';
  if (dscr >= 1) return 'Adequate';
  return 'Critical';
}
```

---

## components/dashboard/net-worth-chart.tsx

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart } from '@tremor/react';

export function NetWorthChart({ history }) {
  const data = history.map(h => ({
    date: h.as_of_date,
    'Market Value': parseFloat(h.net_worth_market),
    'Cost Basis': parseFloat(h.net_worth_cost),
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
```

---

## components/dashboard/accounts-list.tsx

```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { accounts as api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

const LIABILITY_TYPES = new Set([
  'credit_card', 'heloc', 'primary_mortgage', 'auto_loan', 
  'student_loan_federal', 'student_loan_private', 'personal_loan'
]);

export function AccountsList({ accounts }) {
  const [selected, setSelected] = useState(null);
  const [balance, setBalance] = useState('');
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: ({ id, balance }) => 
      api.updateBalance(id, balance, new Date().toISOString().split('T')[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
      setOpen(false);
    },
  });
  
  const assets = accounts.filter(a => !LIABILITY_TYPES.has(a.account_type));
  const liabilities = accounts.filter(a => LIABILITY_TYPES.has(a.account_type));
  
  const openUpdate = (acct) => {
    setSelected(acct);
    setBalance(acct.current_balance);
    setOpen(true);
  };
  
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {assets.map(a => (
              <div key={a.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{a.institution}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(a.current_balance)}</span>
                  <Button variant="ghost" size="sm" onClick={() => openUpdate(a)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {liabilities.map(a => (
              <div key={a.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{a.institution}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-600">{formatCurrency(a.current_balance)}</span>
                  <Button variant="ghost" size="sm" onClick={() => openUpdate(a)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update: {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>New Balance</Label>
              <Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} />
            </div>
            <Button onClick={() => mutation.mutate({ id: selected.id, balance })} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## components/dashboard/insights-panel.tsx

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { insights as api } from '@/lib/api';
import { AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react';

export function InsightsPanel({ insights }) {
  const qc = useQueryClient();
  const dismiss = useMutation({
    mutationFn: (id) => api.dismissInsight(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
  
  const active = insights.filter(i => !i.is_dismissed);
  if (!active.length) return null;
  
  return (
    <div className="space-y-2">
      {active.map(i => (
        <Alert key={i.id} variant={i.severity === 'critical' ? 'destructive' : 'default'}>
          {i.severity === 'critical' ? <AlertTriangle className="h-4 w-4" /> : 
           i.severity === 'positive' ? <CheckCircle className="h-4 w-4" /> : 
           <AlertCircle className="h-4 w-4" />}
          <AlertTitle className="flex justify-between">
            {i.title}
            <Button variant="ghost" size="sm" onClick={() => dismiss.mutate(i.id)}>
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            {i.description}
            {i.recommendation && <p className="mt-1 font-medium">{i.recommendation}</p>}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

## components/dashboard/cash-flow-summary.tsx

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function CashFlowSummary({ metrics }) {
  const income = parseFloat(metrics.total_monthly_income || '0');
  const expenses = parseFloat(metrics.total_monthly_expenses || '0');
  const surplus = parseFloat(metrics.monthly_surplus);
  
  return (
    <Card>
      <CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-green-500" />
            <span>Income</span>
          </div>
          <span className="font-semibold text-green-600">{formatCurrency(income)}</span>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-red-500" />
            <span>Expenses</span>
          </div>
          <span className="font-semibold text-red-600">{formatCurrency(expenses)}</span>
        </div>
        <hr />
        <div className="flex justify-between">
          <span className="font-medium">Surplus</span>
          <span className={`font-bold text-lg ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(surplus)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Savings Rate: {formatPercent(metrics.savings_rate)} | DTI: {formatPercent(metrics.dti_ratio)}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Acceptance Criteria
- [ ] Dashboard displays all metric cards
- [ ] Net worth chart shows history with Tremor
- [ ] Accounts list shows assets and liabilities
- [ ] Balance update modal works
- [ ] Insights panel shows and dismisses alerts
- [ ] Cash flow summary accurate
- [ ] Responsive layout
