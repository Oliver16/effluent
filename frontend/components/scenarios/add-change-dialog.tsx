'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scenarios } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CHANGE_TYPES, FIELD_CONFIGS } from './change-field-config';
import { ChangeField } from './change-field';
import { convertFormParameters } from './change-form-utils';

interface AddChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
}

export function AddChangeDialog({ open, onOpenChange, scenarioId }: AddChangeDialogProps) {
  const queryClient = useQueryClient();
  const [changeType, setChangeType] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => scenarios.addChange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'changes'] });
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId] });
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setChangeType('');
    setName('');
    setDescription('');
    setEffectiveDate('');
    setParams({});
  };

  const selectedType = useMemo(
    () => CHANGE_TYPES.find((type) => type.value === changeType),
    [changeType]
  );

  const handleSubmit = () => {
    mutation.mutate({
      scenario: scenarioId,
      change_type: changeType,
      name,
      description,
      effective_date: effectiveDate,
      parameters: convertFormParameters(params),
      is_enabled: true,
    });
  };

  const updateParam = (field: string, value: string) => {
    setParams({ ...params, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Change</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="changeType">Change Type</Label>
            <select
              id="changeType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={changeType}
              onChange={(event) => setChangeType(event.target.value)}
            >
              <option value="">Select type...</option>
              {CHANGE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., New job at ACME"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional details"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective Date</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </div>

          {selectedType?.fields.map((field) => {
            const config = FIELD_CONFIGS[field];
            if (!config) return null;

            return (
              <ChangeField
                key={field}
                fieldName={field}
                config={config}
                value={params[field] || ''}
                onChange={(value) => updateParam(field, value)}
              />
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Adding...' : 'Add Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
