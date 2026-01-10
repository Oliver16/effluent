// =============================================================================
// INSIGHT RULES — Generate contextual explanations from metrics
// =============================================================================

import type { ContextualInsight, InsightRule, InsightCategory } from './types'
import type { MetricSnapshot, DataQualityResponse } from '../types'

// -----------------------------------------------------------------------------
// Insight Rule Definitions
// -----------------------------------------------------------------------------

export const INSIGHT_RULES: InsightRule[] = [
  // ---------------------------------------------------------------------------
  // Runway / Liquidity Insights
  // ---------------------------------------------------------------------------
  {
    id: 'critical-runway',
    category: 'runway',
    priority: 100,
    condition: 'liquidityMonths < 1',
    template: {
      severity: 'critical',
      title: 'Emergency fund critically low',
      explanation:
        'You have less than one month of expenses saved. Any unexpected expense or income disruption could force you into high-interest debt.',
      deepLinkId: 'metrics/liquidity-months',
      actions: [
        { label: 'Set emergency fund goal', href: '/goals/new?type=emergency_fund_months', variant: 'primary' },
        { label: 'Review expenses', href: '/flows?type=expense', variant: 'secondary' },
      ],
    },
  },
  {
    id: 'low-runway',
    category: 'runway',
    priority: 90,
    condition: 'liquidityMonths >= 1 && liquidityMonths < 3',
    template: {
      severity: 'warning',
      title: 'Runway below safety threshold',
      explanation:
        'Your {liquidityMonths}-month runway is below the recommended 3-month minimum. This leaves you vulnerable to unexpected job loss or emergencies.',
      deepLinkId: 'metrics/liquidity-months',
      actions: [
        { label: 'Build emergency fund', href: '/goals/new?type=emergency_fund_months', variant: 'primary' },
      ],
    },
  },
  {
    id: 'healthy-runway',
    category: 'runway',
    priority: 20,
    condition: 'liquidityMonths >= 6 && liquidityMonths < 12',
    template: {
      severity: 'positive',
      title: 'Healthy emergency fund',
      explanation:
        'Your {liquidityMonths}-month runway exceeds the recommended 6-month minimum. You have solid protection against income disruptions.',
      deepLinkId: 'metrics/liquidity-months',
      actions: [],
    },
  },
  {
    id: 'strong-runway',
    category: 'runway',
    priority: 10,
    condition: 'liquidityMonths >= 12',
    template: {
      severity: 'positive',
      title: 'Excellent financial runway',
      explanation:
        'With {liquidityMonths} months of runway, you have significant freedom to make career changes or weather extended emergencies without financial stress.',
      deepLinkId: 'metrics/liquidity-months',
      actions: [],
    },
  },

  // ---------------------------------------------------------------------------
  // Savings Rate Insights
  // ---------------------------------------------------------------------------
  {
    id: 'negative-savings',
    category: 'savings',
    priority: 95,
    condition: 'savingsRate < 0',
    template: {
      severity: 'critical',
      title: 'Spending exceeds income',
      explanation:
        'Your expenses exceed your income. You\'re drawing from savings or accumulating debt each month. This is unsustainable.',
      deepLinkId: 'metrics/savings-rate',
      actions: [
        { label: 'Review all flows', href: '/flows', variant: 'primary' },
        { label: 'Find expense cuts', href: '/flows?type=expense&sort=amount&order=desc', variant: 'secondary' },
      ],
    },
  },
  {
    id: 'minimal-savings',
    category: 'savings',
    priority: 80,
    condition: 'savingsRate >= 0 && savingsRate < 5',
    template: {
      severity: 'warning',
      title: 'Savings rate is minimal',
      explanation:
        'At {savingsRate}%, you\'re barely saving. Wealth building will take decades at this rate, and you\'re vulnerable to lifestyle creep.',
      deepLinkId: 'metrics/savings-rate',
      actions: [
        { label: 'Find savings opportunities', href: '/flows?type=expense', variant: 'primary' },
      ],
    },
  },
  {
    id: 'solid-savings',
    category: 'savings',
    priority: 15,
    condition: 'savingsRate >= 20 && savingsRate < 30',
    template: {
      severity: 'positive',
      title: 'Strong savings discipline',
      explanation:
        'Your {savingsRate}% savings rate is well above average. You\'re building wealth at an accelerated pace.',
      deepLinkId: 'metrics/savings-rate',
      actions: [
        { label: 'Explore scenarios', href: '/scenarios', variant: 'link' },
      ],
    },
  },
  {
    id: 'exceptional-savings',
    category: 'savings',
    priority: 10,
    condition: 'savingsRate >= 30',
    template: {
      severity: 'positive',
      title: 'Exceptional savings rate',
      explanation:
        'At {savingsRate}%, you\'re on track for early financial independence. This level of discipline puts you in rare company.',
      deepLinkId: 'metrics/savings-rate',
      actions: [],
    },
  },

  // ---------------------------------------------------------------------------
  // Debt Insights
  // ---------------------------------------------------------------------------
  {
    id: 'critical-dscr',
    category: 'debt',
    priority: 100,
    condition: 'dscr < 1',
    template: {
      severity: 'critical',
      title: 'Cannot cover debt payments',
      explanation:
        'Your income doesn\'t cover required debt payments. You\'re likely drawing from savings or missing payments. Immediate action needed.',
      deepLinkId: 'metrics/dscr',
      actions: [
        { label: 'Review debt accounts', href: '/accounts?type=liability', variant: 'primary' },
      ],
    },
  },
  {
    id: 'tight-dscr',
    category: 'debt',
    priority: 85,
    condition: 'dscr >= 1 && dscr < 1.25',
    template: {
      severity: 'warning',
      title: 'Debt coverage is tight',
      explanation:
        'You\'re just barely covering debt payments with minimal buffer. Any income disruption could cause missed payments.',
      deepLinkId: 'metrics/dscr',
      actions: [
        { label: 'Explore debt payoff', href: '/decisions?category=debt', variant: 'primary' },
      ],
    },
  },
  {
    id: 'high-dti',
    category: 'debt',
    priority: 75,
    condition: 'dtiRatio > 43',
    template: {
      severity: 'warning',
      title: 'Debt-to-income ratio elevated',
      explanation:
        'Your {dtiRatio}% DTI exceeds most lender thresholds (43%). This may limit future borrowing options.',
      deepLinkId: 'metrics/dti-ratio',
      actions: [
        { label: 'Debt payoff scenarios', href: '/decisions?category=debt', variant: 'primary' },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Cash Flow Insights
  // ---------------------------------------------------------------------------
  {
    id: 'negative-cashflow',
    category: 'cashflow',
    priority: 92,
    condition: 'monthlySurplus < 0',
    template: {
      severity: 'critical',
      title: 'Negative monthly cash flow',
      explanation:
        'You\'re spending ${Math.abs(monthlySurplus)} more than you earn each month. This depletes savings and may lead to debt.',
      deepLinkId: 'metrics/monthly-surplus',
      actions: [
        { label: 'Review expenses', href: '/flows?type=expense&sort=amount&order=desc', variant: 'primary' },
        { label: 'Find income opportunities', href: '/decisions?category=income', variant: 'secondary' },
      ],
    },
  },
  {
    id: 'high-fixed-expenses',
    category: 'cashflow',
    priority: 70,
    condition: 'fixedExpenseRatio > 70',
    template: {
      severity: 'warning',
      title: 'High fixed expense ratio',
      explanation:
        'Fixed expenses consume {fixedExpenseRatio}% of your income, leaving little flexibility. Consider reducing fixed commitments.',
      actions: [
        { label: 'Review fixed expenses', href: '/flows?category=fixed', variant: 'primary' },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Net Worth Insights
  // ---------------------------------------------------------------------------
  {
    id: 'negative-net-worth',
    category: 'net_worth',
    priority: 60,
    condition: 'netWorthMarket < 0',
    template: {
      severity: 'info',
      title: 'Negative net worth',
      explanation:
        'Your liabilities exceed assets. This is common early in careers, especially with student loans. Focus on the trajectory—are you moving toward positive?',
      deepLinkId: 'metrics/net-worth',
      actions: [
        { label: 'Create debt payoff goal', href: '/goals/new?type=debt_free_date', variant: 'primary' },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Data Quality Insights
  // ---------------------------------------------------------------------------
  {
    id: 'low-confidence',
    category: 'data_quality',
    priority: 50,
    condition: 'confidenceScore < 50',
    template: {
      severity: 'warning',
      title: 'Model confidence is low',
      explanation:
        'Your projections have high uncertainty due to missing or stale data. Improving data quality will make your planning more reliable.',
      deepLinkId: 'concepts/confidence-score',
      actions: [
        { label: 'Improve data quality', href: '/settings/data-quality', variant: 'primary' },
      ],
    },
  },
  {
    id: 'stale-balances',
    category: 'data_quality',
    priority: 55,
    condition: 'hasStaleBalances',
    template: {
      severity: 'info',
      title: 'Some account balances are stale',
      explanation:
        'One or more accounts haven\'t been updated recently. Fresher data means more accurate projections.',
      actions: [
        { label: 'Update balances', href: '/accounts', variant: 'primary' },
      ],
    },
  },
]

// -----------------------------------------------------------------------------
// Insight Generation
// -----------------------------------------------------------------------------

interface InsightContext {
  metrics: Partial<MetricSnapshot>
  dataQuality?: DataQualityResponse
  // Add more context as needed
}

/**
 * Evaluate a condition string against the context.
 * In production, you'd want a proper expression evaluator.
 * This is a simplified version for demonstration.
 */
function evaluateCondition(condition: string, context: InsightContext): boolean {
  const { metrics, dataQuality } = context

  // Simple condition mapping (in production, use a proper expression parser)
  const values: Record<string, number | boolean> = {
    liquidityMonths: parseFloat(metrics.liquidityMonths || '0'),
    savingsRate: parseFloat(metrics.savingsRate || '0'),
    dscr: parseFloat(metrics.dscr || '0'),
    dtiRatio: parseFloat(metrics.dtiRatio || '0'),
    monthlySurplus: parseFloat(metrics.monthlySurplus || '0'),
    netWorthMarket: parseFloat(metrics.netWorthMarket || '0'),
    fixedExpenseRatio: parseFloat(metrics.fixedExpenseRatio || '0'),
    confidenceScore: dataQuality?.confidenceScore || 0,
    hasStaleBalances: (dataQuality?.issues?.length || 0) > 0,
  }

  // Very basic expression evaluator (production would use something like expr-eval)
  try {
    // Replace variable names with values
    let expr = condition
    for (const [key, value] of Object.entries(values)) {
      expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value))
    }
    // eslint-disable-next-line no-eval
    return eval(expr) === true
  } catch {
    return false
  }
}

/**
 * Interpolate template strings with actual values
 */
function interpolateTemplate(template: string, context: InsightContext): string {
  const { metrics, dataQuality } = context

  let result = template

  // Replace metric placeholders
  if (metrics.liquidityMonths) {
    result = result.replace(/{liquidityMonths}/g, parseFloat(metrics.liquidityMonths).toFixed(1))
  }
  if (metrics.savingsRate) {
    result = result.replace(/{savingsRate}/g, parseFloat(metrics.savingsRate).toFixed(0))
  }
  if (metrics.dtiRatio) {
    result = result.replace(/{dtiRatio}/g, parseFloat(metrics.dtiRatio).toFixed(0))
  }
  if (metrics.monthlySurplus) {
    result = result.replace(/{monthlySurplus}/g, parseFloat(metrics.monthlySurplus).toFixed(0))
  }
  if (metrics.fixedExpenseRatio) {
    result = result.replace(/{fixedExpenseRatio}/g, parseFloat(metrics.fixedExpenseRatio).toFixed(0))
  }

  return result
}

/**
 * Generate insights based on current metrics and data quality
 */
export function generateInsights(context: InsightContext): ContextualInsight[] {
  const insights: ContextualInsight[] = []
  const seenCategories = new Set<InsightCategory>()

  // Sort rules by priority (highest first)
  const sortedRules = [...INSIGHT_RULES].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    // Skip if we already have a higher-priority insight in this category
    // (uncomment to limit to one insight per category)
    // if (seenCategories.has(rule.category)) continue

    if (evaluateCondition(rule.condition, context)) {
      const insight: ContextualInsight = {
        id: `insight-${rule.id}-${Date.now()}`,
        severity: rule.template.severity,
        category: rule.category,
        title: interpolateTemplate(rule.template.title, context),
        explanation: interpolateTemplate(rule.template.explanation, context),
        deepLinkId: rule.template.deepLinkId,
        actions: rule.template.actions,
        supportingMetrics: buildSupportingMetrics(rule.category, context),
        ruleId: rule.id,
      }

      insights.push(insight)
      seenCategories.add(rule.category)
    }
  }

  return insights
}

/**
 * Build supporting metrics for an insight based on its category
 */
function buildSupportingMetrics(
  category: InsightCategory,
  context: InsightContext
): ContextualInsight['supportingMetrics'] {
  const { metrics } = context
  const supporting: ContextualInsight['supportingMetrics'] = []

  switch (category) {
    case 'runway':
      if (metrics.liquidityMonths) {
        supporting.push({ label: 'Runway', value: `${parseFloat(metrics.liquidityMonths).toFixed(1)} months` })
      }
      if (metrics.totalLiquidAssets) {
        supporting.push({ label: 'Liquid Assets', value: `$${parseFloat(metrics.totalLiquidAssets).toLocaleString()}` })
      }
      break

    case 'savings':
      if (metrics.savingsRate) {
        supporting.push({ label: 'Savings Rate', value: `${parseFloat(metrics.savingsRate).toFixed(1)}%` })
      }
      if (metrics.monthlySurplus) {
        supporting.push({ label: 'Monthly Surplus', value: `$${parseFloat(metrics.monthlySurplus).toLocaleString()}` })
      }
      break

    case 'debt':
      if (metrics.dscr) {
        supporting.push({ label: 'DSCR', value: parseFloat(metrics.dscr).toFixed(2) })
      }
      if (metrics.dtiRatio) {
        supporting.push({ label: 'DTI', value: `${parseFloat(metrics.dtiRatio).toFixed(1)}%` })
      }
      break

    case 'cashflow':
      if (metrics.monthlySurplus) {
        supporting.push({ label: 'Monthly Surplus', value: `$${parseFloat(metrics.monthlySurplus).toLocaleString()}` })
      }
      if (metrics.totalMonthlyIncome) {
        supporting.push({ label: 'Monthly Income', value: `$${parseFloat(metrics.totalMonthlyIncome).toLocaleString()}` })
      }
      if (metrics.totalMonthlyExpenses) {
        supporting.push({ label: 'Monthly Expenses', value: `$${parseFloat(metrics.totalMonthlyExpenses).toLocaleString()}` })
      }
      break

    case 'net_worth':
      if (metrics.netWorthMarket) {
        supporting.push({ label: 'Net Worth', value: `$${parseFloat(metrics.netWorthMarket).toLocaleString()}` })
      }
      break
  }

  return supporting
}

/**
 * Get insight rules by category
 */
export function getInsightRulesByCategory(category: InsightCategory): InsightRule[] {
  return INSIGHT_RULES.filter((r) => r.category === category)
}
