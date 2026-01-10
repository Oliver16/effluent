// =============================================================================
// TOUR DEFINITIONS — Guided walkthroughs for each module
// =============================================================================

import type { Tour, LearningPath } from './types'

// -----------------------------------------------------------------------------
// Dashboard Tour
// -----------------------------------------------------------------------------

export const DASHBOARD_TOUR: Tour = {
  id: 'dashboard-intro',
  name: 'Dashboard Overview',
  description: 'Learn to read your financial health at a glance',
  module: 'dashboard',
  estimatedMinutes: 3,
  prerequisites: [],
  triggers: [
    { type: 'first-visit', module: 'dashboard' },
    { type: 'manual' },
  ],
  steps: [
    {
      id: 'dashboard-welcome',
      target: '[data-tour="dashboard-header"]',
      contentId: 'tour/dashboard/welcome',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
    {
      id: 'runway-card',
      target: '[data-tour="runway-card"]',
      contentId: 'metrics/liquidity-months',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'net-worth-card',
      target: '[data-tour="net-worth-card"]',
      contentId: 'metrics/net-worth',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'savings-rate-card',
      target: '[data-tour="savings-rate-card"]',
      contentId: 'metrics/savings-rate',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'net-worth-chart',
      target: '[data-tour="net-worth-chart"]',
      contentId: 'tour/dashboard/net-worth-chart',
      placement: 'top',
      fallbackBehavior: 'skip',
      highlightPadding: 12,
      allowInteraction: true,
    },
    {
      id: 'confidence-card',
      target: '[data-tour="confidence-card"]',
      contentId: 'tour/dashboard/confidence',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'insights-panel',
      target: '[data-tour="insights-panel"]',
      contentId: 'tour/dashboard/insights',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'dashboard-complete',
      target: '[data-tour="dashboard-header"]',
      contentId: 'tour/dashboard/complete',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
  ],
}

// -----------------------------------------------------------------------------
// Flows Tour
// -----------------------------------------------------------------------------

export const FLOWS_TOUR: Tour = {
  id: 'flows-intro',
  name: 'Understanding Flows',
  description: 'Learn how income and expenses shape your financial picture',
  module: 'flows',
  estimatedMinutes: 4,
  prerequisites: [],
  triggers: [
    { type: 'first-visit', module: 'flows' },
    { type: 'manual' },
  ],
  steps: [
    {
      id: 'flows-welcome',
      target: '[data-tour="flows-header"]',
      contentId: 'tour/flows/welcome',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
    {
      id: 'flows-concept',
      target: '[data-tour="flows-list"]',
      contentId: 'tour/flows/concept',
      placement: 'right',
      fallbackBehavior: 'show-center',
      highlightPadding: 12,
      allowInteraction: false,
    },
    {
      id: 'income-flows',
      target: '[data-tour="income-section"]',
      contentId: 'tour/flows/income',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'expense-flows',
      target: '[data-tour="expense-section"]',
      contentId: 'tour/flows/expenses',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'add-flow-button',
      target: '[data-tour="add-flow-button"]',
      contentId: 'tour/flows/add-flow',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
      waitForEvent: {
        name: 'flow.form_opened',
        timeout: 30000,
      },
    },
    {
      id: 'flow-form',
      target: '[data-tour="flow-form"]',
      contentId: 'tour/flows/form',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 12,
      allowInteraction: true,
    },
    {
      id: 'flows-complete',
      target: '[data-tour="flows-header"]',
      contentId: 'tour/flows/complete',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
  ],
}

// -----------------------------------------------------------------------------
// Scenarios Tour
// -----------------------------------------------------------------------------

export const SCENARIOS_TOUR: Tour = {
  id: 'scenarios-intro',
  name: 'Exploring Scenarios',
  description: 'Learn to model "what if" financial futures',
  module: 'scenarios',
  estimatedMinutes: 5,
  prerequisites: ['dashboard-intro'],
  triggers: [
    { type: 'first-visit', module: 'scenarios' },
    { type: 'manual' },
  ],
  steps: [
    {
      id: 'scenarios-welcome',
      target: '[data-tour="scenarios-header"]',
      contentId: 'tour/scenarios/welcome',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
    {
      id: 'baseline-concept',
      target: '[data-tour="baseline-card"]',
      contentId: 'tour/scenarios/baseline',
      placement: 'right',
      fallbackBehavior: 'show-center',
      highlightPadding: 12,
      allowInteraction: false,
    },
    {
      id: 'scenario-list',
      target: '[data-tour="scenario-list"]',
      contentId: 'tour/scenarios/list',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'create-scenario',
      target: '[data-tour="create-scenario-button"]',
      contentId: 'tour/scenarios/create',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
      waitForEvent: {
        name: 'scenario.create_started',
        timeout: 30000,
      },
    },
    {
      id: 'compare-scenarios',
      target: '[data-tour="compare-button"]',
      contentId: 'tour/scenarios/compare',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'scenarios-complete',
      target: '[data-tour="scenarios-header"]',
      contentId: 'tour/scenarios/complete',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
  ],
}

// -----------------------------------------------------------------------------
// Decisions Tour
// -----------------------------------------------------------------------------

export const DECISIONS_TOUR: Tour = {
  id: 'decisions-intro',
  name: 'Making Decisions',
  description: 'Use the decision wizard to model major life choices',
  module: 'decisions',
  estimatedMinutes: 4,
  prerequisites: ['scenarios-intro'],
  triggers: [
    { type: 'first-visit', module: 'decisions' },
    { type: 'manual' },
  ],
  steps: [
    {
      id: 'decisions-welcome',
      target: '[data-tour="decisions-header"]',
      contentId: 'tour/decisions/welcome',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
    {
      id: 'decision-templates',
      target: '[data-tour="decision-templates"]',
      contentId: 'tour/decisions/templates',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 12,
      allowInteraction: true,
    },
    {
      id: 'decision-wizard',
      target: '[data-tour="decision-wizard"]',
      contentId: 'tour/decisions/wizard',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 12,
      allowInteraction: true,
    },
    {
      id: 'decision-results',
      target: '[data-tour="decision-results"]',
      contentId: 'tour/decisions/results',
      placement: 'top',
      fallbackBehavior: 'skip',
      highlightPadding: 12,
      allowInteraction: true,
    },
    {
      id: 'decisions-complete',
      target: '[data-tour="decisions-header"]',
      contentId: 'tour/decisions/complete',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
  ],
}

// -----------------------------------------------------------------------------
// Goals Tour
// -----------------------------------------------------------------------------

export const GOALS_TOUR: Tour = {
  id: 'goals-intro',
  name: 'Setting Goals',
  description: 'Define and track your financial targets',
  module: 'goals',
  estimatedMinutes: 3,
  prerequisites: ['dashboard-intro'],
  triggers: [
    { type: 'first-visit', module: 'goals' },
    { type: 'manual' },
  ],
  steps: [
    {
      id: 'goals-welcome',
      target: '[data-tour="goals-header"]',
      contentId: 'tour/goals/welcome',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
    {
      id: 'goal-types',
      target: '[data-tour="goal-types"]',
      contentId: 'tour/goals/types',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 12,
      allowInteraction: true,
    },
    {
      id: 'goal-status',
      target: '[data-tour="goal-status"]',
      contentId: 'tour/goals/status',
      placement: 'right',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'goal-solver',
      target: '[data-tour="goal-solver"]',
      contentId: 'tour/goals/solver',
      placement: 'left',
      fallbackBehavior: 'skip',
      highlightPadding: 8,
      allowInteraction: true,
    },
    {
      id: 'goals-complete',
      target: '[data-tour="goals-header"]',
      contentId: 'tour/goals/complete',
      placement: 'bottom',
      fallbackBehavior: 'show-center',
      highlightPadding: 8,
      allowInteraction: false,
    },
  ],
}

// -----------------------------------------------------------------------------
// All Tours Export
// -----------------------------------------------------------------------------

export const ALL_TOURS: Tour[] = [
  DASHBOARD_TOUR,
  FLOWS_TOUR,
  SCENARIOS_TOUR,
  DECISIONS_TOUR,
  GOALS_TOUR,
]

export function getTourById(id: string): Tour | undefined {
  return ALL_TOURS.find((t) => t.id === id)
}

export function getToursForModule(module: string): Tour[] {
  return ALL_TOURS.filter((t) => t.module === module)
}

// -----------------------------------------------------------------------------
// Learning Paths
// -----------------------------------------------------------------------------

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of Effluent in 10 minutes',
    outcome:
      "You'll understand your dashboard, how to read key metrics, and how flows shape your financial picture.",
    estimatedMinutes: 10,
    items: [
      { type: 'tour', tourId: 'dashboard-intro' },
      { type: 'article', contentId: 'metrics/liquidity-months' },
      { type: 'article', contentId: 'metrics/savings-rate' },
      { type: 'checkpoint', title: 'Dashboard Mastery', description: 'You can now read your financial health at a glance' },
      { type: 'tour', tourId: 'flows-intro' },
      { type: 'article', contentId: 'concepts/flows' },
    ],
    badge: 'effluent-explorer',
  },
  {
    id: 'scenario-planning',
    name: 'Scenario Planning',
    description: 'Master "what if" analysis for major decisions',
    outcome:
      "You'll be able to model different financial futures and compare outcomes.",
    estimatedMinutes: 15,
    items: [
      { type: 'article', contentId: 'concepts/baseline' },
      { type: 'tour', tourId: 'scenarios-intro' },
      { type: 'article', contentId: 'concepts/scenario-changes' },
      { type: 'checkpoint', title: 'Scenario Basics', description: 'You understand baseline vs scenarios' },
      { type: 'tour', tourId: 'decisions-intro' },
      { type: 'article', contentId: 'concepts/decision-modeling' },
    ],
    badge: 'scenario-strategist',
  },
  {
    id: 'goal-achievement',
    name: 'Achieving Your Goals',
    description: 'Set targets and let Effluent help you reach them',
    outcome:
      "You'll have clear financial goals and understand how to track progress toward them.",
    estimatedMinutes: 8,
    items: [
      { type: 'tour', tourId: 'goals-intro' },
      { type: 'article', contentId: 'concepts/goal-types' },
      { type: 'article', contentId: 'concepts/goal-solver' },
      { type: 'checkpoint', title: 'Goal Setter', description: 'You have a clear path to your financial targets' },
    ],
    badge: 'goal-getter',
  },
  {
    id: 'confidence-building',
    name: 'Improving Model Confidence',
    description: 'Make your projections more accurate',
    outcome:
      "You'll understand data quality and how to improve your model's accuracy.",
    estimatedMinutes: 6,
    items: [
      { type: 'article', contentId: 'concepts/data-quality' },
      { type: 'article', contentId: 'concepts/confidence-score' },
      { type: 'article', contentId: 'guides/improving-confidence' },
    ],
    badge: 'data-quality-champion',
  },
]

export function getLearningPathById(id: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.id === id)
}
