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
  debtToAssetCost: string
  highInterestDebtRatio: string
  housingRatio: string
  fixedExpenseRatio: string
  essentialExpenseRatio: string
  incomeConcentration: string
  unrealizedGains: string
  investmentRate: string
  totalAssetsMarket: string
  totalAssetsCost: string
  totalLiabilities: string
  totalMonthlyIncome: string
  totalMonthlyExpenses: string
  totalDebtService: string
  totalLiquidAssets: string
  weightedAvgInterestRate: string
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
  isBaseline?: boolean
  parentScenario?: string | null
  projectionMonths?: number
  startDate?: string
  inflationRate?: string
  investmentReturnRate?: string
  salaryGrowthRate?: string
  isActive?: boolean
  isArchived?: boolean
  createdAt?: string
  updatedAt?: string
  changes?: ScenarioChange[]
  projections?: ScenarioProjection[]
}

export interface ScenarioChange {
  id: string
  scenario?: string
  changeType: string
  name: string
  description?: string
  effectiveDate: string
  endDate?: string | null
  sourceAccountId?: string | null
  sourceFlowId?: string | null
  parameters: Record<string, unknown>
  displayOrder?: number
  isEnabled: boolean
}

export interface ScenarioProjection {
  id: string
  projectionDate: string
  monthNumber: number
  totalAssets: string
  totalLiabilities: string
  netWorth: string
  liquidAssets: string
  retirementAssets: string
  totalIncome: string
  totalExpenses: string
  netCashFlow: string
  dscr: string
  savingsRate: string
  liquidityMonths: string
  incomeBreakdown: Record<string, string>
  expenseBreakdown: Record<string, string>
  assetBreakdown: Record<string, string>
  liabilityBreakdown: Record<string, string>
  computedAt?: string
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
