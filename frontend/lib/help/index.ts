// =============================================================================
// HELP SYSTEM — Public API
// =============================================================================

// Types
export type {
  HelpContent,
  HelpModule,
  MetricDefinition,
  MetricBenchmark,
  MetricInterpretation,
  Tour,
  TourStep,
  TourEvent,
  TourStepAction,
  TourTrigger,
  LearningPath,
  LearningPathItem,
  UserHelpState,
  ContextualInsight,
  InsightCategory,
  InsightAction,
  SupportingMetric,
  InsightRule,
  HelpEventType,
  HelpEvent,
  HelpSearchResult,
  HelpContentResponse,
} from './types'

// Metrics
export {
  METRIC_DEFINITIONS,
  getMetricDefinition,
  getMetricDefinitionById,
  getMetricsByModule,
  searchMetrics,
} from './metrics'

// Tours
export {
  DASHBOARD_TOUR,
  FLOWS_TOUR,
  SCENARIOS_TOUR,
  DECISIONS_TOUR,
  GOALS_TOUR,
  ALL_TOURS,
  getTourById,
  getToursForModule,
  LEARNING_PATHS,
  getLearningPathById,
} from './tours'

// Tour Content
export { TOUR_CONTENT, getTourContent } from './tour-content'

// Insights
export {
  INSIGHT_RULES,
  generateInsights,
  getInsightRulesByCategory,
} from './insights'
