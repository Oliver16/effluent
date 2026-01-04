# Task 11: Scenario UI

## Objective
Build the scenario modeling interface with change builder, projection charts, and scenario comparison.

## Prerequisites
- Task 7 (Frontend Setup) completed
- Task 10 (Scenario Engine) backend completed

## Deliverables
1. Scenario list page
2. Scenario detail/edit page
3. Change builder form
4. Projection charts (net worth, cash flow)
5. Scenario comparison view
6. Scenario templates

---

## app/(app)/scenarios/page.tsx

```tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenarios } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Copy, Trash2, Play } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ScenariosPage() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => scenarios.list().then(r => r.data),
  });
  
  const createMutation = useMutation({
    mutationFn: (data: any) => scenarios.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenarios'] }),
  });
  
  const createBaseline = () => {
    createMutation.mutate({
      name: 'Current Trajectory',
      description: 'Baseline projection from current state',
      is_baseline: true,
      projection_months: 60,
    });
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  const scenariosList = data?.results || [];
  const baseline = scenariosList.find((s: any) => s.is_baseline);
  const others = scenariosList.filter((s: any) => !s.is_baseline);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Scenarios</h1>
        <div className="space-x-2">
          {!baseline && (
            <Button onClick={createBaseline}>
              <Plus className="h-4 w-4 mr-2" />
              Create Baseline
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/scenarios/new">
              <Plus className="h-4 w-4 mr-2" />
              New Scenario
            </Link>
          </Button>
        </div>
      </div>
      
      {baseline && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{baseline.name} (Baseline)</span>
              <Link href={`/scenarios/${baseline.id}`}>
                <Button size="sm">View</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{baseline.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Projection:</span>
                <span className="ml-2 font-medium">{baseline.projection_months} months</span>
              </div>
              <div>
                <span className="text-muted-foreground">Final Net Worth:</span>
                <span className="ml-2 font-medium">
                  {baseline.final_net_worth ? formatCurrency(baseline.final_net_worth) : 'Not computed'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {others.map((scenario: any) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {scenario.description || 'No description'}
        </p>
        <div className="mt-4 text-sm">
          <span className="text-muted-foreground">Changes:</span>
          <span className="ml-2 font-medium">{scenario.changes_count || 0}</span>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <Link href={`/scenarios/${scenario.id}`}>
            <Button size="sm">Open</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## app/(app)/scenarios/[id]/page.tsx

```tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenarios } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Play, Plus } from 'lucide-react';
import { ScenarioChanges } from '@/components/scenarios/scenario-changes';
import { ProjectionChart } from '@/components/scenarios/projection-chart';
import { ProjectionTable } from '@/components/scenarios/projection-table';
import { AddChangeDialog } from '@/components/scenarios/add-change-dialog';

export default function ScenarioDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showAddChange, setShowAddChange] = useState(false);
  
  const { data: scenario, isLoading } = useQuery({
    queryKey: ['scenarios', id],
    queryFn: () => scenarios.get(id as string).then(r => r.data),
  });
  
  const { data: projections } = useQuery({
    queryKey: ['scenarios', id, 'projections'],
    queryFn: () => scenarios.getProjections(id as string).then(r => r.data),
    enabled: !!scenario,
  });
  
  const computeMutation = useMutation({
    mutationFn: () => scenarios.compute(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', id, 'projections'] });
    },
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{scenario.name}</h1>
          <p className="text-muted-foreground">{scenario.description}</p>
        </div>
        <div className="space-x-2">
          <Button onClick={() => setShowAddChange(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Change
          </Button>
          <Button onClick={() => computeMutation.mutate()} disabled={computeMutation.isPending}>
            <Play className="h-4 w-4 mr-2" />
            {computeMutation.isPending ? 'Computing...' : 'Run Projection'}
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="projection">
        <TabsList>
          <TabsTrigger value="projection">Projection</TabsTrigger>
          <TabsTrigger value="changes">Changes ({scenario.changes?.length || 0})</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projection" className="space-y-6">
          {projections?.results?.length > 0 ? (
            <>
              <ProjectionChart projections={projections.results} />
              <ProjectionTable projections={projections.results} />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No projections yet. Add changes and click "Run Projection" to compute.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="changes">
          <ScenarioChanges scenarioId={id as string} changes={scenario.changes || []} />
        </TabsContent>
        
        <TabsContent value="assumptions">
          <AssumptionsForm scenario={scenario} />
        </TabsContent>
      </Tabs>
      
      <AddChangeDialog 
        open={showAddChange} 
        onOpenChange={setShowAddChange}
        scenarioId={id as string}
      />
    </div>
  );
}
```

---

## components/scenarios/projection-chart.tsx

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Props {
  projections: any[];
  compareProjections?: any[];
}

export function ProjectionChart({ projections, compareProjections }: Props) {
  const data = projections.map((p, i) => ({
    month: p.month_number,
    date: p.projection_date,
    netWorth: parseFloat(p.net_worth),
    assets: parseFloat(p.total_assets),
    liabilities: parseFloat(p.total_liabilities),
    ...(compareProjections?.[i] && {
      compareNetWorth: parseFloat(compareProjections[i].net_worth),
    }),
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <XAxis 
                dataKey="month" 
                tickFormatter={(m) => `M${m}`}
              />
              <YAxis 
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(v: number) => formatCurrency(v)}
                labelFormatter={(m) => `Month ${m}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="netWorth" 
                name="Net Worth"
                stroke="#2563eb" 
                fill="#3b82f6" 
                fillOpacity={0.3}
              />
              {compareProjections && (
                <Area 
                  type="monotone" 
                  dataKey="compareNetWorth" 
                  name="Baseline"
                  stroke="#9ca3af" 
                  fill="#d1d5db" 
                  fillOpacity={0.3}
                  strokeDasharray="5 5"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## components/scenarios/add-change-dialog.tsx

```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scenarios } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CHANGE_TYPES = [
  { value: 'add_income', label: 'Add Income', fields: ['amount', 'frequency', 'category'] },
  { value: 'remove_income', label: 'Remove Income', fields: ['source_flow_id'] },
  { value: 'add_expense', label: 'Add Expense', fields: ['amount', 'frequency', 'category'] },
  { value: 'remove_expense', label: 'Remove Expense', fields: ['source_flow_id'] },
  { value: 'add_debt', label: 'Add Debt', fields: ['principal', 'rate', 'term_months', 'payment'] },
  { value: 'payoff_debt', label: 'Accelerate Payoff', fields: ['source_account_id', 'extra_monthly'] },
  { value: 'lump_sum_income', label: 'One-time Income', fields: ['amount'] },
  { value: 'lump_sum_expense', label: 'One-time Expense', fields: ['amount'] },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
}

export function AddChangeDialog({ open, onOpenChange, scenarioId }: Props) {
  const queryClient = useQueryClient();
  const [changeType, setChangeType] = useState('');
  const [name, setName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  
  const mutation = useMutation({
    mutationFn: (data: any) => scenarios.addChange(scenarioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId] });
      onOpenChange(false);
      resetForm();
    },
  });
  
  const resetForm = () => {
    setChangeType('');
    setName('');
    setEffectiveDate('');
    setParams({});
  };
  
  const handleSubmit = () => {
    const parameters: Record<string, any> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (['amount', 'principal', 'payment', 'extra_monthly'].includes(key)) {
        parameters[key] = parseFloat(value);
      } else if (['rate'].includes(key)) {
        parameters[key] = parseFloat(value) / 100;
      } else if (['term_months'].includes(key)) {
        parameters[key] = parseInt(value);
      } else {
        parameters[key] = value;
      }
    });
    
    mutation.mutate({
      change_type: changeType,
      name,
      effective_date: effectiveDate,
      parameters,
    });
  };
  
  const selectedType = CHANGE_TYPES.find(t => t.value === changeType);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Change</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Change Type</Label>
            <Select value={changeType} onValueChange={setChangeType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., New job at ACME" />
          </div>
          
          <div>
            <Label>Effective Date</Label>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </div>
          
          {selectedType?.fields.includes('amount') && (
            <div>
              <Label>Amount ($)</Label>
              <Input 
                type="number" 
                value={params.amount || ''} 
                onChange={e => setParams({...params, amount: e.target.value})}
              />
            </div>
          )}
          
          {selectedType?.fields.includes('frequency') && (
            <div>
              <Label>Frequency</Label>
              <Select value={params.frequency || ''} onValueChange={v => setParams({...params, frequency: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {selectedType?.fields.includes('principal') && (
            <>
              <div>
                <Label>Principal ($)</Label>
                <Input 
                  type="number" 
                  value={params.principal || ''} 
                  onChange={e => setParams({...params, principal: e.target.value})}
                />
              </div>
              <div>
                <Label>Interest Rate (%)</Label>
                <Input 
                  type="number" 
                  step="0.125"
                  value={params.rate || ''} 
                  onChange={e => setParams({...params, rate: e.target.value})}
                />
              </div>
              <div>
                <Label>Monthly Payment ($)</Label>
                <Input 
                  type="number" 
                  value={params.payment || ''} 
                  onChange={e => setParams({...params, payment: e.target.value})}
                />
              </div>
            </>
          )}
          
          {selectedType?.fields.includes('extra_monthly') && (
            <div>
              <Label>Extra Monthly Payment ($)</Label>
              <Input 
                type="number" 
                value={params.extra_monthly || ''} 
                onChange={e => setParams({...params, extra_monthly: e.target.value})}
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Adding...' : 'Add Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## lib/api.ts additions

```typescript
export const scenarios = {
  list: () => api.get('/scenarios/'),
  get: (id: string) => api.get(`/scenarios/${id}/`),
  create: (data: any) => api.post('/scenarios/', data),
  update: (id: string, data: any) => api.patch(`/scenarios/${id}/`, data),
  delete: (id: string) => api.delete(`/scenarios/${id}/`),
  compute: (id: string) => api.post(`/scenarios/${id}/compute/`),
  getProjections: (id: string) => api.get(`/scenarios/${id}/projections/`),
  addChange: (id: string, data: any) => api.post(`/scenarios/${id}/changes/`, data),
  updateChange: (id: string, changeId: string, data: any) => 
    api.patch(`/scenarios/${id}/changes/${changeId}/`, data),
  deleteChange: (id: string, changeId: string) => 
    api.delete(`/scenarios/${id}/changes/${changeId}/`),
  compare: (ids: string[]) => api.post('/scenarios/compare/', { scenario_ids: ids }),
};
```

---

## Acceptance Criteria
- [ ] Scenario list shows baseline and others
- [ ] Can create new scenarios
- [ ] Change builder supports all change types
- [ ] Projection chart shows net worth over time
- [ ] Projection table shows monthly data
- [ ] Can compare scenarios
- [ ] Assumptions editable
