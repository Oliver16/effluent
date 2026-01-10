'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import {
  Book,
  Search,
  ChevronRight,
  Play,
  Clock,
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  METRIC_DEFINITIONS,
  searchMetrics,
  getMetricDefinition,
} from '@/lib/help/metrics'
import { ALL_TOURS, LEARNING_PATHS, getTourById } from '@/lib/help/tours'
import { useTour } from './TourProvider'
import type { MetricDefinition, Tour, LearningPath, HelpModule } from '@/lib/help/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface HelpDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Initial view to show
   */
  initialView?: 'home' | 'article' | 'tour' | 'path'
  /**
   * Initial content ID (for article view)
   */
  initialContentId?: string
}

type View =
  | { type: 'home' }
  | { type: 'search'; query: string }
  | { type: 'article'; contentId: string }
  | { type: 'tour'; tourId: string }
  | { type: 'path'; pathId: string }
  | { type: 'category'; category: 'metrics' | 'tours' | 'paths' }

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

interface SearchResultsProps {
  query: string
  onSelectMetric: (key: string) => void
  onSelectTour: (tourId: string) => void
}

function SearchResults({ query, onSelectMetric, onSelectTour }: SearchResultsProps) {
  const metrics = searchMetrics(query)
  const tours = ALL_TOURS.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase())
  )

  if (metrics.length === 0 && tours.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No results found for "{query}"</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {metrics.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Metrics
          </h3>
          <div className="space-y-1">
            {metrics.slice(0, 5).map((metric) => (
              <button
                key={metric.id}
                onClick={() => onSelectMetric(metric.metricKey)}
                className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium">{metric.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {metric.short}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {tours.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Tours
          </h3>
          <div className="space-y-1">
            {tours.map((tour) => (
              <button
                key={tour.id}
                onClick={() => onSelectTour(tour.id)}
                className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Play className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{tour.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tour.estimatedMinutes} min
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface MetricArticleViewProps {
  metricKey: string
  onBack: () => void
  onNavigateToRelated: (key: string) => void
}

function MetricArticleView({
  metricKey,
  onBack,
  onNavigateToRelated,
}: MetricArticleViewProps) {
  const definition = getMetricDefinition(metricKey)

  if (!definition) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Article not found</p>
        <Button variant="link" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Title and summary */}
      <div>
        <h2 className="text-lg font-semibold">{definition.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{definition.short}</p>
      </div>

      {/* Formula */}
      {definition.formula && (
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Formula
          </p>
          <code className="text-sm font-mono">{definition.formula}</code>
        </div>
      )}

      {/* Benchmarks */}
      {definition.benchmarks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Benchmarks</h3>
          <div className="space-y-2">
            {definition.benchmarks.map((b, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-md border',
                  b.tone === 'good' && 'border-emerald-500/30 bg-emerald-500/5',
                  b.tone === 'warning' && 'border-amber-500/30 bg-amber-500/5',
                  b.tone === 'critical' && 'border-red-500/30 bg-red-500/5',
                  b.tone === 'neutral' && 'border-border bg-muted/30'
                )}
              >
                <span
                  className={cn(
                    'w-2.5 h-2.5 rounded-full mt-1 shrink-0',
                    b.tone === 'good' && 'bg-emerald-500',
                    b.tone === 'warning' && 'bg-amber-500',
                    b.tone === 'critical' && 'bg-red-500',
                    b.tone === 'neutral' && 'bg-gray-400'
                  )}
                />
                <div>
                  <p className="text-sm font-medium">
                    {b.label}: {b.value}
                  </p>
                  {b.description && (
                    <p className="text-xs text-muted-foreground">
                      {b.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Influences */}
      {definition.influencedBy.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">What affects this metric</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {definition.influencedBy.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related metrics */}
      {definition.related.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Related</h3>
          <div className="flex flex-wrap gap-2">
            {definition.related.map((relatedId) => {
              const relatedKey = relatedId.replace('metrics/', '')
              const related = getMetricDefinition(relatedKey)
              if (!related) return null
              return (
                <Button
                  key={relatedId}
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToRelated(relatedKey)}
                >
                  {related.title}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface TourPreviewProps {
  tour: Tour
  isCompleted: boolean
  onStart: () => void
  onBack: () => void
}

function TourPreview({ tour, isCompleted, onStart, onBack }: TourPreviewProps) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{tour.name}</h2>
          {isCompleted && (
            <Badge variant="secondary" className="text-emerald-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{tour.description}</p>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {tour.estimatedMinutes} min
        </span>
        <span>{tour.steps.length} steps</span>
      </div>

      <Button onClick={onStart} className="w-full">
        <Play className="h-4 w-4 mr-2" />
        {isCompleted ? 'Retake Tour' : 'Start Tour'}
      </Button>

      <div>
        <h3 className="text-sm font-medium mb-2">What you'll learn</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          {tour.steps.slice(0, 5).map((step) => (
            <li key={step.id} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {step.contentId.split('/').pop()?.replace(/-/g, ' ')}
            </li>
          ))}
          {tour.steps.length > 5 && (
            <li className="text-xs">...and {tour.steps.length - 5} more</li>
          )}
        </ul>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function HelpDrawer({
  open,
  onOpenChange,
  initialView = 'home',
  initialContentId,
}: HelpDrawerProps) {
  const [view, setView] = useState<View>({ type: 'home' })
  const [searchQuery, setSearchQuery] = useState('')
  const { startTour, isTourCompleted, endTour } = useTour()

  // Reset to home when drawer opens
  React.useEffect(() => {
    if (open) {
      if (initialView === 'article' && initialContentId) {
        setView({ type: 'article', contentId: initialContentId })
      } else {
        setView({ type: 'home' })
      }
      setSearchQuery('')
    }
  }, [open, initialView, initialContentId])

  const handleStartTour = (tourId: string) => {
    onOpenChange(false)
    // Small delay to let drawer close
    setTimeout(() => {
      startTour(tourId)
    }, 200)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      setView({ type: 'search', query })
    } else if (query.length === 0) {
      setView({ type: 'home' })
    }
  }

  const renderContent = () => {
    switch (view.type) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Quick actions */}
            <div>
              <h3 className="text-sm font-medium mb-2">Quick Start</h3>
              <div className="space-y-2">
                {LEARNING_PATHS.slice(0, 2).map((path) => (
                  <button
                    key={path.id}
                    onClick={() => setView({ type: 'path', pathId: path.id })}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{path.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {path.estimatedMinutes} min
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {path.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tours */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Tours</h3>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setView({ type: 'category', category: 'tours' })}
                >
                  View all
                </Button>
              </div>
              <div className="space-y-1">
                {ALL_TOURS.slice(0, 3).map((tour) => (
                  <button
                    key={tour.id}
                    onClick={() => setView({ type: 'tour', tourId: tour.id })}
                    className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    {isTourCompleted(tour.id) ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Play className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tour.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tour.module} • {tour.estimatedMinutes} min
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics glossary */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Metrics Glossary</h3>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setView({ type: 'category', category: 'metrics' })}
                >
                  View all
                </Button>
              </div>
              <div className="space-y-1">
                {Object.values(METRIC_DEFINITIONS)
                  .slice(0, 4)
                  .map((metric) => (
                    <button
                      key={metric.id}
                      onClick={() =>
                        setView({ type: 'article', contentId: metric.metricKey })
                      }
                      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <p className="text-sm font-medium">{metric.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {metric.short}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )

      case 'search':
        return (
          <SearchResults
            query={view.query}
            onSelectMetric={(key) => setView({ type: 'article', contentId: key })}
            onSelectTour={(tourId) => setView({ type: 'tour', tourId })}
          />
        )

      case 'article':
        return (
          <MetricArticleView
            metricKey={view.contentId}
            onBack={() => setView({ type: 'home' })}
            onNavigateToRelated={(key) =>
              setView({ type: 'article', contentId: key })
            }
          />
        )

      case 'tour': {
        const tour = getTourById(view.tourId)
        if (!tour) return null
        return (
          <TourPreview
            tour={tour}
            isCompleted={isTourCompleted(tour.id)}
            onStart={() => handleStartTour(tour.id)}
            onBack={() => setView({ type: 'home' })}
          />
        )
      }

      case 'category':
        if (view.category === 'metrics') {
          return (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView({ type: 'home' })}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h2 className="text-lg font-semibold">Metrics Glossary</h2>
              <div className="space-y-1">
                {Object.values(METRIC_DEFINITIONS).map((metric) => (
                  <button
                    key={metric.id}
                    onClick={() =>
                      setView({ type: 'article', contentId: metric.metricKey })
                    }
                    className="w-full text-left p-2.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{metric.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {metric.short}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )
        }

        if (view.category === 'tours') {
          return (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView({ type: 'home' })}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h2 className="text-lg font-semibold">All Tours</h2>
              <div className="space-y-2">
                {ALL_TOURS.map((tour) => (
                  <button
                    key={tour.id}
                    onClick={() => setView({ type: 'tour', tourId: tour.id })}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isTourCompleted(tour.id) ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Play className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium text-sm">{tour.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {tour.estimatedMinutes} min
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tour.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )
        }

        return null

      default:
        return null
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Help & Learning
          </SheetTitle>
          <SheetDescription className="sr-only">
            Search help articles, take tours, and learn about your financial
            metrics.
          </SheetDescription>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search metrics, articles, tours..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">{renderContent()}</ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
