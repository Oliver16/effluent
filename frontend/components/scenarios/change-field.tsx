import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldConfig } from './change-field-config';
import { Account, RecurringFlow, HouseholdMember, IncomeSourceDetail } from '@/lib/types';

interface ChangeFieldProps {
  fieldName: string;
  config: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  accounts?: Account[];
  flows?: RecurringFlow[];
  members?: HouseholdMember[];
  incomeSources?: IncomeSourceDetail[];
}

/**
 * Renders a single form field based on its configuration
 */
export function ChangeField({ fieldName, config, value, onChange, accounts = [], flows = [], members = [], incomeSources = [] }: ChangeFieldProps) {
  const { label, placeholder, type, options, flowType } = config;

  // Income source selector
  if (type === 'income_source_select') {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <select
          id={fieldName}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Create new income source</option>
          {incomeSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} ({source.incomeType}) - ${parseFloat(source.grossAnnual).toLocaleString()}/yr
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Select existing source to link, or leave empty to create new during adoption
        </p>
      </div>
    );
  }

  // Member selector
  if (type === 'member_select') {
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
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Account selector
  if (type === 'account_select') {
    // For linked_account_id, show cash/savings accounts; for source_account_id, show debt accounts
    const isLinkedAccount = fieldName === 'linked_account_id';
    const cashAccountTypes = new Set([
      'checking', 'savings', 'money_market', 'cash', 'high_yield_savings',
    ]);
    const debtAccountTypes = new Set([
      'credit_card', 'store_card', 'heloc', 'personal_loc', 'business_loc',
      'primary_mortgage', 'rental_mortgage', 'second_mortgage',
      'auto_loan', 'personal_loan', 'student_loan_federal', 'student_loan_private', 'boat_loan',
      'medical_debt', 'tax_debt', 'family_loan', 'other_liability',
    ]);
    const filteredAccounts = isLinkedAccount
      ? accounts.filter(a => cashAccountTypes.has(a.accountType))
      : accounts.filter(a => debtAccountTypes.has(a.accountType));

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

  // Default: text or number input (after early returns, only these types remain)
  const inputType = type === 'number' ? 'number' : 'text';

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName}>{label}</Label>
      <Input
        id={fieldName}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
