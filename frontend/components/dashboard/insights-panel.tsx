'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { insights as api } from '@/lib/api';
import { AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Insight } from '@/lib/types';

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const qc = useQueryClient();
  const dismiss = useMutation({
    mutationFn: (id: string) => api.dismissInsight(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });

  const active = insights.filter(i => !i.isDismissed);
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
