'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'
import type { StepProps } from './index'

export function InsuranceStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <Info className="h-5 w-5 text-blue-500 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Non-payroll insurance costs</p>
          <p className="text-muted-foreground mt-1">
            If health insurance is deducted from your paycheck, you may have already
            entered it in pre-tax deductions. Only add additional out-of-pocket costs here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Life Insurance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.life_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, life_insurance: e.target.value })}
              placeholder="75"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Monthly premium</p>
        </div>

        <div>
          <Label>Disability Insurance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.disability_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, disability_insurance: e.target.value })}
              placeholder="50"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Umbrella Insurance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.umbrella_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, umbrella_insurance: e.target.value })}
              placeholder="30"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Other Insurance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.other_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, other_insurance: e.target.value })}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pet insurance, etc.</p>
        </div>
      </div>
    </div>
  )
}
