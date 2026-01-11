'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { scenarios } from '@/lib/api'
import { Scenario } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { GitBranch, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScenarioPickerProps {
  value?: string
  onValueChange: (scenarioId: string) => void
  placeholder?: string
  excludeIds?: string[]
  excludeBaseline?: boolean
  excludeArchived?: boolean
  disabled?: boolean
  className?: string
}

/**
 * ScenarioPicker - A dropdown for selecting scenarios.
 *
 * Used by:
 * - Life Event Wizard (append to existing scenario)
 * - Decision Wizard (append to existing scenario)
 * - Merge Dialog (select source scenario)
 */
export function ScenarioPicker({
  value,
  onValueChange,
  placeholder = 'Select a scenario...',
  excludeIds = [],
  excludeBaseline = false,
  excludeArchived = true,
  disabled = false,
  className,
}: ScenarioPickerProps) {
  const { data: allScenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: scenarios.list,
  })

  const filteredScenarios = useMemo(() => {
    return allScenarios.filter((s: Scenario) => {
      if (excludeIds.includes(s.id)) return false
      if (excludeBaseline && s.isBaseline) return false
      if (excludeArchived && s.isArchived) return false
      return true
    })
  }, [allScenarios, excludeIds, excludeBaseline, excludeArchived])

  const selectedScenario = useMemo(() => {
    return allScenarios.find((s: Scenario) => s.id === value)
  }, [allScenarios, value])

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder}>
          {selectedScenario && (
            <div className="flex items-center gap-2">
              {selectedScenario.isBaseline ? (
                <Home className="h-4 w-4 text-muted-foreground" />
              ) : (
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{selectedScenario.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {filteredScenarios.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No scenarios available
          </div>
        ) : (
          filteredScenarios.map((scenario: Scenario) => (
            <SelectItem key={scenario.id} value={scenario.id}>
              <div className="flex items-center gap-2">
                {scenario.isBaseline ? (
                  <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate">{scenario.name}</span>
                {scenario.isBaseline && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Baseline
                  </Badge>
                )}
                {scenario.changes && scenario.changes.length > 0 && !scenario.isBaseline && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {scenario.changes.length} changes
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

/**
 * Hook to get the list of available scenarios for selection.
 * Can be used directly if you need more control over the UI.
 */
export function useAvailableScenarios(options?: {
  excludeIds?: string[]
  excludeBaseline?: boolean
  excludeArchived?: boolean
}) {
  const { data: allScenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: scenarios.list,
  })

  const filtered = useMemo(() => {
    return allScenarios.filter((s: Scenario) => {
      if (options?.excludeIds?.includes(s.id)) return false
      if (options?.excludeBaseline && s.isBaseline) return false
      if (options?.excludeArchived !== false && s.isArchived) return false
      return true
    })
  }, [allScenarios, options?.excludeIds, options?.excludeBaseline, options?.excludeArchived])

  return { scenarios: filtered, isLoading }
}
