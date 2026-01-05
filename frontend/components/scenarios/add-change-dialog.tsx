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

const CHANGE_TYPES = [
  { value: 'add_income', label: 'Add Income', fields: ['amount', 'frequency', 'category'] },
  { value: 'modify_income', label: 'Modify Income', fields: ['source_flow_id', 'amount', 'frequency', 'category'] },
  { value: 'remove_income', label: 'Remove Income', fields: ['source_flow_id'] },
  { value: 'add_expense', label: 'Add Expense', fields: ['amount', 'frequency', 'category'] },
  { value: 'modify_expense', label: 'Modify Expense', fields: ['source_flow_id', 'amount', 'frequency', 'category'] },
  { value: 'remove_expense', label: 'Remove Expense', fields: ['source_flow_id'] },
  { value: 'add_debt', label: 'Add Debt', fields: ['principal', 'rate', 'term_months', 'payment'] },
  { value: 'modify_debt', label: 'Modify Debt', fields: ['source_account_id', 'principal', 'rate', 'term_months', 'payment'] },
  { value: 'payoff_debt', label: 'Accelerate Payoff', fields: ['source_account_id', 'extra_monthly'] },
  { value: 'refinance', label: 'Refinance Debt', fields: ['source_account_id', 'rate', 'term_months', 'closing_costs'] },
  { value: 'lump_sum_income', label: 'One-time Income', fields: ['amount'] },
  { value: 'lump_sum_expense', label: 'One-time Expense', fields: ['amount'] },
  { value: 'modify_401k', label: 'Change 401(k) Contribution', fields: ['percentage'] },
  { value: 'modify_hsa', label: 'Change HSA Contribution', fields: ['percentage'] },
];

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
    const numberFields = new Set([
      'amount',
      'principal',
      'payment',
      'extra_monthly',
      'rate',
      'term_months',
      'closing_costs',
      'percentage',
    ]);

    const parameters: Record<string, unknown> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value === '') return;
      if (numberFields.has(key)) {
        const parsed = parseFloat(value);
        if (!Number.isNaN(parsed)) {
          parameters[key] = key === 'rate' || key === 'percentage' ? parsed / 100 : parsed;
        }
      } else {
        parameters[key] = value;
      }
    });

    mutation.mutate({
      scenario: scenarioId,
      change_type: changeType,
      name,
      description,
      effective_date: effectiveDate,
      parameters,
      is_enabled: true,
    });
  };

  const renderInput = (field: string, label: string, placeholder?: string, type = 'text') => (
    <div key={field} className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type={type}
        value={params[field] || ''}
        onChange={(event) => setParams({ ...params, [field]: event.target.value })}
        placeholder={placeholder}
      />
    </div>
  );

  const renderFrequency = () => (
    <div className="space-y-2">
      <Label htmlFor="frequency">Frequency</Label>
      <select
        id="frequency"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={params.frequency || ''}
        onChange={(event) => setParams({ ...params, frequency: event.target.value })}
      >
        <option value="">Select frequency</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Bi-weekly</option>
        <option value="semimonthly">Semi-monthly</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="annually">Annually</option>
      </select>
    </div>
  );

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

          {selectedType?.fields.includes('amount') &&
            renderInput('amount', 'Amount ($)', '5000', 'number')}
          {selectedType?.fields.includes('principal') &&
            renderInput('principal', 'Principal ($)', '25000', 'number')}
          {selectedType?.fields.includes('payment') &&
            renderInput('payment', 'Monthly Payment ($)', '450', 'number')}
          {selectedType?.fields.includes('extra_monthly') &&
            renderInput('extra_monthly', 'Extra Monthly Payment ($)', '200', 'number')}
          {selectedType?.fields.includes('term_months') &&
            renderInput('term_months', 'Term (months)', '60', 'number')}
          {selectedType?.fields.includes('rate') &&
            renderInput('rate', 'Interest Rate (%)', '6.5', 'number')}
          {selectedType?.fields.includes('closing_costs') &&
            renderInput('closing_costs', 'Closing Costs ($)', '4000', 'number')}
          {selectedType?.fields.includes('percentage') &&
            renderInput('percentage', 'Contribution (%)', '5', 'number')}
          {selectedType?.fields.includes('source_account_id') &&
            renderInput('source_account_id', 'Source Account ID', 'Account UUID')}
          {selectedType?.fields.includes('source_flow_id') &&
            renderInput('source_flow_id', 'Source Flow ID', 'Flow UUID')}
          {selectedType?.fields.includes('category') &&
            renderInput('category', 'Category', 'e.g., salary, rent')}
          {selectedType?.fields.includes('frequency') && renderFrequency()}
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
