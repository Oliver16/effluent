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
