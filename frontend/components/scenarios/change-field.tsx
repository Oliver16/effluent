import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldConfig } from './change-field-config';
import { Account, RecurringFlow } from '@/lib/types';

interface ChangeFieldProps {
  fieldName: string;
  config: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  accounts?: Account[];
  flows?: RecurringFlow[];
}

/**
 * Renders a single form field based on its configuration
 */
export function ChangeField({ fieldName, config, value, onChange, accounts = [], flows = [] }: ChangeFieldProps) {
  const { label, placeholder, type, options, flowType } = config;

  // Account selector
  if (type === 'account_select') {
    // Filter to liability accounts for debt-related changes
    const debtAccountTypes = new Set([
      'credit_card', 'store_card', 'heloc', 'personal_loc', 'business_loc',
      'primary_mortgage', 'rental_mortgage', 'second_mortgage',
      'auto_loan', 'personal_loan', 'student_loan_federal', 'student_loan_private', 'boat_loan',
      'medical_debt', 'tax_debt', 'family_loan', 'other_liability',
    ]);
    const filteredAccounts = accounts.filter(a => debtAccountTypes.has(a.accountType));

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <select
          id={fieldName}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {filteredAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currentBalance ? `$${parseFloat(account.currentBalance).toLocaleString()}` : '$0'})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Flow selector
  if (type === 'flow_select') {
    const filteredFlows = flowType
      ? flows.filter(f => f.flowType === flowType)
      : flows;

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <select
          id={fieldName}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {filteredFlows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name} ({flow.frequency}, ${parseFloat(flow.amount).toLocaleString()})
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <select
          id={fieldName}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName}>{label}</Label>
      <Input
        id={fieldName}
        type={type === 'account_select' || type === 'flow_select' ? 'text' : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
