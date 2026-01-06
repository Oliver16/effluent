import Decimal from 'decimal.js'

export interface User {
  id: string
  email: string
  username: string
}

export interface UserProfile extends User {
  dateOfBirth?: string
  lastLogin?: string
  dateJoined?: string
}

export interface UserSettings {
  weeklySummary: boolean
  insightAlerts: boolean
  balanceReminders: boolean
  criticalAlerts: boolean
  twoFactorEnabled: boolean
}

export interface UserSession {
  id: string
  ipAddress?: string
  userAgent?: string
  lastLogin?: string
  lastActive?: string
  isCurrent: boolean
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

export interface AssetDetails {
  acquisitionDate?: string
  acquisitionCost?: string
  propertyType?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  squareFootage?: number
  lotSizeAcres?: string
  yearBuilt?: number
  annualPropertyTax?: string
  annualInsurance?: string
  annualHoa?: string
  monthlyRentIncome?: string
  vin?: string
  make?: string
  model?: string
  year?: number
  mileage?: number
}

export interface LiabilityDetails {
  interestRate: string
  rateType: 'fixed' | 'variable'
  originalBalance?: string
  originationDate?: string
  maturityDate?: string
  termMonths?: number
  minimumPayment?: string
  paymentDayOfMonth?: number
  isInterestOnly: boolean
  includesEscrow: boolean
  escrowAmount?: string
  creditLimit?: string
  rateIndex?: string
  rateMargin?: string
  rateFloor?: string
  rateCeiling?: string
  servicer?: string
  isIncomeDriven: boolean
}

export interface Account {
  id: string
  name: string
  accountType: string
  institution: string
  accountNumberLast4?: string
  isActive: boolean
  displayOrder?: number
  assetGroup?: string
  owner?: string
  employerName?: string
  notes?: string
  currentBalance: string
  currentMarketValue?: string
  currentCostBasis?: string
  assetDetails?: AssetDetails
  liabilityDetails?: LiabilityDetails
  createdAt?: string
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
  description?: string
  flowType: 'income' | 'expense' | 'transfer'
  incomeCategory?: string
  expenseCategory?: string
  amount: string
  frequency: string
  startDate: string
  endDate?: string
  linkedAccount?: string
  householdMember?: string
  incomeSource?: string
  isActive: boolean
  isBaseline: boolean
  notes?: string
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
  incomeSource?: string
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

export interface PostTaxDeduction {
  id: string
  incomeSource?: string
  deductionType: string
  name: string
  amountType: string
  amount: string
  isActive: boolean
}

export interface SelfEmploymentTax {
  id: string
  incomeSource?: string
  q1EstimatedPayment: string
  q2EstimatedPayment: string
  q3EstimatedPayment: string
  q4EstimatedPayment: string
  estimatedAnnualExpenses: string
  retirementContributionPercentage: string
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
  posttaxDeductions: PostTaxDeduction[]
  w2Withholding?: W2Withholding
  seTaxConfig?: SelfEmploymentTax
  isActive: boolean
  startDate?: string
  endDate?: string
}
