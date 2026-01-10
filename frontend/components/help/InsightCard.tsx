'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  AlertTriangle,
  Lightbulb,
  Trophy,
  Info,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ContextualInsight } from '@/lib/help/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface InsightCardProps {
  insight: ContextualInsight
  /**
   * Callback when an action is clicked
   */
  onActionClick?: (action: ContextualInsight['actions'][number]) => void
  /**
   * Callback when insight is dismissed
   */
  onDismiss?: (insightId: string) => void
  /**
   * Callback when "learn more" deep link is clicked
   */
  onLearnMore?: (contentId: string) => void
  /**
   * Custom class
   */
  className?: string
  /**
   * Whether the card is collapsible (default: true)
   */
  collapsible?: boolean
  /**
   * Whether to show supporting metrics (default: true)
   */
  showMetrics?: boolean
}

// -----------------------------------------------------------------------------
// Icon and Color Mapping
// -----------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    cardClass: 'border-red-500/30 bg-red-500/5',
    iconClass: 'text-red-500',
    textClass: 'text-red-700 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    cardClass: 'border-amber-500/30 bg-amber-500/5',
    iconClass: 'text-amber-500',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: Lightbulb,
    cardClass: 'border-blue-500/30 bg-blue-500/5',
    iconClass: 'text-blue-500',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  positive: {
    icon: Trophy,
    cardClass: 'border-emerald-500/30 bg-emerald-500/5',
    iconClass: 'text-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function InsightCard({
  insight,
  onActionClick,
  onDismiss,
  onLearnMore,
  className,
  collapsible = true,
  showMetrics = true,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const config = SEVERITY_CONFIG[insight.severity]
  const Icon = config.icon

  return (
    <Card className={cn('border', config.cardClass, className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClass)} />

          <div className="flex-1 min-w-0">
            {/* Title and dismiss */}
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn('font-medium text-sm', config.textClass)}>
                {insight.title}
              </h4>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 -mr-1 -mt-0.5 opacity-50 hover:opacity-100"
                  onClick={() => onDismiss(insight.id)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              )}
            </div>

            {/* Explanation (short) */}
            <p className="text-sm text-muted-foreground mt-1">
              {insight.explanation}
            </p>

            {/* Expanded content */}
            {collapsible && isExpanded && (
              <div className="mt-3 space-y-3">
                {/* Supporting metrics */}
                {showMetrics && insight.supportingMetrics.length > 0 && (
                  <div className="bg-background/50 rounded-md p-2.5">
                    <p className="text-xs font-medium mb-1.5">
                      Supporting data:
                    </p>
                    <div className="space-y-1">
                      {insight.supportingMetrics.map((metric, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {metric.label}
                          </span>
                          <span className="font-medium tabular-nums">
                            {metric.value}
                            {metric.trend && (
                              <span
                                className={cn(
                                  'ml-1',
                                  metric.trend === 'up' && 'text-emerald-500',
                                  metric.trend === 'down' && 'text-red-500'
                                )}
                              >
                                {metric.trend === 'up' ? '↑' : '↓'}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deep link */}
                {insight.deepLinkId && onLearnMore && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs"
                    onClick={() => onLearnMore(insight.deepLinkId!)}
                  >
                    Learn why this matters →
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {/* Expand/collapse toggle */}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3 mr-1" />
                      Details
                    </>
                  )}
                </Button>
              )}

              {/* Action buttons */}
              {insight.actions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant === 'primary' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onActionClick?.(action)}
                  asChild={!onActionClick}
                >
                  {onActionClick ? (
                    action.label
                  ) : (
                    <a href={action.href}>{action.label}</a>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// Insights Panel (list of insights)
// -----------------------------------------------------------------------------

interface InsightsPanelProps {
  insights: ContextualInsight[]
  onActionClick?: (action: ContextualInsight['actions'][number]) => void
  onDismiss?: (insightId: string) => void
  onLearnMore?: (contentId: string) => void
  className?: string
  /**
   * Maximum number of insights to show (shows "Show more" if exceeded)
   */
  maxVisible?: number
}

export function InsightsPanel({
  insights,
  onActionClick,
  onDismiss,
  onLearnMore,
  className,
  maxVisible = 5,
}: InsightsPanelProps) {
  const [showAll, setShowAll] = useState(false)

  if (insights.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-6 text-sm text-muted-foreground',
          className
        )}
      >
        <Info className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>No insights at this time.</p>
        <p className="text-xs mt-1">
          Insights appear when we notice something worth your attention.
        </p>
      </div>
    )
  }

  // Sort by severity (critical first)
  const sortedInsights = [...insights].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, positive: 3 }
    return order[a.severity] - order[b.severity]
  })

  const visibleInsights = showAll
    ? sortedInsights
    : sortedInsights.slice(0, maxVisible)
  const hasMore = sortedInsights.length > maxVisible

  return (
    <div className={cn('space-y-3', className)}>
      {visibleInsights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onActionClick={onActionClick}
          onDismiss={onDismiss}
          onLearnMore={onLearnMore}
        />
      ))}

      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(true)}
        >
          Show {sortedInsights.length - maxVisible} more insights
        </Button>
      )}
    </div>
  )
}
