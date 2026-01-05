'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'
import type { StepProps } from './index'

export function WithholdingStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <Info className="h-5 w-5 text-blue-500 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Find this on your recent pay stub</p>
          <p className="text-muted-foreground mt-1">
            Look for "Federal Tax Withheld", "State Tax", "Social Security", and "Medicare" on your pay stub.
            Enter the per-paycheck amounts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Federal Tax (per paycheck)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.federal_tax as string) || ''}
              onChange={(e) => setFormData({ ...formData, federal_tax: e.target.value })}
              placeholder="500"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>State Tax (per paycheck)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.state_tax as string) || ''}
              onChange={(e) => setFormData({ ...formData, state_tax: e.target.value })}
              placeholder="200"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Social Security (per paycheck)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.social_security as string) || ''}
              onChange={(e) => setFormData({ ...formData, social_security: e.target.value })}
              placeholder="250"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Medicare (per paycheck)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.medicare as string) || ''}
              onChange={(e) => setFormData({ ...formData, medicare: e.target.value })}
              placeholder="60"
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        These amounts help us calculate your take-home pay and tax projections more accurately.
        You can update these later if you don&apos;t have your pay stub handy.
      </p>
    </div>
  )
}
