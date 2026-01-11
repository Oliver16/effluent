/**
 * Configuration for change form fields
 */

export interface FieldConfig {
  label: string;
  placeholder?: string;
  type: 'text' | 'number' | 'select' | 'account_select' | 'flow_select' | 'member_select' | 'income_source_select';
  options?: Array<{ value: string; label: string }>;
  isPercentage?: boolean;
  flowType?: 'income' | 'expense'; // For flow_select, filter by type
}

// Income types for tax treatment (maps to backend IncomeSource.income_type)
export const INCOME_TYPES = [
  { value: 'w2', label: 'W-2 Employment' },
  { value: 'w2_hourly', label: 'W-2 Hourly' },
  { value: 'self_employed', label: 'Self-Employment (1099)' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'investment', label: 'Investment Income' },
  { value: 'retirement', label: 'Retirement/Pension' },
  { value: 'social_security', label: 'Social Security' },
  { value: 'other', label: 'Other Income' },
];

// Income categories matching backend IncomeCategory enum
export const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salary/Wages' },
  { value: 'hourly_wages', label: 'Hourly Wages' },
  { value: 'overtime', label: 'Overtime Pay' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'commission', label: 'Commission' },
  { value: 'tips', label: 'Tips' },
  { value: 'self_employment', label: 'Self-Employment Income' },
  { value: 'freelance', label: 'Freelance/Contract' },
  { value: 'business_income', label: 'Business Income' },
  { value: 'dividends', label: 'Dividends' },
  { value: 'interest', label: 'Interest Income' },
  { value: 'capital_gains', label: 'Capital Gains' },
  { value: 'rental_income', label: 'Rental Income' },
  { value: 'royalties', label: 'Royalties' },
  { value: 'social_security', label: 'Social Security' },
  { value: 'pension', label: 'Pension' },
  { value: 'retirement_distribution', label: 'Retirement Distribution' },
  { value: 'disability', label: 'Disability Income' },
  { value: 'unemployment', label: 'Unemployment' },
  { value: 'child_support_received', label: 'Child Support Received' },
  { value: 'alimony_received', label: 'Alimony Received' },
  { value: 'trust_income', label: 'Trust/Estate Income' },
  { value: 'other_income', label: 'Other Income' },
];

// Common expense categories (subset of backend ExpenseCategory enum)
export const EXPENSE_CATEGORIES = [
  // Housing
  { value: 'rent', label: 'Rent' },
  { value: 'mortgage_principal', label: 'Mortgage Principal' },
  { value: 'mortgage_interest', label: 'Mortgage Interest' },
  { value: 'property_tax', label: 'Property Tax' },
  { value: 'homeowners_insurance', label: "Homeowner's Insurance" },
  { value: 'hoa_fees', label: 'HOA/Condo Fees' },
  { value: 'home_maintenance', label: 'Home Maintenance' },
  // Utilities
  { value: 'electricity', label: 'Electricity' },
  { value: 'natural_gas', label: 'Natural Gas' },
  { value: 'water_sewer', label: 'Water & Sewer' },
  { value: 'internet', label: 'Internet' },
  { value: 'phone', label: 'Phone/Mobile' },
  // Transportation
  { value: 'auto_loan', label: 'Auto Loan Payment' },
  { value: 'auto_insurance', label: 'Auto Insurance' },
  { value: 'gas_fuel', label: 'Gas/Fuel' },
  { value: 'auto_maintenance', label: 'Auto Maintenance' },
  { value: 'public_transit', label: 'Public Transit' },
  // Insurance
  { value: 'health_insurance', label: 'Health Insurance' },
  { value: 'life_insurance', label: 'Life Insurance' },
  // Healthcare
  { value: 'medical_expenses', label: 'Medical Expenses' },
  { value: 'prescriptions', label: 'Prescriptions' },
  { value: 'gym_fitness', label: 'Gym/Fitness' },
  // Food
  { value: 'groceries', label: 'Groceries' },
  { value: 'dining_out', label: 'Dining Out' },
  // Debt
  { value: 'credit_card_payment', label: 'Credit Card Payment' },
  { value: 'student_loan', label: 'Student Loan Payment' },
  { value: 'personal_loan', label: 'Personal Loan Payment' },
  // Children
  { value: 'childcare', label: 'Childcare/Daycare' },
  { value: 'child_activities', label: 'Children Activities' },
  { value: 'school_tuition', label: 'School Tuition' },
  // Personal
  { value: 'clothing', label: 'Clothing' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'vacation_travel', label: 'Vacation/Travel' },
  // Giving
  { value: 'charitable', label: 'Charitable Donations' },
  { value: 'gifts', label: 'Gifts to Others' },
  // Other
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

export const FIELD_CONFIGS: Record<string, FieldConfig> = {
  amount: { label: 'Amount ($)', placeholder: '5000', type: 'number' },
  principal: { label: 'Principal ($)', placeholder: '25000', type: 'number' },
  payment: { label: 'Monthly Payment ($)', placeholder: '450', type: 'number' },
  extra_monthly: { label: 'Extra Monthly Payment ($)', placeholder: '200', type: 'number' },
  term_months: { label: 'Term (months)', placeholder: '60', type: 'number' },
  rate: { label: 'Interest Rate (%)', placeholder: '6.5', type: 'number', isPercentage: true },
  closing_costs: { label: 'Closing Costs ($)', placeholder: '4000', type: 'number' },
  percentage: { label: 'Contribution (%)', placeholder: '5', type: 'number', isPercentage: true },
  source_account_id: { label: 'Account', type: 'account_select' },
  linked_account_id: { label: 'Linked Account', type: 'account_select' },
  source_flow_id: { label: 'Flow', type: 'flow_select' },
  source_income_flow_id: { label: 'Income Source', type: 'flow_select', flowType: 'income' },
  source_expense_flow_id: { label: 'Expense Source', type: 'flow_select', flowType: 'expense' },
  household_member_id: { label: 'Household Member', type: 'member_select' },
  income_source_id: { label: 'Existing Income Source (optional)', type: 'income_source_select' },
  income_type: {
    label: 'Income Type (for taxes)',
    type: 'select',
    options: INCOME_TYPES,
  },
  income_category: {
    label: 'Category',
    type: 'select',
    options: INCOME_CATEGORIES,
  },
  expense_category: {
    label: 'Category',
    type: 'select',
    options: EXPENSE_CATEGORIES,
  },
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
  { value: 'add_income', label: 'Add Income', fields: ['amount', 'frequency', 'income_type', 'income_category', 'household_member_id', 'income_source_id', 'linked_account_id'] },
  { value: 'modify_income', label: 'Modify Income', fields: ['source_income_flow_id', 'amount', 'frequency', 'income_category'] },
  { value: 'remove_income', label: 'Remove Income', fields: ['source_income_flow_id'] },
  { value: 'add_expense', label: 'Add Expense', fields: ['amount', 'frequency', 'expense_category', 'linked_account_id'] },
  { value: 'modify_expense', label: 'Modify Expense', fields: ['source_expense_flow_id', 'amount', 'frequency', 'expense_category'] },
  { value: 'remove_expense', label: 'Remove Expense', fields: ['source_expense_flow_id'] },
  { value: 'add_debt', label: 'Add Debt', fields: ['principal', 'rate', 'term_months', 'payment'] },
  { value: 'modify_debt', label: 'Modify Debt', fields: ['source_account_id', 'principal', 'rate', 'term_months', 'payment'] },
  { value: 'payoff_debt', label: 'Accelerate Payoff', fields: ['source_account_id', 'extra_monthly'] },
  { value: 'refinance', label: 'Refinance Debt', fields: ['source_account_id', 'rate', 'term_months', 'closing_costs'] },
  { value: 'lump_sum_income', label: 'One-time Income', fields: ['amount'] },
  { value: 'lump_sum_expense', label: 'One-time Expense', fields: ['amount'] },
  { value: 'modify_401k', label: 'Change 401(k) Contribution', fields: ['percentage'] },
  { value: 'modify_hsa', label: 'Change HSA Contribution', fields: ['percentage'] },
];
