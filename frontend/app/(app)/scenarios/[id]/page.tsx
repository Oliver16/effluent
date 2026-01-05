'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scenarios } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Play, Plus } from 'lucide-react';
import { ScenarioChanges } from '@/components/scenarios/scenario-changes';
import { ProjectionChart } from '@/components/scenarios/projection-chart';
import { ProjectionTable } from '@/components/scenarios/projection-table';
import { AddChangeDialog } from '@/components/scenarios/add-change-dialog';
import { AssumptionsForm } from '@/components/scenarios/assumptions-form';
import { Scenario, ScenarioProjection } from '@/lib/types';

function getScenarioList(data?: Scenario[] | { results: Scenario[] }) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results || [];
}

function isBaseline(scenario: Scenario) {
  return scenario.is_baseline === true || (scenario as Scenario & { isBaseline?: boolean }).isBaseline === true;
}

export default function ScenarioDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showAddChange, setShowAddChange] = useState(false);

  const scenarioId = id as string;

  const { data: scenario, isLoading } = useQuery({
    queryKey: ['scenarios', scenarioId],
    queryFn: () => scenarios.get(scenarioId).then(r => r),
  });

  const { data: projectionsData } = useQuery({
    queryKey: ['scenarios', scenarioId, 'projections'],
    queryFn: () => scenarios.getProjections(scenarioId).then(r => r),
    enabled: !!scenario,
  });

  const { data: allScenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => scenarios.list().then(r => r),
  });

  const baselineScenario = useMemo(() => {
    const list = getScenarioList(allScenarios);
    return list.find(isBaseline);
  }, [allScenarios]);

  const { data: baselineProjections } = useQuery({
    queryKey: ['scenarios', baselineScenario?.id, 'projections'],
    queryFn: () => scenarios.getProjections(baselineScenario?.id as string).then(r => r),
    enabled: !!baselineScenario && baselineScenario.id !== scenarioId,
  });

  const computeMutation = useMutation({
    mutationFn: () => scenarios.compute(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'projections'] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!scenario) return <div>Scenario not found.</div>;

  const projections = (projectionsData || []) as ScenarioProjection[];
  const hasProjections = projections.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{scenario.name}</h1>
          <p className="text-muted-foreground">{scenario.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          {hasProjections ? (
            <>
              <ProjectionChart
                projections={projections}
                compareProjections={baselineProjections as ScenarioProjection[]}
                compareLabel={baselineScenario?.name || 'Baseline'}
              />
              <ProjectionTable projections={projections} />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No projections yet. Add changes and click "Run Projection" to compute.
            </div>
          )}
        </TabsContent>

        <TabsContent value="changes">
          <ScenarioChanges scenarioId={scenarioId} initialChanges={scenario.changes || []} />
        </TabsContent>

        <TabsContent value="assumptions">
          <AssumptionsForm scenario={scenario} />
        </TabsContent>
      </Tabs>

      <AddChangeDialog
        open={showAddChange}
        onOpenChange={setShowAddChange}
        scenarioId={scenarioId}
      />
    </div>
  );
}
