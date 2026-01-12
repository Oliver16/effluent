'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accounts as accountsApi, flows as flowsApi, members as membersApi, incomeSources as incomeSourcesApi, scenarios, normalizeListResponse } from '@/lib/api';
import { ScenarioChange } from '@/lib/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { CHANGE_TYPES, FIELD_CONFIGS } from './change-field-config';
import { ChangeField } from './change-field';
import { convertFormParameters } from './change-form-utils';

interface EditChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
  change: ScenarioChange | null;
}

export function EditChangeDialog({ open, onOpenChange, scenarioId, change }: EditChangeDialogProps) {
  const queryClient = useQueryClient();
  const [changeType, setChangeType] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});

  // Pre-populate form when change is provided
  useEffect(() => {
    if (change && open) {
      setChangeType(change.changeType);
      setName(change.name);
      setDescription(change.description || '');
      setEffectiveDate(change.effectiveDate);

      // Convert parameters to form-friendly strings
      const formParams: Record<string, string> = {};
      Object.entries(change.parameters || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formParams[key] = String(value);
        }
      });

      // Map sourceFlowId to appropriate flow field based on change type
      if (change.sourceFlowId) {
        // Check if this is an income or expense change type
        if (changeType.includes('INCOME')) {
          formParams['source_income_flow_id'] = change.sourceFlowId;
        } else if (changeType.includes('EXPENSE')) {
          formParams['source_expense_flow_id'] = change.sourceFlowId;
        }
      }

      // Add sourceAccountId if present
      if (change.sourceAccountId) {
        formParams['source_account_id'] = change.sourceAccountId;
      }

      setParams(formParams);
    }
  }, [change, open, changeType]);

  // Fetch accounts and flows for selectors
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
    enabled: open,
  });

  const { data: flowsData } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.list().then(normalizeListResponse),
    enabled: open,
  });

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list(),
    enabled: open,
  });

  const { data: incomeSourcesData } = useQuery({
    queryKey: ['income-sources'],
    queryFn: () => incomeSourcesApi.list(),
    enabled: open,
  });

  const accounts = accountsData?.results || [];
  const flows = flowsData || [];
  const members = membersData || [];
  const incomeSources = incomeSourcesData || [];

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (!change) throw new Error('No change to update');
      return scenarios.updateChange(change.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'changes'] });
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId] });
      onOpenChange(false);
    },
  });

  const selectedType = useMemo(
    () => CHANGE_TYPES.find((type) => type.value === changeType),
    [changeType]
  );

  const handleSubmit = () => {
    // Convert parameters, mapping specific flow fields back to generic sourceFlowId
    const convertedParams = convertFormParameters(params);

    // Map sourceIncomeFlowId and sourceExpenseFlowId back to sourceFlowId for backend
    let sourceFlowId = undefined;
    if (convertedParams.source_income_flow_id) {
      sourceFlowId = convertedParams.source_income_flow_id;
      delete convertedParams.source_income_flow_id;
    }
    if (convertedParams.source_expense_flow_id) {
      sourceFlowId = convertedParams.source_expense_flow_id;
      delete convertedParams.source_expense_flow_id;
    }

    const updateData: Record<string, unknown> = {
      changeType: changeType,
      name,
      description,
      effectiveDate: effectiveDate,
      parameters: convertedParams,
    };

    if (sourceFlowId) {
      updateData.sourceFlowId = sourceFlowId;
    }

    mutation.mutate(updateData);
  };

  const updateParam = (field: string, value: string) => {
    setParams({ ...params, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Change</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Additional details"
                />
              </div>
            </div>

            {selectedType && selectedType.fields.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Change Parameters</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedType.fields.map((field) => {
                    const config = FIELD_CONFIGS[field];
                    if (!config) return null;

                    return (
                      <ChangeField
                        key={field}
                        fieldName={field}
                        config={config}
                        value={params[field] || ''}
                        onChange={(value) => updateParam(field, value)}
                        accounts={accounts}
                        flows={flows}
                        members={members}
                        incomeSources={incomeSources}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Updating...' : 'Update Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
