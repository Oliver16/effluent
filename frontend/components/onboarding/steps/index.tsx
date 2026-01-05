// Step components for onboarding wizard
export { WelcomeStep } from './welcome-step'
export { HouseholdInfoStep } from './household-info-step'
export { MembersStep } from './members-step'
export { TaxFilingStep } from './tax-filing-step'
export { IncomeSourcesStep } from './income-sources-step'
export { IncomeDetailsStep } from './income-details-step'
export { WithholdingStep } from './withholding-step'
export { PretaxDeductionsStep } from './pretax-deductions-step'
export { BankAccountsStep } from './bank-accounts-step'
export { InvestmentsStep } from './investments-step'
export { RetirementStep } from './retirement-step'
export { RealEstateStep } from './real-estate-step'
export { VehiclesStep } from './vehicles-step'
export { MortgagesStep } from './mortgages-step'
export { CreditCardsStep } from './credit-cards-step'
export { StudentLoansStep } from './student-loans-step'
export { OtherDebtsStep } from './other-debts-step'
export { HousingExpensesStep } from './housing-expenses-step'
export { UtilitiesStep } from './utilities-step'
export { InsuranceStep } from './insurance-step'
export { TransportationStep } from './transportation-step'
export { FoodStep } from './food-step'
export { OtherExpensesStep } from './other-expenses-step'
export { ReviewStep } from './review-step'
export { CompleteStep } from './complete-step'

export interface StepProps {
  formData: Record<string, unknown>
  setFormData: (data: Record<string, unknown>) => void
  errors?: Record<string, string>
}

// Step metadata
export const STEP_CONFIG: Record<string, {
  title: string
  description: string
  component: string
}> = {
  welcome: {
    title: 'Welcome',
    description: "Let's set up your financial profile",
    component: 'WelcomeStep',
  },
  household_info: {
    title: 'Household Info',
    description: 'Tell us about your household',
    component: 'HouseholdInfoStep',
  },
  members: {
    title: 'Household Members',
    description: 'Add yourself and any family members',
    component: 'MembersStep',
  },
  tax_filing: {
    title: 'Tax Filing',
    description: 'Your tax filing status helps us calculate projections',
    component: 'TaxFilingStep',
  },
  income_sources: {
    title: 'Income Sources',
    description: 'Add your sources of income (jobs, businesses, etc.)',
    component: 'IncomeSourcesStep',
  },
  income_details: {
    title: 'Income Details',
    description: 'Provide more details about your income',
    component: 'IncomeDetailsStep',
  },
  withholding: {
    title: 'Tax Withholding',
    description: 'Enter your paycheck withholdings',
    component: 'WithholdingStep',
  },
  pretax_deductions: {
    title: 'Pre-Tax Deductions',
    description: 'Add 401k contributions, HSA, etc.',
    component: 'PretaxDeductionsStep',
  },
  bank_accounts: {
    title: 'Bank Accounts',
    description: 'Add your checking and savings accounts',
    component: 'BankAccountsStep',
  },
  investments: {
    title: 'Investments',
    description: 'Add brokerage and investment accounts',
    component: 'InvestmentsStep',
  },
  retirement: {
    title: 'Retirement Accounts',
    description: 'Add IRAs, 401(k)s, and other retirement accounts',
    component: 'RetirementStep',
  },
  real_estate: {
    title: 'Real Estate',
    description: 'Add any properties you own',
    component: 'RealEstateStep',
  },
  vehicles: {
    title: 'Vehicles',
    description: 'Add cars, boats, or other vehicles',
    component: 'VehiclesStep',
  },
  mortgages: {
    title: 'Mortgages',
    description: 'Add mortgage and home equity loans',
    component: 'MortgagesStep',
  },
  credit_cards: {
    title: 'Credit Cards',
    description: 'Add credit cards with balances',
    component: 'CreditCardsStep',
  },
  student_loans: {
    title: 'Student Loans',
    description: 'Add any student loan debt',
    component: 'StudentLoansStep',
  },
  other_debts: {
    title: 'Other Debts',
    description: 'Add personal loans, medical debt, etc.',
    component: 'OtherDebtsStep',
  },
  housing_expenses: {
    title: 'Housing Expenses',
    description: 'Enter rent, property taxes, HOA fees, etc.',
    component: 'HousingExpensesStep',
  },
  utilities: {
    title: 'Utilities',
    description: 'Enter electric, gas, water, internet bills',
    component: 'UtilitiesStep',
  },
  insurance: {
    title: 'Insurance',
    description: 'Enter health, life, and other insurance costs',
    component: 'InsuranceStep',
  },
  transportation: {
    title: 'Transportation',
    description: 'Enter car payments, gas, transit costs',
    component: 'TransportationStep',
  },
  food: {
    title: 'Food',
    description: 'Enter grocery and dining expenses',
    component: 'FoodStep',
  },
  other_expenses: {
    title: 'Other Expenses',
    description: 'Add subscriptions, childcare, and other recurring costs',
    component: 'OtherExpensesStep',
  },
  review: {
    title: 'Review',
    description: "Review your information before we're done",
    component: 'ReviewStep',
  },
  complete: {
    title: 'Complete',
    description: "You're all set!",
    component: 'CompleteStep',
  },
}
