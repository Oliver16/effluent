/**
 * Configuration for change form fields
 */

export interface FieldConfig {
  label: string;
  placeholder?: string;
  type: 'text' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
  isPercentage?: boolean;
}

export const FIELD_CONFIGS: Record<string, FieldConfig> = {
  amount: { label: 'Amount ($)', placeholder: '5000', type: 'number' },
  principal: { label: 'Principal ($)', placeholder: '25000', type: 'number' },
  payment: { label: 'Monthly Payment ($)', placeholder: '450', type: 'number' },
  extra_monthly: { label: 'Extra Monthly Payment ($)', placeholder: '200', type: 'number' },
  term_months: { label: 'Term (months)', placeholder: '60', type: 'number' },
  rate: { label: 'Interest Rate (%)', placeholder: '6.5', type: 'number', isPercentage: true },
  closing_costs: { label: 'Closing Costs ($)', placeholder: '4000', type: 'number' },
  percentage: { label: 'Contribution (%)', placeholder: '5', type: 'number', isPercentage: true },
  source_account_id: { label: 'Source Account ID', placeholder: 'Account UUID', type: 'text' },
  source_flow_id: { label: 'Source Flow ID', placeholder: 'Flow UUID', type: 'text' },
  category: { label: 'Category', placeholder: 'e.g., salary, rent', type: 'text' },
  frequency: {
    label: 'Frequency',
    type: 'select',
    options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Bi-weekly' },
      { value: 'semimonthly', label: 'Semi-monthly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annually', label: 'Annually' },
    ],
  },
};

export const CHANGE_TYPES = [
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
