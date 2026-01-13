'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scenarios } from '@/lib/api';
import { ScenarioChange } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { ToggleLeft, ToggleRight, Trash2, Pencil } from 'lucide-react';
import { EditChangeDialog } from './edit-change-dialog';

interface ScenarioChangesProps {
  scenarioId: string;
  initialChanges?: ScenarioChange[];
}

export function ScenarioChanges({ scenarioId, initialChanges }: ScenarioChangesProps) {
  const queryClient = useQueryClient();
  const [editingChange, setEditingChange] = useState<ScenarioChange | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['scenarios', scenarioId, 'changes'],
    queryFn: () => scenarios.listChanges(scenarioId).then(r => r),
    initialData: initialChanges,
  });

  const changes = (data as { results?: ScenarioChange[] })?.results || (data as ScenarioChange[]) || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScenarioChange> }) =>
      scenarios.updateChange(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'changes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scenarios.deleteChange(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'changes'] }),
  });

  if (!changes.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No changes added yet.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {changes.map((change) => (
          <Card key={change.id} className={!change.isEnabled ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className={`text-base ${!change.isEnabled ? 'line-through text-muted-foreground' : ''}`}>{change.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {change.changeType.replace(/_/g, ' ')} • Effective {formatDate(change.effectiveDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    updateMutation.mutate({
                      id: change.id,
                      data: { isEnabled: !change.isEnabled },
                    })
                  }
                  disabled={updateMutation.isPending}
                  className={change.isEnabled ? 'text-emerald-600 hover:text-emerald-700' : 'text-muted-foreground hover:text-foreground'}
                  aria-label={change.isEnabled ? 'Disable change' : 'Enable change'}
                >
                  {change.isEnabled ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingChange(change);
                    setEditDialogOpen(true);
                  }}
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Edit change"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(change.id)}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete change"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {change.description || 'No description provided.'}
            </CardContent>
          </Card>
        ))}
      </div>

      <EditChangeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        scenarioId={scenarioId}
        change={editingChange}
      />
    </>
  );
}
