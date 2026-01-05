'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StepProps } from './index'

export function HouseholdInfoStep({ formData, setFormData, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Household Name</Label>
        <Input
          id="name"
          value={(formData.name as string) || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., The Smith Family"
        />
        {errors?.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
        <p className="text-sm text-muted-foreground mt-1">
          This is just a friendly name for your household (e.g., "The Smiths", "My Finances")
        </p>
      </div>
    </div>
  )
}
