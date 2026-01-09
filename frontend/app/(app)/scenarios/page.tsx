'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { scenarios } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScenarioTile } from '@/components/scenarios/ScenarioTile';
import { CompareSelectionBar } from '@/components/scenarios/CompareSelectionBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { Plus, GitCompare, Loader2 } from 'lucide-react';
import { Scenario } from '@/lib/types';
import { cn } from '@/lib/utils';

function isBaseline(scenario: Scenario) {
  return scenario.isBaseline === true;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function ScenariosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSelection = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleCompare = () => {
    const ids = Array.from(selectedIds).join(',');
    router.push(`/scenarios/compare?ids=${ids}`);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className={cn(SPACING.pageGutter, 'flex items-center justify-center py-20')}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const baseline = scenarioList.find(isBaseline);
  const others = scenarioList.filter((scenario) => !isBaseline(scenario));

  return (
    <div className={cn(SPACING.pageGutter, SPACING.sectionGap)}>
      {/* Page Header */}
      <PageHeader
        title="Scenarios"
        subtitle="Model financial what-if scenarios and compare outcomes"
        actions={
          <div className="flex flex-wrap gap-2">
            {!baseline && (
              <Button onClick={createBaseline} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Baseline
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/scenarios/new">
                <Plus className="h-4 w-4 mr-2" />
                New Scenario
              </Link>
            </Button>
            {scenarioList.length >= 2 && (
              <Button variant="ghost" asChild>
                <Link href="/scenarios/compare">
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare All
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Baseline Section */}
      {baseline && (
        <section>
          <h2 className={cn(TYPOGRAPHY.sectionTitle, 'mb-3')}>Baseline</h2>
          <ScenarioTile
            id={baseline.id}
            name={baseline.name}
            description={baseline.description || 'Baseline projection from current state'}
            isBaseline
            horizonMonths={baseline.projectionMonths || 60}
            lastRun={baseline.lastProjectedAt ?? undefined}
            onOpen={() => router.push(`/scenarios/${baseline.id}`)}
          />
        </section>
      )}

      {/* Scenarios Grid */}
      {others.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className={TYPOGRAPHY.sectionTitle}>What-If Scenarios</h2>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : `${others.length} scenario${others.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {others.map((scenario) => (
              <ScenarioTile
                key={scenario.id}
                id={scenario.id}
                name={scenario.name}
                description={scenario.description}
                horizonMonths={scenario.projectionMonths || 60}
                lastRun={scenario.lastProjectedAt ?? undefined}
                isSelected={selectedIds.has(scenario.id)}
                onSelectionChange={(selected) => toggleSelection(scenario.id, selected)}
                onOpen={() => router.push(`/scenarios/${scenario.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!baseline && others.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <GitCompare className="h-8 w-8 text-primary" />
          </div>
          <h3 className={TYPOGRAPHY.sectionTitle}>No scenarios yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Create a baseline to project your current financial trajectory, then add what-if
            scenarios to explore different decisions.
          </p>
          <Button className="mt-6" onClick={createBaseline} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create Baseline
          </Button>
        </div>
      )}

      {/* Comparison Selection Bar */}
      <CompareSelectionBar
        selectedCount={selectedIds.size}
        onCompare={handleCompare}
        onClear={handleClearSelection}
        visible={selectedIds.size > 0}
      />
    </div>
  );
}
