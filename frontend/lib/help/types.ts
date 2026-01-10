// =============================================================================
// HELP SYSTEM — Unified Content Model
// =============================================================================
// One content model → many surfaces (tour step, tooltip, article, callout)

import type { StatusTone } from '../design-tokens'

// -----------------------------------------------------------------------------
// Core Content Types
// -----------------------------------------------------------------------------

/**
 * A single piece of help content that can render in multiple surfaces.
 * This is the atomic unit of the help system.
 */
export interface HelpContent {
  /** Unique identifier, also used as URL slug */
  id: string
  /** Display title */
  title: string
  /** 1-2 sentence summary for tooltips and tour steps */
  short: string
  /** Full content body (MDX string) */
  body: string
  /** Tags for search and categorization */
  tags: string[]
  /** Related content IDs */
  related: string[]
  /** Which modules this content applies to */
  modules: HelpModule[]
  /** Content level for progressive disclosure */
  level: 'intro' | 'intermediate' | 'advanced'
  /** Optional examples or interpretations */
  examples?: string[]
  /** Common interpretations for metrics */
  interpretations?: MetricInterpretation[]
}

export type HelpModule =
  | 'dashboard'
  | 'flows'
  | 'accounts'
  | 'scenarios'
  | 'decisions'
  | 'goals'
  | 'stress-tests'
  | 'taxes'
  | 'settings'
  | 'global'

// -----------------------------------------------------------------------------
// Metric-Specific Content
// -----------------------------------------------------------------------------

export interface MetricDefinition extends HelpContent {
  /** The metric key this explains (matches MetricSnapshot fields) */
  metricKey: string
  /** Formula or calculation explanation */
  formula?: string
  /** Unit of measurement */
  unit: 'currency' | 'months' | 'percent' | 'ratio' | 'number'
  /** Benchmark thresholds */
  benchmarks: MetricBenchmark[]
  /** What actions influence this metric */
  influencedBy: string[]
  /** What this metric influences */
  influences: string[]
}

export interface MetricBenchmark {
  label: string
  value: string
  tone: StatusTone
  description?: string
}

export interface MetricInterpretation {
  condition: string
  meaning: string
  tone: StatusTone
}

// -----------------------------------------------------------------------------
// Tour System Types
// -----------------------------------------------------------------------------

export interface Tour {
  id: string
  name: string
  description: string
  module: HelpModule
  /** Estimated duration in minutes */
  estimatedMinutes: number
  /** Steps in this tour */
  steps: TourStep[]
  /** Prerequisites (other tour IDs that should be completed first) */
  prerequisites: string[]
  /** When to suggest this tour */
  triggers: TourTrigger[]
}

export interface TourStep {
  id: string
  /** CSS selector for the target element (use data-tour attributes) */
  target: string
  /** Reference to help content for this step */
  contentId: string
  /** Position relative to target */
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Event that must occur before advancing (optional) */
  waitForEvent?: TourEvent
  /** Fallback if target element is missing */
  fallbackBehavior: 'skip' | 'show-center' | 'abort'
  /** Action to perform when step becomes active */
  onActivate?: TourStepAction
  /** Highlight padding around target */
  highlightPadding?: number
  /** Allow interaction with the highlighted element */
  allowInteraction?: boolean
}

export interface TourEvent {
  /** Event name to wait for */
  name: string
  /** Timeout in ms before auto-advancing */
  timeout?: number
  /** Optional validation function key */
  validator?: string
}

export interface TourStepAction {
  type: 'scroll-to' | 'highlight' | 'navigate' | 'open-drawer'
  payload?: Record<string, unknown>
}

export type TourTrigger =
  | { type: 'first-visit'; module: HelpModule }
  | { type: 'empty-state'; module: HelpModule }
  | { type: 'low-confidence'; threshold: number }
  | { type: 'event'; eventName: string }
  | { type: 'feature-release'; featureId: string }
  | { type: 'manual' }

// -----------------------------------------------------------------------------
// Learning Paths
// -----------------------------------------------------------------------------

export interface LearningPath {
  id: string
  name: string
  description: string
  /** Goal statement: "After this path, you'll understand..." */
  outcome: string
  /** Estimated total time in minutes */
  estimatedMinutes: number
  /** Ordered list of items (tours + articles) */
  items: LearningPathItem[]
  /** Badge or achievement for completion */
  badge?: string
}

export type LearningPathItem =
  | { type: 'tour'; tourId: string }
  | { type: 'article'; contentId: string }
  | { type: 'checkpoint'; title: string; description: string }

// -----------------------------------------------------------------------------
// User Help State (frontend representation)
// -----------------------------------------------------------------------------

export interface UserHelpState {
  /** Completed tour IDs */
  completedTours: string[]
  /** Completed learning path IDs */
  completedPaths: string[]
  /** Dismissed content IDs (don't show again) */
  dismissed: string[]
  /** Last active tour (for resumption) */
  activeTour?: {
    tourId: string
    stepIndex: number
    startedAt: string
  }
  /** Read article IDs */
  readArticles: string[]
  /** Last help interaction timestamp */
  lastInteractionAt?: string
}

// -----------------------------------------------------------------------------
// Contextual Insights (rule-based explanations)
// -----------------------------------------------------------------------------

export interface ContextualInsight {
  id: string
  /** Severity level */
  severity: 'critical' | 'warning' | 'info' | 'positive'
  /** Category for grouping */
  category: InsightCategory
  /** Short title */
  title: string
  /** Brief explanation */
  explanation: string
  /** Link to deeper content */
  deepLinkId?: string
  /** Suggested actions */
  actions: InsightAction[]
  /** Supporting metric values */
  supportingMetrics: SupportingMetric[]
  /** Rule ID that generated this insight */
  ruleId: string
}

export type InsightCategory =
  | 'data_quality'
  | 'cashflow'
  | 'runway'
  | 'savings'
  | 'debt'
  | 'net_worth'
  | 'tax'
  | 'scenario'
  | 'goal'

export interface InsightAction {
  label: string
  href: string
  variant: 'primary' | 'secondary' | 'link'
}

export interface SupportingMetric {
  label: string
  value: string
  trend?: 'up' | 'down' | 'stable'
}

// -----------------------------------------------------------------------------
// Insight Rules (for generating contextual insights)
// -----------------------------------------------------------------------------

export interface InsightRule {
  id: string
  category: InsightCategory
  /** Priority for conflict resolution (higher = more important) */
  priority: number
  /** Condition function key (evaluated server or client side) */
  condition: string
  /** Template for generating the insight */
  template: {
    severity: ContextualInsight['severity']
    title: string
    explanation: string
    deepLinkId?: string
    actions: InsightAction[]
  }
}

// -----------------------------------------------------------------------------
// Event Tracking
// -----------------------------------------------------------------------------

export type HelpEventType =
  | 'tour_started'
  | 'tour_step_viewed'
  | 'tour_completed'
  | 'tour_skipped'
  | 'tour_dismissed'
  | 'article_viewed'
  | 'article_completed'
  | 'tooltip_opened'
  | 'insight_viewed'
  | 'insight_action_clicked'
  | 'insight_dismissed'
  | 'help_searched'
  | 'path_started'
  | 'path_completed'

export interface HelpEvent {
  type: HelpEventType
  resourceId: string
  resourceType: 'tour' | 'article' | 'tooltip' | 'insight' | 'path'
  metadata?: Record<string, unknown>
  timestamp: string
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface HelpSearchResult {
  id: string
  type: 'article' | 'tour' | 'metric'
  title: string
  snippet: string
  module: HelpModule
  relevanceScore: number
}

export interface HelpContentResponse {
  content: HelpContent
  relatedContent: HelpContent[]
  relatedTours: Tour[]
}
