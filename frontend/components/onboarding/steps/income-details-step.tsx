'use client'

import { Info } from 'lucide-react'
import type { StepProps } from './index'

export function IncomeDetailsStep({ formData }: StepProps) {
  const sources = (formData.sources as Array<{ name: string; salary: string }>) || []

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <Info className="h-5 w-5 text-blue-500 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Income details will be refined over time</p>
          <p className="text-muted-foreground mt-1">
            You can add more detailed income information (bonuses, commission, overtime)
            in the settings after completing onboarding.
          </p>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Your Income Sources</h3>
          {sources.map((source, index) => (
            <div key={index} className="p-3 border rounded-lg flex justify-between items-center">
              <span>{source.name || `Income Source ${index + 1}`}</span>
              <span className="text-muted-foreground">
                ${Number(source.salary || 0).toLocaleString()}/year
              </span>
            </div>
          ))}
        </div>
      )}

      {sources.length === 0 && (
        <p className="text-muted-foreground text-center py-4">
          No income sources added in the previous step. You can go back to add them,
          or continue and add them later in settings.
        </p>
      )}
    </div>
  )
}
