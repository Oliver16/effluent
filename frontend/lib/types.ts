import Decimal from 'decimal.js'

export interface User {
  id: string
  email: string
  username: string
}

export interface Household {
  id: string
  name: string
  slug: string
  currency: string
  taxFilingStatus: string
  stateOfResidence: string
  onboardingCompleted: boolean
}

export interface HouseholdMember {
  id: string
  name: string
  relationship: string
  dateOfBirth?: string
  isPrimary: boolean
  employmentStatus: string
}

export interface Account {
  id: string
  name: string
  accountType: string
  institution: string
  isActive: boolean
  currentBalance: string
  currentMarketValue?: string
  currentCostBasis?: string
}

export interface BalanceSnapshot {
  id: string
  accountId: string
  asOfDate: string
  balance: string
  costBasis?: string
  marketValue?: string
}

export interface RecurringFlow {
  id: string
  name: string
  flowType: 'income' | 'expense'
  incomeCategory?: string
  expenseCategory?: string
  amount: string
  frequency: string
  startDate: string
  endDate?: string
  isActive: boolean
  monthlyAmount: string
}

export interface MetricSnapshot {
  id: string
  asOfDate: string
  netWorthMarket: string
  netWorthCost: string
  monthlySurplus: string
  dscr: string
  liquidityMonths: string
  savingsRate: string
  dtiRatio: string
  debtToAssetMarket: string
  highInterestDebtRatio: string
  housingRatio: string
}

export interface Insight {
  id: string
  severity: 'critical' | 'warning' | 'info' | 'positive'
  category: string
  title: string
  description: string
  recommendation?: string
  isDismissed: boolean
}

export interface OnboardingProgress {
  currentStep: string
  completedSteps: string[]
  skippedSteps: string[]
  progressPercentage: number
  isComplete: boolean
}

export interface OnboardingStepResponse {
  step: string
  stepLabel: string
  progressPercentage: number
  canSkip: boolean
  canGoBack: boolean
  draftData: Record<string, unknown>
  isValid: boolean
  validationErrors: Record<string, string>
}

export interface Scenario {
  id: string
  name: string
  description?: string
  is_baseline?: boolean
  parent_scenario?: string | null
  projection_months?: number
  start_date?: string
  inflation_rate?: string
  investment_return_rate?: string
  salary_growth_rate?: string
  is_active?: boolean
  is_archived?: boolean
  created_at?: string
  updated_at?: string
  changes?: ScenarioChange[]
  projections?: ScenarioProjection[]
}

export interface ScenarioChange {
  id: string
  scenario?: string
  change_type: string
  name: string
  description?: string
  effective_date: string
  end_date?: string | null
  source_account_id?: string | null
  source_flow_id?: string | null
  parameters: Record<string, unknown>
  display_order?: number
  is_enabled: boolean
}

export interface ScenarioProjection {
  id: string
  projection_date: string
  month_number: number
  total_assets: string
  total_liabilities: string
  net_worth: string
  liquid_assets: string
  retirement_assets: string
  total_income: string
  total_expenses: string
  net_cash_flow: string
  dscr: string
  savings_rate: string
  liquidity_months: string
  income_breakdown: Record<string, string>
  expense_breakdown: Record<string, string>
  asset_breakdown: Record<string, string>
  liability_breakdown: Record<string, string>
  computed_at?: string
}

export interface W2Withholding {
  id: string
  filingStatus: string
  multipleJobsOrSpouseWorks: boolean
  childTaxCreditDependents: number
  otherDependents: number
  otherIncome: string
  deductions: string
  extraWithholding: string
  stateAllowances: number
  stateAdditionalWithholding: string
}

export interface PreTaxDeduction {
  id: string
  deductionType: string
  name: string
  amountType: string
  amount: string
  employerMatchPercentage: string
  employerMatchLimitPercentage: string
  employerMatchLimitAnnual?: string
  targetAccount?: string
  isActive: boolean
}

export interface IncomeSourceDetail {
  id: string
  name: string
  householdMember: string
  incomeType: string
  grossAnnualSalary?: string
  hourlyRate?: string
  expectedAnnualHours: number
  payFrequency: string
  grossAnnual: string
  grossPerPeriod: string
  pretaxDeductions: PreTaxDeduction[]
  w2Withholding?: W2Withholding
  isActive: boolean
  startDate?: string
  endDate?: string
}
