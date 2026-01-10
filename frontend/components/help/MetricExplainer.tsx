'use client'

import * as React from 'react'
import { HelpCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getMetricDefinition, METRIC_DEFINITIONS } from '@/lib/help/metrics'
import type { MetricDefinition, MetricInterpretation } from '@/lib/help/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface MetricExplainerProps {
  /**
   * The metric key to explain (must match a key in METRIC_DEFINITIONS)
   */
  metricKey: keyof typeof METRIC_DEFINITIONS | string
  /**
   * Optional current value to show contextual interpretation
   */
  currentValue?: number | string
  /**
   * Custom class for the trigger button
   */
  className?: string
  /**
   * Size of the help icon
   */
  size?: 'sm' | 'md'
  /**
   * Callback when "Learn more" is clicked
   */
  onLearnMore?: (metricKey: string) => void
}

// -----------------------------------------------------------------------------
// Get interpretation based on current value
// -----------------------------------------------------------------------------

function getInterpretation(
  definition: MetricDefinition,
  value: number
): MetricInterpretation | undefined {
  if (!definition.interpretations?.length) return undefined

  // Find matching interpretation (interpretations are ordered by condition)
  for (const interp of definition.interpretations) {
    // Simple condition evaluation (in production, use a proper parser)
    try {
      const condition = interp.condition.replace(/value/g, String(value))
      // eslint-disable-next-line no-eval
      if (eval(condition)) {
        return interp
      }
    } catch {
      continue
    }
  }

  return undefined
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function MetricExplainer({
  metricKey,
  currentValue,
  className,
  size = 'sm',
  onLearnMore,
}: MetricExplainerProps) {
  const definition = getMetricDefinition(metricKey)

  if (!definition) {
    // Don't render if metric not found
    return null
  }

  const numericValue =
    currentValue !== undefined
      ? typeof currentValue === 'string'
        ? parseFloat(currentValue)
        : currentValue
      : undefined

  const interpretation =
    numericValue !== undefined
      ? getInterpretation(definition, numericValue)
      : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'text-muted-foreground hover:text-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm',
            className
          )}
          aria-label={`Learn about ${definition.title}`}
        >
          <HelpCircle
            className={cn(
              size === 'sm' && 'h-3.5 w-3.5',
              size === 'md' && 'h-4 w-4'
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="start" side="top">
        <div className="space-y-3">
          {/* Title */}
          <div>
            <h4 className="font-semibold text-sm">{definition.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {definition.short}
            </p>
          </div>

          {/* Formula */}
          {definition.formula && (
            <div className="bg-muted rounded-md p-2">
              <code className="text-xs font-mono">{definition.formula}</code>
            </div>
          )}

          {/* Current interpretation */}
          {interpretation && (
            <div
              className={cn(
                'rounded-md p-2.5 text-xs',
                interpretation.tone === 'good' &&
                  'bg-emerald-500/10 border border-emerald-500/20',
                interpretation.tone === 'warning' &&
                  'bg-amber-500/10 border border-amber-500/20',
                interpretation.tone === 'critical' &&
                  'bg-red-500/10 border border-red-500/20',
                interpretation.tone === 'neutral' &&
                  'bg-muted border border-border'
              )}
            >
              <p className="font-medium mb-1">Your current value:</p>
              <p className="text-muted-foreground">{interpretation.meaning}</p>
            </div>
          )}

          {/* Benchmarks */}
          {definition.benchmarks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Benchmarks</p>
              <div className="space-y-1">
                {definition.benchmarks.map((benchmark, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        benchmark.tone === 'good' && 'bg-emerald-500',
                        benchmark.tone === 'warning' && 'bg-amber-500',
                        benchmark.tone === 'critical' && 'bg-red-500',
                        benchmark.tone === 'neutral' && 'bg-gray-400'
                      )}
                    />
                    <span className="font-medium min-w-16">
                      {benchmark.label}:
                    </span>
                    <span>{benchmark.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learn more button */}
          {onLearnMore && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => onLearnMore(metricKey)}
            >
              Learn more
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// -----------------------------------------------------------------------------
// Inline Term Definition (for use in text)
// -----------------------------------------------------------------------------

interface TermProps {
  /**
   * The term to define (metric key)
   */
  term: string
  /**
   * The display text (defaults to metric title)
   */
  children?: React.ReactNode
  /**
   * Custom class
   */
  className?: string
}

export function Term({ term, children, className }: TermProps) {
  const definition = getMetricDefinition(term)

  if (!definition) {
    return <span>{children || term}</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'underline decoration-dotted decoration-muted-foreground underline-offset-2',
            'hover:decoration-foreground cursor-help',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm',
            className
          )}
        >
          {children || definition.title}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="center">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{definition.title}</h4>
          <p className="text-xs text-muted-foreground">{definition.short}</p>
          {definition.formula && (
            <div className="bg-muted rounded p-1.5">
              <code className="text-xs">{definition.formula}</code>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
