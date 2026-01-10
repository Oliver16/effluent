'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SectionCard } from '@/components/layout/SectionCard';
import { StatusBadge, Status } from '@/components/ui/StatusBadge';
import { SidebarCardSkeleton } from '@/components/ui/Skeletons';
import { Button } from '@/components/ui/button';
import { insights as api } from '@/lib/api';
import { AlertTriangle, AlertCircle, CheckCircle, X, Lightbulb } from 'lucide-react';
import { Insight } from '@/lib/types';

interface InsightsPanelProps {
  insights: Insight[];
  isLoading?: boolean;
}

function getSeverityStatus(severity: string): Status {
  switch (severity) {
    case 'critical':
      return 'critical';
    case 'warning':
      return 'warning';
    case 'positive':
      return 'good';
    default:
      return 'neutral';
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'positive':
      return 'Good';
    default:
      return 'Info';
  }
}

export function InsightsPanel({ insights, isLoading }: InsightsPanelProps) {
  const qc = useQueryClient();
  const dismiss = useMutation({
    mutationFn: (id: string) => api.dismissInsight(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });

  if (isLoading) {
    return <SidebarCardSkeleton />;
  }

  const active = insights.filter(i => !i.isDismissed);

  if (!active.length) {
    return (
      <SectionCard dense title="Insights">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="rounded-full bg-muted p-2 mb-2">
            <Lightbulb className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">
            No insights right now
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check back after adding more data
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard dense title="Insights" data-tour="insights-panel">
      <div className="space-y-2">
        {active.slice(0, 5).map(insight => (
          <div
            key={insight.id}
            className="rounded-lg border border-border/50 p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                {insight.severity === 'critical' ? (
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : insight.severity === 'positive' ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <StatusBadge
                      status={getSeverityStatus(insight.severity)}
                      statusLabel={getSeverityLabel(insight.severity)}
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={() => dismiss.mutate(insight.id)}
                disabled={dismiss.isPending}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {insight.description}
            </p>
            {insight.recommendation && (
              <p className="text-xs font-medium text-primary">
                {insight.recommendation}
              </p>
            )}
          </div>
        ))}
        {active.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{active.length - 5} more insights
          </p>
        )}
      </div>
    </SectionCard>
  );
}
