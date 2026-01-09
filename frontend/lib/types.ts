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

export type BaselineMode = 'live' | 'pinned'

export interface Scenario {
  id: string
  name: string
  description?: string
  isBaseline?: boolean
  parentScenario?: string | null
  // Baseline-specific fields
  baselineMode?: BaselineMode
  baselineModeDisplay?: string
  baselinePinnedAt?: string | null
  baselinePinnedAsOfDate?: string | null
  lastProjectedAt?: string | null
  // Projection settings
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

export type LifeEventCategory =
  | 'career'
  | 'housing'
  | 'family'
  | 'education'
  | 'health'
  | 'financial'
  | 'retirement'

export interface SuggestedChange {
  change_type: string
  name: string
  description: string
  parameters_template: Record<string, unknown>
  is_required: boolean
}

export interface LifeEventTemplate {
  id?: string
  name: string
  description: string
  category: LifeEventCategory
  category_display?: string
  icon: string
  suggested_changes: SuggestedChange[]
  display_order?: number
  is_active?: boolean
}

export interface LifeEventCategoryGroup {
  category: LifeEventCategory
  category_display: string
  templates: LifeEventTemplate[]
}

// Baseline scenario types
export interface MetricValue {
  value: string
  trend: 'up' | 'down' | 'stable' | null
}

export interface BaselineHealthMetrics {
  asOfDate: string
  netWorth: MetricValue
  monthlySurplus: MetricValue
  liquidityMonths: MetricValue
  savingsRate: MetricValue
  dscr: MetricValue
}

export interface BaselineHealth {
  baselineId: string
  baselineMode: BaselineMode
  baselinePinnedAt: string | null
  baselinePinnedAsOfDate: string | null
  lastProjectedAt: string | null
  metrics: BaselineHealthMetrics | null
}

export interface BaselineResponse {
  baseline: Scenario
  health: BaselineHealth
}

export interface BaselineActionResponse {
  status: string
  baseline: Scenario
  lastProjectedAt?: string | null
  baselinePinnedAt?: string | null
  baselinePinnedAsOfDate?: string | null
}

// Decision Templates (TASK-13)
export type DecisionCategory =
  | 'income'
  | 'expenses'
  | 'debt'
  | 'housing'
  | 'retirement'
  | 'savings'

export type DecisionFieldType =
  | 'currency'
  | 'percent'
  | 'integer'
  | 'select'
  | 'date'
  | 'toggle'
  | 'text'

export interface DecisionFieldOption {
  value: string
  label: string
}

export interface DecisionField {
  key: string
  type: DecisionFieldType
  label: string
  required?: boolean
  default?: unknown
  placeholder?: string
  helperText?: string
  options?: DecisionFieldOption[]
  showIf?: string
  min?: number
  max?: number
}

export interface DecisionStep {
  id: string
  title: string
  description?: string
  fields: DecisionField[]
}

export interface DecisionUISchema {
  steps: DecisionStep[]
}

export interface DecisionTemplate {
  key: string
  name: string
  description: string
  category: DecisionCategory
  icon: string
  uiSchema: DecisionUISchema
  sortOrder?: number
}

export interface DecisionCategoryGroup {
  category: DecisionCategory
  categoryDisplay: string
  templates: DecisionTemplate[]
}

export interface DecisionMetricComparison {
  netWorth: string
  liquidityMonths: string
  dscr: string
  savingsRate: string
  monthlySurplus: string
}

export interface DecisionGoalStatusComparison {
  goalId: string
  goalType: string
  goalName: string
  targetValue: string
  currentValue: string
  status: string
  deltaToTarget: string
}

export interface DecisionSummary {
  baseline: DecisionMetricComparison
  scenario: DecisionMetricComparison
  goalStatus: {
    baseline: DecisionGoalStatusComparison[]
    scenario: DecisionGoalStatusComparison[]
  }
  takeaways: string[]
}

export interface DecisionRunResponse {
  scenarioId: string
  scenarioName: string
  decisionRunId: string
  changesCreated: number
  projections: {
    now?: ScenarioProjection
    year_1?: ScenarioProjection
    year_3?: ScenarioProjection
    year_5?: ScenarioProjection
  }
  summary?: DecisionSummary
}

export interface DecisionRun {
  id: string
  templateKey: string
  templateName: string
  inputs: Record<string, unknown>
  createdScenario?: string
  scenarioNameOverride?: string
  isDraft: boolean
  completedAt?: string
  createdAt: string
}

// TASK-14: Goals types
export type GoalType =
  | 'emergency_fund_months'
  | 'min_dscr'
  | 'min_savings_rate'
  | 'net_worth_target'
  | 'net_worth_target_by_date'  // Added: time-bound net worth goal
  | 'retirement_age'
  | 'debt_free_date'
  | 'custom'

// Backend returns 'good' for on-track goals
export type GoalStatus = 'good' | 'warning' | 'critical' | 'achieved'

export interface Goal {
  id: string
  name: string
  displayName: string
  goalType: GoalType
  goalTypeDisplay?: string
  targetValue: string
  targetUnit: string
  targetDate?: string | null
  targetMeta?: Record<string, unknown>
  isPrimary: boolean
  isActive: boolean
  currentStatus: GoalStatus
  currentStatusDisplay?: string
  currentValue?: string | null
  lastEvaluatedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface GoalStatusResult {
  goalId: string
  goalType: GoalType
  goalName: string
  targetValue: string
  targetUnit: string
  currentValue: string
  status: GoalStatus
  deltaToTarget: string
  percentageComplete?: string | null
  recommendation: string
}

// Type alias for backward compatibility with components using GoalStatusDTO
export type GoalStatusDTO = GoalStatusResult

export interface GoalStatusResponse {
  results: GoalStatusResult[]
  count: number
}

export interface GoalSolveOptions {
  allowedInterventions?: string[]
  bounds?: Record<string, string>
  startDate?: string
  projectionMonths?: number
}

export interface GoalPlanStep {
  changeType: string
  name?: string
  parameters: Record<string, unknown>
}

export interface GoalSolution {
  id: string
  goal: string
  goalName: string
  options: GoalSolveOptions
  plan: GoalPlanStep[]
  result: {
    baselineValue?: string
    finalValue?: string
    worstMonthValue?: string
    message?: string
    error?: string
  }
  success: boolean
  errorMessage: string
  computedAt: string
  appliedScenario?: string | null
  appliedAt?: string | null
}

export interface ApplySolutionResponse {
  scenario: {
    id: string
    name: string
    createdAt: string
  }
  changes: Array<{ id: string; name: string; changeType: string }>
  summary: Record<string, unknown>
  redirectUrl: string
}

// TASK-14: Actions types
export interface ActionCandidate {
  id: string
  name: string
  description: string
  changeType: string
  defaultParameters: Record<string, string>
  impactEstimate: string
}

export interface ActionSuggestion {
  templateId: string
  name: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  recommendedCandidateId: string
  candidates: ActionCandidate[]
  context: Record<string, string>
}

export interface NextActionsResponse {
  actions: ActionSuggestion[]
  count: number
}

export interface ApplyActionResponse {
  scenario: {
    id: string
    name: string
    createdAt: string
  }
  changes: Array<{ id: string; name: string; changeType: string }>
  summary: Record<string, unknown>
  redirectUrl: string
}

export interface ActionTemplate {
  id: string
  name: string
  description: string
  appliesWhen: string
  candidates: ActionCandidate[]
}

export interface ActionTemplatesResponse {
  templates: ActionTemplate[]
  count: number
}

// TASK-14: Tax summary types
export interface TaxIncomeSummary {
  sourceId: string
  sourceName: string
  incomeType: string
  grossAnnual: string
  federalWithholdingAnnual: string
  stateWithholdingAnnual: string
  ficaAnnual: string
  pretaxDeductionsAnnual: string
  netAnnual: string
  effectiveRate: string
}

export interface TaxStrategy {
  id: string
  title: string
  description: string
  potentialSavings: string
  actionTemplate: string
}

export interface TaxSummaryResponse {
  filingStatus: string
  stateOfResidence: string
  summary: {
    totalGrossAnnual: string
    totalFederalWithholding: string
    totalStateWithholding: string
    totalFica: string
    totalPretaxDeductions: string
    totalTaxes: string
    totalNetAnnual: string
    effectiveTaxRate: string
    quarterlyEstimates: string
  }
  incomeSources: TaxIncomeSummary[]
  taxStrategies: TaxStrategy[]
}

// TASK-14: Data quality types
export interface DataQualityIssue {
  field: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  accountId?: string
  sourceId?: string
}

export interface DataQualityResponse {
  confidenceScore: number
  confidenceTier: 'high' | 'medium' | 'low'
  tierDescription: string
  issues: DataQualityIssue[]
  warnings: DataQualityIssue[]
  summary: {
    assetAccounts: number
    liabilityAccounts: number
    incomeSources: number
    expenseFlows: number
  }
}

// Types used by ModelConfidenceCard component
export interface DataQualityItemCta {
  label: string
  route: string
}

export interface DataQualityItem {
  key: string
  title: string
  severity: 'critical' | 'warning' | 'info'
  cta?: DataQualityItemCta
}

export interface DataQualityReport {
  confidenceScore: number
  confidenceLevel: 'high' | 'medium' | 'low'
  missing: DataQualityItem[]
  warnings: DataQualityItem[]
}

// TASK-14: Adopt scenario types
export interface AdoptedChange {
  changeId: string
  type: string
  flowId?: string
  reason?: string
}

export interface AdoptScenarioResponse {
  status: string
  adoptedChanges: AdoptedChange[]
  skippedChanges: AdoptedChange[]
  scenarioArchived: boolean
}

// TASK-15: Stress test types
export type StressTestCategory = 'income' | 'expense' | 'interest_rate' | 'market' | 'inflation'

export interface StressTestTemplate {
  key: string
  name: string
  category: StressTestCategory
  description: string
  severity: 'warning' | 'critical'
}

export interface StressTestSummary {
  status: 'passed' | 'warning' | 'failed'
  firstNegativeCashFlowMonth?: number | null
  firstLiquidityBreachMonth?: number | null
  minLiquidityMonths: number
  minDscr: number
  maxNetWorthDrawdownPercent: number
  breachedThresholdsCount: number
}

export interface ThresholdBreach {
  metric: string
  threshold: number
  firstBreachMonth: number
  breachDurationMonths: number
  worstValue: number
}

export interface MonthlyComparison {
  months: number[]
  baselineLiquidity: (number | null)[]
  stressedLiquidity: number[]
  baselineNetWorth: (number | null)[]
  stressedNetWorth: number[]
}

export interface StressTestResult {
  testKey: string
  testName: string
  scenarioId: string
  summary: StressTestSummary
  breaches: ThresholdBreach[]
  monthlyComparison: MonthlyComparison
  computedAt: string
}

export interface StressTestListResponse {
  tests: StressTestTemplate[]
  count: number
}

export interface StressTestBatchSummary {
  totalTests: number
  passed: number
  warning: number
  failed: number
  resilienceScore: number
}

export interface StressTestBatchResponse {
  results: Omit<StressTestResult, 'breaches' | 'monthlyComparison'>[]
  errors: Array<{ testKey: string; error: string }>
  summary: StressTestBatchSummary
}

// TASK-15: Scenario comparison types
export interface DriverBucket {
  name: string
  amount: number
  description: string
}

export interface ComparisonDriverAnalysis {
  scenarioId: string
  horizonMonths: number
  baselineEndNw: number
  scenarioEndNw: number
  netWorthDelta: number
  drivers: DriverBucket[]
  reconciliationErrorPercent: number
}

export interface DriverAnalysisResult {
  baselineId: string
  baselineName: string
  comparisons: ComparisonDriverAnalysis[]
}

export interface ScenarioComparisonResult {
  scenario: Scenario
  projections: ScenarioProjection[]
}

export interface ScenarioCompareResponse {
  results: ScenarioComparisonResult[]
  driverAnalysis?: DriverAnalysisResult | { error: string }
}
