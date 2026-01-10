'use client'

import * as React from 'react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTour } from './TourProvider'
import { getTourContent } from '@/lib/help/tour-content'
import { getMetricDefinition } from '@/lib/help/metrics'
import type { HelpContent, MetricDefinition } from '@/lib/help/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center'

// -----------------------------------------------------------------------------
// Positioning Logic
// -----------------------------------------------------------------------------

function getTooltipPosition(
  targetRect: TargetRect | null,
  placement: Placement,
  tooltipWidth: number,
  tooltipHeight: number,
  padding: number = 16
): { top: number; left: number } {
  if (!targetRect || placement === 'center') {
    // Center in viewport
    return {
      top: (window.innerHeight - tooltipHeight) / 2,
      left: (window.innerWidth - tooltipWidth) / 2,
    }
  }

  const gap = 12 // Gap between target and tooltip

  switch (placement) {
    case 'top':
      return {
        top: targetRect.top - tooltipHeight - gap,
        left: Math.max(
          padding,
          Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )
        ),
      }
    case 'bottom':
      return {
        top: targetRect.bottom + gap,
        left: Math.max(
          padding,
          Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )
        ),
      }
    case 'left':
      return {
        top: Math.max(
          padding,
          Math.min(
            targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - padding
          )
        ),
        left: targetRect.left - tooltipWidth - gap,
      }
    case 'right':
      return {
        top: Math.max(
          padding,
          Math.min(
            targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - padding
          )
        ),
        left: targetRect.right + gap,
      }
    default:
      return { top: 100, left: 100 }
  }
}

// -----------------------------------------------------------------------------
// Spotlight Component (SVG mask for highlighting)
// -----------------------------------------------------------------------------

interface SpotlightProps {
  targetRect: TargetRect | null
  padding: number
}

function Spotlight({ targetRect, padding }: SpotlightProps) {
  if (!targetRect) {
    // Full overlay when no target
    return (
      <div className="fixed inset-0 bg-black/70 transition-opacity duration-300" />
    )
  }

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 9998 }}
    >
      <defs>
        <mask id="tour-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={targetRect.left - padding}
            y={targetRect.top - padding}
            width={targetRect.width + padding * 2}
            height={targetRect.height + padding * 2}
            rx="8"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0, 0, 0, 0.7)"
        mask="url(#tour-spotlight-mask)"
        className="transition-all duration-300"
      />
      {/* Highlight border around target */}
      <rect
        x={targetRect.left - padding}
        y={targetRect.top - padding}
        width={targetRect.width + padding * 2}
        height={targetRect.height + padding * 2}
        rx="8"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        className="animate-pulse"
      />
    </svg>
  )
}

// -----------------------------------------------------------------------------
// Tooltip Content Component
// -----------------------------------------------------------------------------

interface TooltipContentProps {
  content: HelpContent | MetricDefinition
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onClose: () => void
  canGoPrev: boolean
  isLastStep: boolean
}

function TourTooltipContent({
  content,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onClose,
  canGoPrev,
  isLastStep,
}: TooltipContentProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base">{content.title}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-2 -mt-1"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close tour</span>
        </Button>
      </div>

      {/* Content */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {content.short}
      </p>

      {/* Benchmarks for metrics */}
      {'benchmarks' in content && content.benchmarks.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-muted-foreground">
            Benchmarks:
          </p>
          <div className="space-y-1">
            {content.benchmarks.slice(0, 3).map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    b.tone === 'good' && 'bg-emerald-500',
                    b.tone === 'warning' && 'bg-amber-500',
                    b.tone === 'critical' && 'bg-red-500',
                    b.tone === 'neutral' && 'bg-gray-400'
                  )}
                />
                <span className="font-medium">{b.label}:</span>
                <span>{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          {stepIndex + 1} of {totalSteps}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-xs h-7"
          >
            Skip tour
          </Button>

          {canGoPrev && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <Button size="sm" onClick={onNext} className="h-7">
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Main Tour Overlay Component
// -----------------------------------------------------------------------------

export function TourOverlay() {
  const {
    activeTour,
    currentStep,
    currentStepIndex,
    nextStep,
    prevStep,
    endTour,
    dismissTour,
  } = useTour()

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Track mount state for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Find and track target element
  useEffect(() => {
    if (!currentStep) {
      setTargetRect(null)
      return
    }

    const findTarget = () => {
      const element = document.querySelector(currentStep.target)

      if (!element) {
        // Handle missing target based on fallback behavior
        if (currentStep.fallbackBehavior === 'skip') {
          nextStep()
          return
        }
        if (currentStep.fallbackBehavior === 'abort') {
          endTour(false)
          return
        }
        // 'show-center' - just show centered
        setTargetRect(null)
        return
      }

      const rect = element.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      })

      // Scroll element into view if needed
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth

      if (!isInViewport) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        })
      }
    }

    // Initial find
    findTarget()

    // Re-find on scroll/resize
    const handleUpdate = () => findTarget()
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [currentStep, nextStep, endTour])

  // Calculate tooltip position
  useEffect(() => {
    if (!tooltipRef.current || !currentStep) return

    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const position = getTooltipPosition(
      targetRect,
      currentStep.placement,
      tooltipRect.width,
      tooltipRect.height,
      currentStep.highlightPadding || 8
    )
    setTooltipPosition(position)
  }, [targetRect, currentStep])

  // Handle keyboard navigation
  useEffect(() => {
    if (!activeTour) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          endTour(false)
          break
        case 'ArrowRight':
        case 'Enter':
          nextStep()
          break
        case 'ArrowLeft':
          if (currentStepIndex > 0) {
            prevStep()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTour, currentStepIndex, nextStep, prevStep, endTour])

  // Don't render if no active tour or not mounted
  if (!mounted || !activeTour || !currentStep) return null

  // Get content for current step
  let content: HelpContent | MetricDefinition | undefined

  // First try tour content
  content = getTourContent(currentStep.contentId)

  // Then try metric definition
  if (!content) {
    const metricKey = currentStep.contentId.replace('metrics/', '')
    content = getMetricDefinition(metricKey)
  }

  if (!content) {
    // Fallback content
    content = {
      id: currentStep.contentId,
      title: 'Step',
      short: 'Continue to the next step.',
      body: '',
      tags: [],
      related: [],
      modules: [],
      level: 'intro',
    }
  }

  const highlightPadding = currentStep.highlightPadding || 8
  const isLastStep = currentStepIndex === activeTour.steps.length - 1

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Tour: ${activeTour.name}`}
    >
      {/* Spotlight overlay */}
      <Spotlight targetRect={targetRect} padding={highlightPadding} />

      {/* Click blocker (except for target if allowInteraction) */}
      {!currentStep.allowInteraction && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998 }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed bg-popover border rounded-lg shadow-xl p-4 max-w-sm',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
        style={{
          zIndex: 10000,
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          minWidth: 280,
        }}
      >
        <TourTooltipContent
          content={content}
          stepIndex={currentStepIndex}
          totalSteps={activeTour.steps.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={() => endTour(false)}
          onClose={() => dismissTour()}
          canGoPrev={currentStepIndex > 0}
          isLastStep={isLastStep}
        />
      </div>
    </div>,
    document.body
  )
}
