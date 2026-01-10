// =============================================================================
// HELP SYSTEM COMPONENTS
// =============================================================================

// Provider and hooks
export { TourProvider, useTour, emitTourEvent } from './TourProvider'

// Tour components
export { TourOverlay } from './TourOverlay'

// Contextual help
export { MetricExplainer, Term } from './MetricExplainer'

// Insights
export { InsightCard, InsightsPanel } from './InsightCard'

// Knowledge base
export { HelpDrawer } from './HelpDrawer'

// Entry points
export {
  FloatingHelpButton,
  HeaderHelpButton,
  InlineHelpTrigger,
} from './HelpButton'
