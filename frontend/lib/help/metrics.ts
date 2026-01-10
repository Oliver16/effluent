// =============================================================================
// METRIC DEFINITIONS — Why metrics matter and what they mean
// =============================================================================

import type { MetricDefinition } from './types'

/**
 * Complete metric definitions with explanations, benchmarks, and interpretations.
 * These power tooltips, the knowledge base, and contextual insights.
 */
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ---------------------------------------------------------------------------
  // Core Health Metrics
  // ---------------------------------------------------------------------------

  liquidityMonths: {
    id: 'metrics/liquidity-months',
    metricKey: 'liquidityMonths',
    title: 'Financial Runway',
    short:
      'How many months you could maintain your current lifestyle if all income stopped today.',
    body: `
# Financial Runway

Your **financial runway** is arguably the most important metric for financial security.
It answers a simple but crucial question: *If all income stopped today, how long could
you maintain your current lifestyle?*

## Why It Matters

Runway gives you **optionality**—the freedom to make choices without financial desperation:

- **Career flexibility**: Take risks like switching industries, starting a business, or
  negotiating from strength during job searches
- **Emergency resilience**: Handle unexpected job loss, medical issues, or family
  emergencies without going into debt
- **Better decisions**: When you're not financially stressed, you make better long-term
  decisions about career, investments, and major purchases

## The Formula

\`\`\`
Runway = Liquid Assets ÷ Monthly Burn Rate
\`\`\`

**Liquid assets** include cash, savings, and investments you can access within days without
penalty. This excludes retirement accounts (early withdrawal penalties), home equity
(illiquid), and other locked assets.

**Monthly burn rate** is your total monthly expenses—fixed costs like rent and insurance
plus variable spending on food, entertainment, etc.

## Interpreting Your Runway

The magic of runway is that you can improve it two ways: build liquid savings OR reduce
your burn rate. Often, reducing expenses by $500/month has more impact than earning
$500 more, because it both improves cash flow AND extends how long your savings last.
    `,
    tags: ['runway', 'emergency-fund', 'liquidity', 'safety'],
    related: ['metrics/burn-rate', 'metrics/savings-rate', 'metrics/net-worth'],
    modules: ['dashboard', 'goals', 'scenarios'],
    level: 'intro',
    formula: 'Liquid Assets ÷ Monthly Burn Rate',
    unit: 'months',
    benchmarks: [
      {
        label: 'Critical',
        value: '< 1 month',
        tone: 'critical',
        description: 'One emergency away from debt',
      },
      {
        label: 'Risky',
        value: '1-3 months',
        tone: 'warning',
        description: 'Limited buffer for unexpected events',
      },
      {
        label: 'Minimum',
        value: '3-6 months',
        tone: 'neutral',
        description: 'Standard emergency fund recommendation',
      },
      {
        label: 'Healthy',
        value: '6-12 months',
        tone: 'good',
        description: 'Good flexibility and security',
      },
      {
        label: 'Strong',
        value: '12+ months',
        tone: 'good',
        description: 'Significant career freedom',
      },
    ],
    influencedBy: [
      'Liquid asset balances',
      'Monthly expenses',
      'Spending patterns',
    ],
    influences: ['Financial stress levels', 'Career decisions', 'Risk tolerance'],
    interpretations: [
      {
        condition: 'value < 1',
        meaning:
          'You have less than one month of expenses saved. Any unexpected expense or income disruption could force you into debt. Building an emergency fund should be your top priority.',
        tone: 'critical',
      },
      {
        condition: 'value >= 1 && value < 3',
        meaning:
          'You have a small buffer, but it may not be enough for serious emergencies like job loss. Focus on building to at least 3 months.',
        tone: 'warning',
      },
      {
        condition: 'value >= 3 && value < 6',
        meaning:
          'You meet the minimum emergency fund guideline. This covers most minor emergencies, but extended job searches may require more.',
        tone: 'neutral',
      },
      {
        condition: 'value >= 6 && value < 12',
        meaning:
          'You have a healthy emergency fund. You can handle most life disruptions and negotiate from a position of strength.',
        tone: 'good',
      },
      {
        condition: 'value >= 12',
        meaning:
          'Excellent runway. You have significant freedom to make major career or life changes without financial pressure.',
        tone: 'good',
      },
    ],
  },

  savingsRate: {
    id: 'metrics/savings-rate',
    metricKey: 'savingsRate',
    title: 'Savings Rate',
    short:
      'The percentage of your income that goes toward savings and investments rather than spending.',
    body: `
# Savings Rate

Your **savings rate** measures what portion of your income you're converting into
long-term wealth rather than consuming. It's the engine that drives net worth growth.

## Why It Matters

Savings rate is the single most controllable factor in building wealth:

- **Time to financial independence**: A 10% savings rate means ~50 years to retirement.
  A 50% rate means ~15 years. The math is powerful.
- **Compound effects**: Every dollar saved starts earning returns, which themselves
  earn returns
- **Lifestyle insulation**: Higher savings rate = lower spending = more resilient to
  income changes

## The Formula

\`\`\`
Savings Rate = (Income - Expenses) ÷ Income × 100
\`\`\`

Note: This includes all savings—emergency fund contributions, retirement accounts,
taxable investments, and debt principal payments above minimums.

## The Savings Rate Spectrum

Different savings rates align with different life goals:

- **< 10%**: Building wealth will take decades; vulnerable to lifestyle creep
- **10-20%**: Traditional retirement by 65 is achievable
- **20-30%**: Early retirement possible; building real security
- **30-50%**: Aggressive wealth building; financial independence within reach
- **50%+**: FIRE territory; could achieve FI in 10-15 years

## Common Pitfalls

- **Ignoring employer match**: 401(k) matches are free money—not capturing them
  effectively reduces your savings rate
- **Lifestyle creep**: As income rises, expenses often rise faster, keeping savings
  rate flat despite higher earnings
- **Excluding debt payoff**: Principal payments on debt ARE savings—you're building
  net worth
    `,
    tags: ['savings', 'wealth-building', 'retirement', 'fire'],
    related: ['metrics/burn-rate', 'metrics/net-worth', 'metrics/liquidity-months'],
    modules: ['dashboard', 'flows', 'goals', 'scenarios'],
    level: 'intro',
    formula: '(Income - Expenses) ÷ Income × 100',
    unit: 'percent',
    benchmarks: [
      {
        label: 'Struggling',
        value: '< 5%',
        tone: 'critical',
        description: 'Minimal wealth building',
      },
      {
        label: 'Starting',
        value: '5-10%',
        tone: 'warning',
        description: 'Basic savings, slow growth',
      },
      {
        label: 'Solid',
        value: '10-20%',
        tone: 'neutral',
        description: 'Traditional retirement path',
      },
      {
        label: 'Strong',
        value: '20-30%',
        tone: 'good',
        description: 'Accelerated wealth building',
      },
      {
        label: 'Exceptional',
        value: '30%+',
        tone: 'good',
        description: 'Early FI possible',
      },
    ],
    influencedBy: [
      'Income level',
      'Fixed expenses',
      'Discretionary spending',
      'Retirement contributions',
    ],
    influences: [
      'Net worth trajectory',
      'Time to financial independence',
      'Emergency fund growth',
    ],
    interpretations: [
      {
        condition: 'value < 5',
        meaning:
          'Your expenses consume almost all your income. Focus on either increasing income or reducing costs—small changes can have big impacts.',
        tone: 'critical',
      },
      {
        condition: 'value >= 5 && value < 10',
        meaning:
          'You\'re saving, but slowly. Look for opportunities to boost this—even 5% more can dramatically accelerate your timeline.',
        tone: 'warning',
      },
      {
        condition: 'value >= 10 && value < 20',
        meaning:
          'Solid savings rate that should lead to a comfortable retirement if maintained over your career.',
        tone: 'neutral',
      },
      {
        condition: 'value >= 20 && value < 30',
        meaning:
          'Strong savings rate. You\'re building wealth faster than most and creating options for yourself.',
        tone: 'good',
      },
      {
        condition: 'value >= 30',
        meaning:
          'Exceptional discipline. At this rate, financial independence is a matter of years, not decades.',
        tone: 'good',
      },
    ],
  },

  netWorth: {
    id: 'metrics/net-worth',
    metricKey: 'netWorthMarket',
    title: 'Net Worth',
    short:
      'Your total assets minus total liabilities—the ultimate scorecard of financial health.',
    body: `
# Net Worth

**Net worth** is the most comprehensive measure of your financial position. It's simple:
everything you own minus everything you owe.

## Why It Matters

Net worth is your financial scorecard:

- **Progress tracking**: Unlike income or savings rate (which measure flow), net worth
  measures the cumulative result of all your financial decisions
- **True wealth indicator**: High income means nothing if it's all spent. Net worth
  shows what you've actually kept.
- **Borrowing power**: Lenders and investors look at net worth to assess financial
  strength

## The Formula

\`\`\`
Net Worth = Total Assets - Total Liabilities
\`\`\`

**Assets** include:
- Cash and bank accounts
- Investment accounts (brokerage, IRAs, 401k)
- Real estate (market value)
- Vehicles and valuable property
- Business ownership stakes

**Liabilities** include:
- Mortgages and HELOCs
- Student loans
- Auto loans
- Credit card balances
- Personal loans

## Market Value vs Cost Basis

Effluent tracks both:
- **Market value**: What assets are worth today (fluctuates)
- **Cost basis**: What you paid (stable reference point)

For financial planning, market value matters more. Cost basis helps with tax planning
and understanding your investment performance.

## Negative Net Worth

Having negative net worth isn't uncommon, especially early in your career with student
loans. What matters is the **trajectory**—are you moving toward positive, and how fast?
    `,
    tags: ['net-worth', 'assets', 'liabilities', 'wealth'],
    related: ['metrics/savings-rate', 'metrics/debt-to-asset-ratio', 'metrics/liquidity-months'],
    modules: ['dashboard', 'accounts', 'scenarios'],
    level: 'intro',
    formula: 'Total Assets - Total Liabilities',
    unit: 'currency',
    benchmarks: [
      {
        label: 'Negative',
        value: '< $0',
        tone: 'warning',
        description: 'Liabilities exceed assets',
      },
      {
        label: 'Building',
        value: '$0-100k',
        tone: 'neutral',
        description: 'Early wealth building phase',
      },
      {
        label: 'Established',
        value: '$100k-500k',
        tone: 'good',
        description: 'Solid financial foundation',
      },
      {
        label: 'Strong',
        value: '$500k+',
        tone: 'good',
        description: 'Significant wealth accumulated',
      },
    ],
    influencedBy: [
      'Savings rate',
      'Investment returns',
      'Debt paydown',
      'Asset appreciation',
    ],
    influences: [
      'Retirement readiness',
      'Financial options',
      'Legacy/inheritance',
    ],
    interpretations: [],
  },

  dscr: {
    id: 'metrics/dscr',
    metricKey: 'dscr',
    title: 'Debt Service Coverage Ratio',
    short:
      'How many times over your income can cover your required debt payments.',
    body: `
# Debt Service Coverage Ratio (DSCR)

**DSCR** measures your ability to service debt obligations from your income. A DSCR of
2.0 means your income is twice your required debt payments.

## Why It Matters

DSCR is a stress indicator:

- **Loan qualification**: Lenders use DSCR to determine if you can handle more debt
- **Financial fragility**: Low DSCR means small income disruptions could cause missed
  payments
- **Flexibility**: Higher DSCR means more discretionary income for savings,
  investments, or lifestyle

## The Formula

\`\`\`
DSCR = Net Operating Income ÷ Total Debt Service
\`\`\`

**Net Operating Income**: Your total income minus non-debt essential expenses
**Total Debt Service**: All required monthly debt payments (minimums)

## Key Thresholds

- **< 1.0**: You cannot cover debt payments from income—unsustainable
- **1.0-1.25**: Barely covering payments, no room for error
- **1.25-1.5**: Adequate coverage, some buffer
- **1.5-2.0**: Healthy coverage, can absorb income shocks
- **> 2.0**: Strong coverage, significant flexibility
    `,
    tags: ['debt', 'coverage', 'income', 'payments'],
    related: ['metrics/dti-ratio', 'metrics/burn-rate'],
    modules: ['dashboard', 'flows', 'scenarios'],
    level: 'intermediate',
    formula: 'Net Operating Income ÷ Total Debt Service',
    unit: 'ratio',
    benchmarks: [
      {
        label: 'Critical',
        value: '< 1.0',
        tone: 'critical',
        description: 'Cannot cover debt payments',
      },
      {
        label: 'Tight',
        value: '1.0-1.25',
        tone: 'warning',
        description: 'Minimal buffer',
      },
      {
        label: 'Adequate',
        value: '1.25-1.5',
        tone: 'neutral',
        description: 'Some flexibility',
      },
      {
        label: 'Healthy',
        value: '1.5-2.0',
        tone: 'good',
        description: 'Good coverage',
      },
      {
        label: 'Strong',
        value: '> 2.0',
        tone: 'good',
        description: 'Excellent flexibility',
      },
    ],
    influencedBy: [
      'Total income',
      'Debt payment amounts',
      'Essential expenses',
    ],
    influences: [
      'Borrowing capacity',
      'Financial stress',
      'Ability to take on new obligations',
    ],
    interpretations: [
      {
        condition: 'value < 1',
        meaning:
          'Your required debt payments exceed your available income. This is unsustainable—you\'re likely drawing from savings or taking on more debt.',
        tone: 'critical',
      },
      {
        condition: 'value >= 1 && value < 1.25',
        meaning:
          'You\'re just barely covering debt payments. Any income disruption could cause missed payments.',
        tone: 'warning',
      },
      {
        condition: 'value >= 1.25 && value < 1.5',
        meaning:
          'Adequate debt coverage with a small buffer for unexpected expenses.',
        tone: 'neutral',
      },
      {
        condition: 'value >= 1.5',
        meaning:
          'Healthy debt coverage. You have flexibility to handle income changes or take on additional obligations if needed.',
        tone: 'good',
      },
    ],
  },

  dtiRatio: {
    id: 'metrics/dti-ratio',
    metricKey: 'dtiRatio',
    title: 'Debt-to-Income Ratio',
    short:
      'The percentage of your gross monthly income that goes toward debt payments.',
    body: `
# Debt-to-Income Ratio (DTI)

**DTI** measures what portion of your income goes to debt payments. Lenders use this
as a key metric for loan approval decisions.

## Why It Matters

DTI is the standard lender metric:

- **Mortgage qualification**: Most lenders want DTI below 36-43%
- **Credit decisions**: High DTI signals risk to lenders
- **Financial flexibility**: Lower DTI means more income for other goals

## The Formula

\`\`\`
DTI = Total Monthly Debt Payments ÷ Gross Monthly Income × 100
\`\`\`

## Front-End vs Back-End DTI

Lenders often look at two versions:
- **Front-end DTI**: Just housing costs (mortgage, insurance, taxes)
- **Back-end DTI**: All debt payments (housing + cards + loans + etc.)

The 28/36 rule suggests front-end < 28% and back-end < 36%.
    `,
    tags: ['debt', 'income', 'lending', 'mortgage'],
    related: ['metrics/dscr', 'metrics/housing-ratio'],
    modules: ['dashboard', 'accounts', 'scenarios'],
    level: 'intermediate',
    formula: 'Total Monthly Debt Payments ÷ Gross Monthly Income × 100',
    unit: 'percent',
    benchmarks: [
      {
        label: 'Excellent',
        value: '< 20%',
        tone: 'good',
        description: 'Very manageable debt load',
      },
      {
        label: 'Good',
        value: '20-35%',
        tone: 'good',
        description: 'Healthy range',
      },
      {
        label: 'Borderline',
        value: '36-43%',
        tone: 'warning',
        description: 'At lender limits',
      },
      {
        label: 'High',
        value: '> 43%',
        tone: 'critical',
        description: 'May limit borrowing options',
      },
    ],
    influencedBy: [
      'Total debt payments',
      'Gross income',
      'Interest rates',
    ],
    influences: [
      'Mortgage eligibility',
      'Loan approval',
      'Interest rates offered',
    ],
    interpretations: [
      {
        condition: 'value > 43',
        meaning:
          'Your DTI exceeds most lender thresholds. Focus on paying down debt or increasing income before taking on new obligations.',
        tone: 'critical',
      },
      {
        condition: 'value > 36 && value <= 43',
        meaning:
          'Your DTI is at the upper limit for most lenders. You may qualify for loans but at less favorable terms.',
        tone: 'warning',
      },
      {
        condition: 'value <= 36',
        meaning:
          'Your DTI is within the healthy range that lenders prefer. You should have good borrowing options.',
        tone: 'good',
      },
    ],
  },

  monthlySurplus: {
    id: 'metrics/monthly-surplus',
    metricKey: 'monthlySurplus',
    title: 'Monthly Surplus',
    short:
      'The difference between your monthly income and expenses—your monthly wealth building capacity.',
    body: `
# Monthly Surplus (Cash Flow)

Your **monthly surplus** is simply income minus expenses. It's the raw material for
building wealth.

## Why It Matters

Surplus is your monthly wealth-building capacity:

- **Positive surplus**: Money available for savings, investing, debt paydown
- **Zero/negative surplus**: Living paycheck-to-paycheck or drawing from savings
- **Trajectory matters**: Growing surplus over time accelerates all financial goals

## Improving Surplus

There are only two levers:
1. **Increase income**: Raises, side income, career growth
2. **Decrease expenses**: Cut costs, optimize spending, reduce waste

Most people focus on income, but expense reduction often has faster, more immediate
impact.
    `,
    tags: ['cashflow', 'surplus', 'income', 'expenses'],
    related: ['metrics/savings-rate', 'metrics/burn-rate'],
    modules: ['dashboard', 'flows'],
    level: 'intro',
    formula: 'Total Monthly Income - Total Monthly Expenses',
    unit: 'currency',
    benchmarks: [
      {
        label: 'Negative',
        value: '< $0',
        tone: 'critical',
        description: 'Spending exceeds income',
      },
      {
        label: 'Break-even',
        value: '$0-100',
        tone: 'warning',
        description: 'Minimal buffer',
      },
      {
        label: 'Positive',
        value: '$100+',
        tone: 'good',
        description: 'Building wealth',
      },
    ],
    influencedBy: ['Income sources', 'Expense categories', 'Timing of flows'],
    influences: ['Savings rate', 'Runway growth', 'Debt paydown speed'],
    interpretations: [
      {
        condition: 'value < 0',
        meaning:
          'You\'re spending more than you earn. This is unsustainable—you\'re either drawing from savings or accumulating debt.',
        tone: 'critical',
      },
      {
        condition: 'value >= 0 && value < 500',
        meaning:
          'You have a small positive cash flow. Look for opportunities to widen this margin for faster wealth building.',
        tone: 'warning',
      },
      {
        condition: 'value >= 500',
        meaning:
          'Healthy positive cash flow. You have meaningful capacity to save, invest, or pay down debt each month.',
        tone: 'good',
      },
    ],
  },
}

/**
 * Get a metric definition by its key
 */
export function getMetricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[key]
}

/**
 * Get all metric definitions for a given module
 */
export function getMetricsByModule(module: string): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter((m) =>
    m.modules.includes(module as MetricDefinition['modules'][number])
  )
}

/**
 * Search metric definitions by query
 */
export function searchMetrics(query: string): MetricDefinition[] {
  const q = query.toLowerCase()
  return Object.values(METRIC_DEFINITIONS).filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.short.toLowerCase().includes(q) ||
      m.tags.some((t) => t.includes(q))
  )
}
