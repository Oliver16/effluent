'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scenarios } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScenarioContextBar } from '@/components/layout/ScenarioContextBar';
import { CockpitLayout } from '@/components/layout/CockpitLayout';
import { InstrumentPanel } from '@/components/ui/InstrumentPanel';
import { SystemAlert } from '@/components/ui/SystemAlert';
import { MetricRow, MetricRowHeader } from '@/components/ui/MetricRow';
import { DriversBlock } from '@/components/ui/DriversBlock';
import { ScenarioChanges } from '@/components/scenarios/scenario-changes';
import { ProjectionChart } from '@/components/scenarios/projection-chart';
import { ProjectionTable } from '@/components/scenarios/projection-table';
import { AddChangeDialog } from '@/components/scenarios/add-change-dialog';
import { AssumptionsForm } from '@/components/scenarios/assumptions-form';
import { MilestoneComparison } from '@/components/scenarios/milestone-comparison';
import { LifeEventTemplatesDialog } from '@/components/scenarios/life-event-templates';
import { MergeScenarioDialog } from '@/components/scenarios/merge-scenario-dialog';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Scenario, ScenarioProjection } from '@/lib/types';

function isBaselineScenario(scenario: Scenario) {
  return scenario.isBaseline === true;
}

export default function ScenarioDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showAddChange, setShowAddChange] = useState(false);
  const [showLifeEvents, setShowLifeEvents] = useState(false);
  const [showMerge, setShowMerge] = useState(false);

  const scenarioId = id as string;

  const { data: scenario, isLoading } = useQuery({
    queryKey: ['scenarios', scenarioId],
    queryFn: () => scenarios.get(scenarioId),
  });

  const { data: projectionsData, error: projectionsError } = useQuery({
    queryKey: ['scenarios', scenarioId, 'projections'],
    queryFn: () => scenarios.getProjections(scenarioId),
    enabled: !!scenario,
  });

  const { data: allScenarios = [] } = useQuery({
    queryKey: ['scenarios'],
    queryFn: scenarios.list,
  });

  const baselineScenario = useMemo(() => {
    return allScenarios.find(isBaselineScenario);
  }, [allScenarios]);

  const { data: baselineProjections } = useQuery({
    queryKey: ['scenarios', baselineScenario?.id, 'projections'],
    queryFn: () => scenarios.getProjections(baselineScenario?.id as string),
    enabled: !!baselineScenario && baselineScenario.id !== scenarioId,
  });

  const computeMutation = useMutation({
    mutationFn: () => scenarios.compute(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'projections'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className={cn(SPACING.pageGutter)}>
        <SystemAlert tone="critical" title="Scenario not found" description="The requested scenario does not exist or you don't have access to it." />
      </div>
    );
  }

  const projections = (projectionsData || []) as ScenarioProjection[];
  const hasProjections = projections.length > 0;
  const isBaseline = isBaselineScenario(scenario);

  // Get final milestone data for compare view
  // IMPORTANT: Compare at the same month - use the shorter of the two horizons
  // to ensure we're comparing apples to apples (e.g., don't compare 84-month scenario vs 60-month baseline)
  const compareHorizon = Math.min(projections.length, baselineProjections?.length || projections.length);
  const finalProjection = projections[compareHorizon - 1];
  const finalBaseline = baselineProjections?.[compareHorizon - 1];
  const horizonMismatch = baselineProjections && projections.length !== baselineProjections.length;

  // Context bar element
  const contextBar = (
    <ScenarioContextBar
      scenarioName={scenario.name}
      baselineName={isBaseline ? undefined : baselineScenario?.name}
      status={
        hasProjections
          ? { tone: 'good', label: 'Computed' }
          : { tone: 'warning', label: 'Not Run' }
      }
      onAddChange={() => setShowAddChange(true)}
      onLifeEvent={() => setShowLifeEvents(true)}
      onMerge={() => setShowMerge(true)}
      onRunProjection={() => computeMutation.mutate()}
      isRunning={computeMutation.isPending}
      isBaseline={isBaseline}
    />
  );

  return (
    <CockpitLayout contextBar={contextBar}>
      <div className={cn(SPACING.sectionGap)}>
        {/* Projection Error */}
        {projectionsError && (
          <SystemAlert
            tone="critical"
            title="Error loading projections"
            description="There was an error loading the projection data. Try running the projection again."
            dismissible
          />
        )}

        <Tabs defaultValue="projection">
          <TabsList>
            <TabsTrigger value="projection">Projection</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="changes">
              Changes ({scenario.changes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          </TabsList>

          <TabsContent value="projection" className="space-y-6 mt-6">
            {hasProjections ? (
              <>
                <InstrumentPanel title="Net Worth Trajectory" subtitle={`${projections.length} month projection`}>
                  <ProjectionChart
                    projections={projections}
                    compareProjections={baselineProjections as ScenarioProjection[]}
                    compareLabel={baselineScenario?.name || 'Baseline'}
                    scenarioLabel={scenario.name}
                  />
                </InstrumentPanel>

                <InstrumentPanel title="Monthly Breakdown">
                  <ProjectionTable projections={projections} />
                </InstrumentPanel>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h3 className={TYPOGRAPHY.sectionTitle}>Ready to project</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {scenario.changes?.length
                    ? 'You have changes configured. Run the projection to see how they impact your financial future.'
                    : 'Add some changes or life events, then run the projection to see how they impact your finances.'}
                </p>
                <Button
                  className="mt-6"
                  onClick={() => computeMutation.mutate()}
                  disabled={computeMutation.isPending}
                >
                  {computeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Computing...
                    </>
                  ) : (
                    'Run Projection'
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="space-y-6 mt-6">
            {hasProjections && baselineProjections && baselineProjections.length > 0 ? (
              <>
                {/* Warning if horizon lengths don't match */}
                {horizonMismatch && (
                  <SystemAlert
                    tone="warning"
                    title="Projection horizon mismatch"
                    description={`Scenario projects ${projections.length} months but baseline only has ${baselineProjections?.length || 0} months. Comparison shows Month ${compareHorizon}. Re-run the baseline projection to get a full comparison.`}
                    dismissible
                  />
                )}

                {/* Delta-first comparison metrics */}
                {finalProjection && finalBaseline && (
                  <InstrumentPanel title="Impact at End of Horizon" subtitle={`Month ${compareHorizon}`}>
                    <MetricRowHeader />
                    <MetricRow
                      label="Net Worth"
                      baseline={parseFloat(finalBaseline.netWorth) || 0}
                      scenario={parseFloat(finalProjection.netWorth) || 0}
                      format="currency"
                      goodDirection="up"
                    />
                    <MetricRow
                      label="Liquid Assets"
                      baseline={parseFloat(finalBaseline.liquidAssets) || 0}
                      scenario={parseFloat(finalProjection.liquidAssets) || 0}
                      format="currency"
                      goodDirection="up"
                    />
                    <MetricRow
                      label="Total Debt"
                      baseline={parseFloat(finalBaseline.totalLiabilities) || 0}
                      scenario={parseFloat(finalProjection.totalLiabilities) || 0}
                      format="currency"
                      goodDirection="down"
                    />
                  </InstrumentPanel>
                )}

                {/* Milestone comparison */}
                <MilestoneComparison
                  scenarioProjections={projections}
                  baselineProjections={baselineProjections as ScenarioProjection[]}
                  scenarioName={scenario.name}
                  baselineName={baselineScenario?.name || 'Baseline'}
                />

                {/* Drivers explanation */}
                {scenario.changes && scenario.changes.length > 0 && (
                  <DriversBlock
                    title="What's Driving the Difference"
                    drivers={scenario.changes.slice(0, 5).map((change) => {
                      const amount = parseFloat(String(change.parameters?.amount ?? 0)) || 0;
                      const category = String(change.parameters?.category ?? '');
                      const isRecurring = Boolean(change.parameters?.isRecurring);
                      return {
                        label: change.description || change.changeType,
                        impact: amount,
                        tone:
                          amount >= 0
                            ? category === 'expense'
                              ? 'critical'
                              : 'good'
                            : category === 'expense'
                            ? 'good'
                            : 'critical',
                        recurring: isRecurring,
                      };
                    })}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                {!hasProjections ? (
                  <>Run projections for this scenario to see milestone comparisons.</>
                ) : !baselineProjections || baselineProjections.length === 0 ? (
                  <>
                    Run projections for both this scenario and your baseline scenario to see
                    comparisons.
                  </>
                ) : (
                  <>No baseline scenario to compare against.</>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="changes" className="mt-6">
            <ScenarioChanges scenarioId={scenarioId} initialChanges={scenario.changes || []} />
          </TabsContent>

          <TabsContent value="assumptions" className="mt-6">
            <AssumptionsForm scenario={scenario} />
          </TabsContent>
        </Tabs>
      </div>

      <AddChangeDialog
        open={showAddChange}
        onOpenChange={setShowAddChange}
        scenarioId={scenarioId}
      />

      <LifeEventTemplatesDialog
        open={showLifeEvents}
        onOpenChange={setShowLifeEvents}
        scenarioId={scenarioId}
      />

      <MergeScenarioDialog
        open={showMerge}
        onOpenChange={setShowMerge}
        targetScenarioId={scenarioId}
        targetScenarioName={scenario.name}
      />
    </CockpitLayout>
  );
}
