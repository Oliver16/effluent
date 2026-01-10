'use client'

import * as React from 'react'
import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import type { Tour, TourStep, UserHelpState } from '@/lib/help/types'
import { getTourById, ALL_TOURS } from '@/lib/help/tours'

// -----------------------------------------------------------------------------
// Event System for Tour Gating
// -----------------------------------------------------------------------------

type TourEventCallback = (eventName: string, data?: Record<string, unknown>) => void

const tourEventListeners = new Set<TourEventCallback>()

/**
 * Emit a tour event (call this from your app when actions occur)
 * Example: emitTourEvent('flow.created', { flowId: '123' })
 */
export function emitTourEvent(eventName: string, data?: Record<string, unknown>) {
  tourEventListeners.forEach((listener) => listener(eventName, data))
}

// -----------------------------------------------------------------------------
// Tour Context
// -----------------------------------------------------------------------------

interface TourContextValue {
  // State
  activeTour: Tour | null
  currentStepIndex: number
  currentStep: TourStep | null
  isActive: boolean
  userState: UserHelpState

  // Actions
  startTour: (tourId: string) => void
  nextStep: () => void
  prevStep: () => void
  skipStep: () => void
  endTour: (completed?: boolean) => void
  dismissTour: () => void

  // Queries
  isTourCompleted: (tourId: string) => boolean
  getAvailableTours: () => Tour[]
}

const TourContext = createContext<TourContextValue | null>(null)

// -----------------------------------------------------------------------------
// Local Storage Helpers
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'effluent_help_state'

function loadUserState(): UserHelpState {
  if (typeof window === 'undefined') {
    return {
      completedTours: [],
      completedPaths: [],
      dismissed: [],
      readArticles: [],
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }

  return {
    completedTours: [],
    completedPaths: [],
    dismissed: [],
    readArticles: [],
  }
}

function saveUserState(state: UserHelpState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

// -----------------------------------------------------------------------------
// Tour Provider Component
// -----------------------------------------------------------------------------

interface TourProviderProps {
  children: React.ReactNode
  /**
   * Optional callback when a tour event occurs (for analytics)
   */
  onTourEvent?: (event: {
    type: 'started' | 'step_viewed' | 'completed' | 'skipped' | 'dismissed'
    tourId: string
    stepId?: string
    stepIndex?: number
  }) => void
}

export function TourProvider({ children, onTourEvent }: TourProviderProps) {
  const [activeTour, setActiveTour] = useState<Tour | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [userState, setUserState] = useState<UserHelpState>(loadUserState)
  const [waitingForEvent, setWaitingForEvent] = useState<string | null>(null)

  // Persist user state changes
  useEffect(() => {
    saveUserState(userState)
  }, [userState])

  // Listen for tour events (for event-gated steps)
  useEffect(() => {
    const listener: TourEventCallback = (eventName) => {
      if (waitingForEvent && eventName === waitingForEvent) {
        setWaitingForEvent(null)
        // Auto-advance when expected event fires
        setCurrentStepIndex((prev) => prev + 1)
      }
    }

    tourEventListeners.add(listener)
    return () => {
      tourEventListeners.delete(listener)
    }
  }, [waitingForEvent])

  // Current step derived state
  const currentStep = activeTour?.steps[currentStepIndex] ?? null

  // Start a tour
  const startTour = useCallback(
    (tourId: string) => {
      const tour = getTourById(tourId)
      if (!tour) {
        console.warn(`Tour not found: ${tourId}`)
        return
      }

      setActiveTour(tour)
      setCurrentStepIndex(0)
      setWaitingForEvent(null)

      // Track active tour for resumption
      setUserState((prev) => ({
        ...prev,
        activeTour: {
          tourId,
          stepIndex: 0,
          startedAt: new Date().toISOString(),
        },
      }))

      onTourEvent?.({
        type: 'started',
        tourId,
      })
    },
    [onTourEvent]
  )

  // Advance to next step
  const nextStep = useCallback(() => {
    if (!activeTour) return

    const nextIndex = currentStepIndex + 1

    // Check if tour is complete
    if (nextIndex >= activeTour.steps.length) {
      // Mark as completed
      setUserState((prev) => ({
        ...prev,
        completedTours: prev.completedTours.includes(activeTour.id)
          ? prev.completedTours
          : [...prev.completedTours, activeTour.id],
        activeTour: undefined,
      }))

      onTourEvent?.({
        type: 'completed',
        tourId: activeTour.id,
      })

      setActiveTour(null)
      setCurrentStepIndex(0)
      return
    }

    // Check if next step has an event gate
    const nextStepDef = activeTour.steps[nextIndex]
    if (nextStepDef.waitForEvent) {
      setWaitingForEvent(nextStepDef.waitForEvent.name)
    }

    setCurrentStepIndex(nextIndex)

    onTourEvent?.({
      type: 'step_viewed',
      tourId: activeTour.id,
      stepId: nextStepDef.id,
      stepIndex: nextIndex,
    })
  }, [activeTour, currentStepIndex, onTourEvent])

  // Go to previous step
  const prevStep = useCallback(() => {
    if (!activeTour || currentStepIndex === 0) return

    const prevIndex = currentStepIndex - 1
    setCurrentStepIndex(prevIndex)
    setWaitingForEvent(null)

    onTourEvent?.({
      type: 'step_viewed',
      tourId: activeTour.id,
      stepId: activeTour.steps[prevIndex].id,
      stepIndex: prevIndex,
    })
  }, [activeTour, currentStepIndex, onTourEvent])

  // Skip current step (for optional steps or when target is missing)
  const skipStep = useCallback(() => {
    if (!activeTour) return
    setWaitingForEvent(null)
    nextStep()
  }, [activeTour, nextStep])

  // End tour (optionally marking as completed)
  const endTour = useCallback(
    (completed = false) => {
      if (!activeTour) return

      if (completed) {
        setUserState((prev) => ({
          ...prev,
          completedTours: prev.completedTours.includes(activeTour.id)
            ? prev.completedTours
            : [...prev.completedTours, activeTour.id],
          activeTour: undefined,
        }))

        onTourEvent?.({
          type: 'completed',
          tourId: activeTour.id,
        })
      } else {
        setUserState((prev) => ({
          ...prev,
          activeTour: undefined,
        }))

        onTourEvent?.({
          type: 'skipped',
          tourId: activeTour.id,
          stepIndex: currentStepIndex,
        })
      }

      setActiveTour(null)
      setCurrentStepIndex(0)
      setWaitingForEvent(null)
    },
    [activeTour, currentStepIndex, onTourEvent]
  )

  // Dismiss tour (don't show again)
  const dismissTour = useCallback(() => {
    if (!activeTour) return

    setUserState((prev) => ({
      ...prev,
      dismissed: prev.dismissed.includes(activeTour.id)
        ? prev.dismissed
        : [...prev.dismissed, activeTour.id],
      activeTour: undefined,
    }))

    onTourEvent?.({
      type: 'dismissed',
      tourId: activeTour.id,
    })

    setActiveTour(null)
    setCurrentStepIndex(0)
    setWaitingForEvent(null)
  }, [activeTour, onTourEvent])

  // Check if a tour is completed
  const isTourCompleted = useCallback(
    (tourId: string) => {
      return userState.completedTours.includes(tourId)
    },
    [userState.completedTours]
  )

  // Get available (not dismissed, not completed) tours
  const getAvailableTours = useCallback(() => {
    return ALL_TOURS.filter(
      (tour) =>
        !userState.dismissed.includes(tour.id) &&
        !userState.completedTours.includes(tour.id)
    )
  }, [userState.dismissed, userState.completedTours])

  const value: TourContextValue = {
    activeTour,
    currentStepIndex,
    currentStep,
    isActive: activeTour !== null,
    userState,
    startTour,
    nextStep,
    prevStep,
    skipStep,
    endTour,
    dismissTour,
    isTourCompleted,
    getAvailableTours,
  }

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}
