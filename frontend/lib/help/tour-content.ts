// =============================================================================
// TOUR STEP CONTENT — Text and guidance for each tour step
// =============================================================================

import type { HelpContent } from './types'

/**
 * Tour-specific content that doesn't fit the metric definition format.
 * These are referenced by contentId in tour steps.
 */
export const TOUR_CONTENT: Record<string, HelpContent> = {
  // ---------------------------------------------------------------------------
  // Dashboard Tour Content
  // ---------------------------------------------------------------------------

  'tour/dashboard/welcome': {
    id: 'tour/dashboard/welcome',
    title: 'Welcome to Your Dashboard',
    short:
      'Your dashboard shows your complete financial picture at a glance. Let\'s explore what each section means.',
    body: `
This is your financial command center. Every metric here is calculated from your
accounts, flows, and settings.

By the end of this tour, you'll understand:
- What each metric tells you about your financial health
- How to spot warning signs and opportunities
- Where to go to take action on insights
    `,
    tags: ['tour', 'dashboard', 'welcome'],
    related: [],
    modules: ['dashboard'],
    level: 'intro',
  },

  'tour/dashboard/surplus': {
    id: 'tour/dashboard/surplus',
    title: 'Monthly Surplus',
    short:
      'Your monthly surplus shows whether you\'re spending more or less than you earn.',
    body: `
Your **monthly surplus** is the difference between your income and expenses each month:

- **Positive surplus**: You're earning more than you spend—this money can go toward savings, investments, or paying down debt
- **Negative surplus (deficit)**: You're spending more than you earn—this depletes savings and may indicate unsustainable spending

This is your "financial engine"—a positive surplus builds wealth, while a deficit consumes it.

**Tip**: Even small improvements to surplus compound dramatically over time. An extra $200/month in surplus is $2,400/year toward your goals.
    `,
    tags: ['tour', 'dashboard', 'surplus', 'cashflow'],
    related: ['metrics/savings-rate', 'metrics/burn-rate'],
    modules: ['dashboard'],
    level: 'intro',
  },

  'tour/dashboard/net-worth-chart': {
    id: 'tour/dashboard/net-worth-chart',
    title: 'Net Worth Projection',
    short:
      'This chart shows your projected net worth over time, based on your current flows and accounts.',
    body: `
The solid line shows your baseline projection—what happens if nothing changes.

When you create scenarios, you can compare how different decisions affect this trajectory.
The shaded area often indicates uncertainty ranges or different scenarios.

**Pro tip**: Hover over the chart to see exact values at any point in time.
    `,
    tags: ['tour', 'dashboard', 'chart', 'projection'],
    related: ['metrics/net-worth'],
    modules: ['dashboard'],
    level: 'intro',
  },

  'tour/dashboard/confidence': {
    id: 'tour/dashboard/confidence',
    title: 'Model Confidence',
    short:
      'This shows how much you can trust your projections based on your data quality.',
    body: `
Your model confidence depends on:
- **Account freshness**: Are your balances up to date?
- **Flow completeness**: Have you captured all income and expenses?
- **Data coverage**: Do you have enough history?

Low confidence isn't bad—it just means there's uncertainty. Click to see what's
missing and how to improve accuracy.
    `,
    tags: ['tour', 'dashboard', 'confidence', 'data-quality'],
    related: ['concepts/data-quality', 'concepts/confidence-score'],
    modules: ['dashboard'],
    level: 'intro',
  },

  'tour/dashboard/insights': {
    id: 'tour/dashboard/insights',
    title: 'Insights & Recommendations',
    short:
      'Effluent analyzes your data and surfaces actionable insights here.',
    body: `
Insights are automatically generated based on your financial situation:

- **Critical** (red): Issues that need immediate attention
- **Warning** (yellow): Things to watch or consider addressing
- **Info** (blue): Opportunities and suggestions
- **Positive** (green): Achievements and good news

Each insight includes an explanation of *why* it matters and suggested next steps.
    `,
    tags: ['tour', 'dashboard', 'insights'],
    related: [],
    modules: ['dashboard'],
    level: 'intro',
  },

  'tour/dashboard/complete': {
    id: 'tour/dashboard/complete',
    title: 'Dashboard Tour Complete!',
    short:
      'You now understand the key elements of your financial dashboard.',
    body: `
**What you learned:**
- Your runway shows financial resilience
- Net worth tracks overall wealth building
- Savings rate measures progress velocity
- Confidence tells you how reliable projections are
- Insights highlight what needs attention

**Next steps:**
- Explore the Flows module to understand your cash flow
- Try creating a scenario to model a future decision
- Click the (?) icons next to any metric for detailed explanations
    `,
    tags: ['tour', 'dashboard', 'complete'],
    related: ['tour/flows/welcome', 'tour/scenarios/welcome'],
    modules: ['dashboard'],
    level: 'intro',
  },

  // ---------------------------------------------------------------------------
  // Flows Tour Content
  // ---------------------------------------------------------------------------

  'tour/flows/welcome': {
    id: 'tour/flows/welcome',
    title: 'Understanding Flows',
    short:
      'Flows are the recurring income and expenses that shape your financial future.',
    body: `
A **flow** is any recurring movement of money:
- Income flows: salary, side income, dividends, rent
- Expense flows: rent/mortgage, utilities, subscriptions, groceries

Flows power all of Effluent's projections. The more accurately you capture them,
the more useful your scenarios become.
    `,
    tags: ['tour', 'flows', 'welcome'],
    related: ['concepts/flows'],
    modules: ['flows'],
    level: 'intro',
  },

  'tour/flows/concept': {
    id: 'tour/flows/concept',
    title: 'How Flows Work',
    short:
      'Each flow has an amount, frequency, and date range that determines when it applies.',
    body: `
Key properties of a flow:
- **Amount**: How much per occurrence
- **Frequency**: Monthly, bi-weekly, annually, one-time
- **Start/End dates**: When the flow is active
- **Category**: For grouping and analysis

Flows marked as "baseline" affect your default projections. Scenario-specific flows
let you model changes without affecting your baseline.
    `,
    tags: ['tour', 'flows', 'concept'],
    related: [],
    modules: ['flows'],
    level: 'intro',
  },

  'tour/flows/income': {
    id: 'tour/flows/income',
    title: 'Income Flows',
    short:
      'Income flows represent money coming in—salary, investments, side hustles.',
    body: `
Common income flows:
- **Salary/wages**: Your regular paycheck (after-tax for simplicity, or gross with deductions)
- **Investment income**: Dividends, interest, rental income
- **Side income**: Freelancing, consulting, gig work
- **Other**: Gifts, tax refunds, bonuses

**Tip**: For variable income, use your best monthly estimate. You can always adjust.
    `,
    tags: ['tour', 'flows', 'income'],
    related: [],
    modules: ['flows'],
    level: 'intro',
  },

  'tour/flows/expenses': {
    id: 'tour/flows/expenses',
    title: 'Expense Flows',
    short:
      'Expense flows represent money going out—bills, subscriptions, regular spending.',
    body: `
Common expense categories:
- **Housing**: Rent, mortgage, property tax, insurance
- **Transportation**: Car payment, insurance, gas, transit
- **Utilities**: Electric, water, internet, phone
- **Subscriptions**: Streaming, software, memberships
- **Living**: Groceries, dining, entertainment

**Tip**: Don't forget annual expenses like insurance premiums or property taxes—set
them as annual flows so projections account for them.
    `,
    tags: ['tour', 'flows', 'expenses'],
    related: [],
    modules: ['flows'],
    level: 'intro',
  },

  'tour/flows/add-flow': {
    id: 'tour/flows/add-flow',
    title: 'Adding a Flow',
    short:
      'Click here to add a new income or expense flow.',
    body: `
When you add a flow, you'll specify:
1. **Type**: Income or expense
2. **Name**: Something descriptive
3. **Amount**: Per-occurrence amount
4. **Frequency**: How often it occurs
5. **Dates**: When it starts (and optionally ends)

Try adding a flow now to see how it works!
    `,
    tags: ['tour', 'flows', 'add'],
    related: [],
    modules: ['flows'],
    level: 'intro',
  },

  'tour/flows/form': {
    id: 'tour/flows/form',
    title: 'The Flow Form',
    short:
      'Fill in the details here. Required fields are marked, but more detail is better.',
    body: `
**Pro tips:**
- Use clear, descriptive names you'll recognize later
- For variable expenses (groceries, gas), use your monthly average
- Set end dates for things that will stop (car loan, subscription trial)
- Add notes to remind yourself why this flow exists
    `,
    tags: ['tour', 'flows', 'form'],
    related: [],
    modules: ['flows'],
    level: 'intro',
  },

  'tour/flows/complete': {
    id: 'tour/flows/complete',
    title: 'Flows Tour Complete!',
    short:
      'You now understand how flows power your financial projections.',
    body: `
**What you learned:**
- Flows are recurring income and expenses
- Each flow has amount, frequency, and date range
- Accurate flows = accurate projections

**Next steps:**
- Add any missing income or expense flows
- Review existing flows for accuracy
- Explore scenarios to see how changing flows affects your future
    `,
    tags: ['tour', 'flows', 'complete'],
    related: ['tour/scenarios/welcome'],
    modules: ['flows'],
    level: 'intro',
  },

  // ---------------------------------------------------------------------------
  // Scenarios Tour Content
  // ---------------------------------------------------------------------------

  'tour/scenarios/welcome': {
    id: 'tour/scenarios/welcome',
    title: 'Exploring Scenarios',
    short:
      'Scenarios let you model "what if" questions about your financial future.',
    body: `
A scenario is a hypothetical version of your finances. You can:
- Model a job change, raise, or career shift
- See how buying a house affects your trajectory
- Compare paying off debt vs. investing
- Plan for major life events

Every scenario starts from your **baseline**—your current reality—and adds changes.
    `,
    tags: ['tour', 'scenarios', 'welcome'],
    related: ['concepts/baseline', 'concepts/scenario-changes'],
    modules: ['scenarios'],
    level: 'intro',
  },

  'tour/scenarios/baseline': {
    id: 'tour/scenarios/baseline',
    title: 'Your Baseline',
    short:
      'The baseline is your current financial reality—your default projection if nothing changes.',
    body: `
The baseline is built from:
- Your current account balances
- Your active income and expense flows
- Default growth assumptions (inflation, investment returns)

When you create a scenario, you're asking: "What if something changed from this baseline?"

Your baseline can be **live** (always reflects current data) or **pinned** (frozen at
a point in time for consistent comparison).
    `,
    tags: ['tour', 'scenarios', 'baseline'],
    related: ['concepts/baseline'],
    modules: ['scenarios'],
    level: 'intro',
  },

  'tour/scenarios/list': {
    id: 'tour/scenarios/list',
    title: 'Your Scenarios',
    short:
      'Each card represents a different version of your financial future.',
    body: `
Scenarios you might create:
- "What if I got a 20% raise?"
- "What if I bought a house?"
- "What if I maxed my 401k?"
- "What if I paid off student loans aggressively?"

You can have multiple scenarios and compare them side-by-side to make better decisions.
    `,
    tags: ['tour', 'scenarios', 'list'],
    related: [],
    modules: ['scenarios'],
    level: 'intro',
  },

  'tour/scenarios/create': {
    id: 'tour/scenarios/create',
    title: 'Creating a Scenario',
    short:
      'Click here to start modeling a new financial future.',
    body: `
You can create scenarios two ways:
1. **From scratch**: Start blank and add changes manually
2. **From a decision template**: Use the Decision module for guided "what if" modeling

Try creating a scenario to see how changes affect your projections!
    `,
    tags: ['tour', 'scenarios', 'create'],
    related: ['tour/decisions/welcome'],
    modules: ['scenarios'],
    level: 'intro',
  },

  'tour/scenarios/compare': {
    id: 'tour/scenarios/compare',
    title: 'Comparing Scenarios',
    short:
      'Select multiple scenarios to see them side-by-side.',
    body: `
Comparison shows you:
- How key metrics differ between scenarios
- Side-by-side projections charts
- **Driver analysis**: What's causing the difference?

This is powerful for decisions like "Should I take Job A or Job B?" or "Buy vs. rent?"
    `,
    tags: ['tour', 'scenarios', 'compare'],
    related: [],
    modules: ['scenarios'],
    level: 'intro',
  },

  'tour/scenarios/complete': {
    id: 'tour/scenarios/complete',
    title: 'Scenarios Tour Complete!',
    short:
      'You now understand how to model different financial futures.',
    body: `
**What you learned:**
- Baseline is your current reality
- Scenarios model "what if" changes
- You can compare scenarios side-by-side

**Next steps:**
- Create your first scenario
- Try the Decision module for guided scenario creation
- Compare different life choices to find the best path
    `,
    tags: ['tour', 'scenarios', 'complete'],
    related: ['tour/decisions/welcome'],
    modules: ['scenarios'],
    level: 'intro',
  },

  // ---------------------------------------------------------------------------
  // Decisions Tour Content
  // ---------------------------------------------------------------------------

  'tour/decisions/welcome': {
    id: 'tour/decisions/welcome',
    title: 'Making Decisions',
    short:
      'The decision wizard helps you model major life choices step by step.',
    body: `
Instead of manually creating scenario changes, decisions provide:
- Guided questions for common situations
- Automatic scenario generation
- Clear before/after comparisons
- Goal impact analysis

Perfect for: job changes, major purchases, debt strategies, retirement planning.
    `,
    tags: ['tour', 'decisions', 'welcome'],
    related: ['concepts/decision-modeling'],
    modules: ['decisions'],
    level: 'intro',
  },

  'tour/decisions/templates': {
    id: 'tour/decisions/templates',
    title: 'Decision Templates',
    short:
      'Choose a template that matches the decision you\'re considering.',
    body: `
Available templates:
- **Job change**: New salary, benefits, commute costs
- **Housing**: Buy, sell, rent, refinance
- **Debt**: Payoff strategies, consolidation
- **Savings**: Emergency fund, retirement boost
- **Major purchase**: Car, education, home improvement

Each template asks the right questions and builds a complete scenario for you.
    `,
    tags: ['tour', 'decisions', 'templates'],
    related: [],
    modules: ['decisions'],
    level: 'intro',
  },

  'tour/decisions/wizard': {
    id: 'tour/decisions/wizard',
    title: 'The Decision Wizard',
    short:
      'Answer questions step by step, and Effluent builds your scenario automatically.',
    body: `
The wizard:
1. Asks targeted questions about your decision
2. Captures all relevant financial changes
3. Creates a complete scenario
4. Projects the impact over time

You can always edit the resulting scenario if you want to adjust anything.
    `,
    tags: ['tour', 'decisions', 'wizard'],
    related: [],
    modules: ['decisions'],
    level: 'intro',
  },

  'tour/decisions/results': {
    id: 'tour/decisions/results',
    title: 'Decision Results',
    short:
      'See exactly how this decision would affect your financial trajectory.',
    body: `
Results show:
- **Metric changes**: How runway, savings rate, net worth shift
- **Timeline projections**: Year 1, 3, 5 outlook
- **Goal impact**: Will this help or hurt your goals?
- **Key takeaways**: Plain-language summary

Use this to make confident, informed decisions.
    `,
    tags: ['tour', 'decisions', 'results'],
    related: [],
    modules: ['decisions'],
    level: 'intro',
  },

  'tour/decisions/complete': {
    id: 'tour/decisions/complete',
    title: 'Decisions Tour Complete!',
    short:
      'You now know how to use the decision wizard for major life choices.',
    body: `
**What you learned:**
- Decision templates guide you through common choices
- The wizard asks the right questions
- Results show clear before/after impact

**Next steps:**
- Model a decision you're actually considering
- Compare the resulting scenario to your baseline
- Use insights to make a confident choice
    `,
    tags: ['tour', 'decisions', 'complete'],
    related: [],
    modules: ['decisions'],
    level: 'intro',
  },

  // ---------------------------------------------------------------------------
  // Goals Tour Content
  // ---------------------------------------------------------------------------

  'tour/goals/welcome': {
    id: 'tour/goals/welcome',
    title: 'Setting Goals',
    short:
      'Goals give you concrete targets to work toward and track.',
    body: `
Goals transform vague intentions into measurable targets:
- "Build an emergency fund" → "6 months runway by December"
- "Save for retirement" → "$1M net worth by age 50"
- "Get out of debt" → "Debt-free by 2026"

Effluent tracks your progress and can even suggest how to reach goals faster.
    `,
    tags: ['tour', 'goals', 'welcome'],
    related: ['concepts/goal-types'],
    modules: ['goals'],
    level: 'intro',
  },

  'tour/goals/types': {
    id: 'tour/goals/types',
    title: 'Types of Goals',
    short:
      'Effluent supports various goal types for different financial objectives.',
    body: `
Common goal types:
- **Emergency fund**: Target runway in months
- **Net worth target**: Reach a specific amount (optionally by a date)
- **Savings rate**: Maintain a minimum savings percentage
- **Debt-free date**: Pay off all debt by a target date
- **DSCR floor**: Maintain healthy debt coverage

Each goal type has specific tracking logic and recommendations.
    `,
    tags: ['tour', 'goals', 'types'],
    related: ['concepts/goal-types'],
    modules: ['goals'],
    level: 'intro',
  },

  'tour/goals/status': {
    id: 'tour/goals/status',
    title: 'Goal Status',
    short:
      'Track whether you\'re on pace, at risk, or need to make changes.',
    body: `
Status indicators:
- **On track** (green): Current trajectory reaches goal
- **At risk** (yellow): May miss goal without changes
- **Off track** (red): Unlikely to reach goal on current path
- **Achieved** (star): Goal already met!

Click any goal to see detailed progress and recommendations.
    `,
    tags: ['tour', 'goals', 'status'],
    related: [],
    modules: ['goals'],
    level: 'intro',
  },

  'tour/goals/solver': {
    id: 'tour/goals/solver',
    title: 'Goal Solver',
    short:
      'Let Effluent suggest changes to help you reach your goals.',
    body: `
The goal solver can:
- Calculate required savings rate to hit a net worth target
- Suggest expense cuts to reach a runway goal
- Find optimal debt payoff strategies
- Show trade-offs between different approaches

It's like having a financial advisor run the numbers for you.
    `,
    tags: ['tour', 'goals', 'solver'],
    related: ['concepts/goal-solver'],
    modules: ['goals'],
    level: 'intro',
  },

  'tour/goals/complete': {
    id: 'tour/goals/complete',
    title: 'Goals Tour Complete!',
    short:
      'You now understand how to set and track financial goals.',
    body: `
**What you learned:**
- Goals turn intentions into measurable targets
- Different goal types for different objectives
- Status tracking shows if you're on pace
- The solver suggests how to reach goals faster

**Next steps:**
- Set at least one primary goal
- Check your goal status regularly
- Use the solver when you need guidance
    `,
    tags: ['tour', 'goals', 'complete'],
    related: [],
    modules: ['goals'],
    level: 'intro',
  },
}

/**
 * Get tour content by ID
 */
export function getTourContent(contentId: string): HelpContent | undefined {
  return TOUR_CONTENT[contentId]
}
