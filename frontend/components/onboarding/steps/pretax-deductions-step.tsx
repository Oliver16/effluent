'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'
import type { StepProps } from './index'

export function PretaxDeductionsStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <Info className="h-5 w-5 text-blue-500 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Pre-tax deductions reduce your taxable income</p>
          <p className="text-muted-foreground mt-1">
            Enter the per-paycheck amounts deducted before taxes from your pay stub.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>401(k) / 403(b) Contribution</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.retirement_401k as string) || ''}
              onChange={(e) => setFormData({ ...formData, retirement_401k: e.target.value })}
              placeholder="750"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Per paycheck contribution</p>
        </div>

        <div>
          <Label>HSA Contribution</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.hsa as string) || ''}
              onChange={(e) => setFormData({ ...formData, hsa: e.target.value })}
              placeholder="150"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Health Savings Account</p>
        </div>

        <div>
          <Label>FSA Contribution</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.fsa as string) || ''}
              onChange={(e) => setFormData({ ...formData, fsa: e.target.value })}
              placeholder="100"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Flexible Spending Account</p>
        </div>

        <div>
          <Label>Health Insurance Premium</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.health_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, health_insurance: e.target.value })}
              placeholder="200"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Employee portion</p>
        </div>

        <div>
          <Label>Dental Insurance Premium</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.dental_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, dental_insurance: e.target.value })}
              placeholder="25"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Vision Insurance Premium</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.vision_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, vision_insurance: e.target.value })}
              placeholder="10"
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Leave blank if you don&apos;t have these deductions. You can add or update them later.
      </p>
    </div>
  )
}
