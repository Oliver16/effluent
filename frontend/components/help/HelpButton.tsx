'use client'

import * as React from 'react'
import { useState } from 'react'
import { HelpCircle, BookOpen, Play, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HelpDrawer } from './HelpDrawer'
import { useTour } from './TourProvider'
import { getToursForModule } from '@/lib/help/tours'
import type { HelpModule } from '@/lib/help/types'

// -----------------------------------------------------------------------------
// Floating Help Button (for app-wide help access)
// -----------------------------------------------------------------------------

interface FloatingHelpButtonProps {
  className?: string
}

export function FloatingHelpButton({ className }: FloatingHelpButtonProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg',
          'hover:shadow-xl transition-shadow',
          className
        )}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open help"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <HelpDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}

// -----------------------------------------------------------------------------
// Header Help Button (for page/section headers)
// -----------------------------------------------------------------------------

interface HeaderHelpButtonProps {
  /**
   * Current module (determines which tours are shown)
   */
  module: HelpModule
  /**
   * Custom class
   */
  className?: string
  /**
   * Variant
   */
  variant?: 'default' | 'ghost' | 'outline'
}

export function HeaderHelpButton({
  module,
  className,
  variant = 'ghost',
}: HeaderHelpButtonProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { startTour, isTourCompleted } = useTour()

  const moduleTours = getToursForModule(module)
  const hasUncompletedTour = moduleTours.some((t) => !isTourCompleted(t.id))

  const handleStartTour = (tourId: string) => {
    startTour(tourId)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className={cn('gap-1.5', className)}
          >
            <HelpCircle className="h-4 w-4" />
            Help
            {hasUncompletedTour && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {moduleTours.length > 0 && (
            <>
              <DropdownMenuLabel>Tours</DropdownMenuLabel>
              {moduleTours.map((tour) => (
                <DropdownMenuItem
                  key={tour.id}
                  onClick={() => handleStartTour(tour.id)}
                >
                  <Play className="h-4 w-4 mr-2 text-primary" />
                  <span className="flex-1">{tour.name}</span>
                  {isTourCompleted(tour.id) && (
                    <span className="text-xs text-emerald-500">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Knowledge Base
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
            <Lightbulb className="h-4 w-4 mr-2" />
            Metrics Glossary
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HelpDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}

// -----------------------------------------------------------------------------
// Inline Help Trigger (for specific context)
// -----------------------------------------------------------------------------

interface InlineHelpTriggerProps {
  /**
   * The content ID to open in the drawer
   */
  contentId: string
  /**
   * Trigger content
   */
  children?: React.ReactNode
  /**
   * Custom class
   */
  className?: string
}

export function InlineHelpTrigger({
  contentId,
  children,
  className,
}: InlineHelpTriggerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className={cn(
          'text-primary hover:underline inline-flex items-center gap-1',
          className
        )}
      >
        {children || 'Learn more'}
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      <HelpDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialView="article"
        initialContentId={contentId}
      />
    </>
  )
}
