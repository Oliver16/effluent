'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { scenarios } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Scenario } from '@/lib/types';

function isBaseline(scenario: Scenario) {
  // Handle both camelCase (from type) and snake_case (from API before conversion)
  return scenario.isBaseline === true;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function ScenariosPage() {
  const queryClient = useQueryClient();

  const { data: scenarioList = [], isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: scenarios.list,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Scenario>) => scenarios.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenarios'] }),
  });

  const createBaseline = () => {
    createMutation.mutate({
      name: 'Current Trajectory',
      description: 'Baseline projection from current state',
      isBaseline: true,
      projectionMonths: 60,
      startDate: todayString(),
    });
  };

  if (isLoading) return <div>Loading...</div>;
  const baseline = scenarioList.find(isBaseline);
  const others = scenarioList.filter((scenario) => !isBaseline(scenario));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scenarios</h1>
          <p className="text-sm text-muted-foreground">
            Model financial what-if scenarios and compare outcomes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button variant="ghost" asChild>
            <Link href="/scenarios/compare">
              Compare Scenarios
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      {baseline && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{baseline.name} (Baseline)</span>
              <Button size="sm" asChild>
                <Link href={`/scenarios/${baseline.id}`}>View</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{baseline.description || 'Baseline scenario for comparison.'}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <span className="text-muted-foreground">Projection:</span>
                <span className="ml-2 font-medium">{baseline.projectionMonths || 60} months</span>
              </div>
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <span className="ml-2 font-medium">{formatDate(baseline.startDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <span className="ml-2 font-medium">{formatDate(baseline.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {others.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground line-clamp-2">
          {scenario.description || 'No description provided.'}
        </p>
        <div>
          <span className="text-muted-foreground">Projection:</span>
          <span className="ml-2 font-medium">{scenario.projectionMonths || 60} months</span>
        </div>
        <div>
          <span className="text-muted-foreground">Start Date:</span>
          <span className="ml-2 font-medium">{formatDate(scenario.startDate)}</span>
        </div>
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link href={`/scenarios/${scenario.id}`}>Open</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
