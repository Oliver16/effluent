'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'
import type { StepProps } from './index'

export function HousingExpensesStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <Info className="h-5 w-5 text-blue-500 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Enter monthly amounts</p>
          <p className="text-muted-foreground mt-1">
            If you own your home, you may have entered mortgage info already.
            Add other housing costs like property tax, insurance, or HOA fees here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Rent (if applicable)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.rent as string) || ''}
              onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
              placeholder="1800"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Monthly rent payment</p>
        </div>

        <div>
          <Label>Property Tax</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.property_tax as string) || ''}
              onChange={(e) => setFormData({ ...formData, property_tax: e.target.value })}
              placeholder="500"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Monthly (annual / 12)</p>
        </div>

        <div>
          <Label>Homeowner&apos;s/Renter&apos;s Insurance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.home_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, home_insurance: e.target.value })}
              placeholder="150"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>HOA/Condo Fees</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.hoa as string) || ''}
              onChange={(e) => setFormData({ ...formData, hoa: e.target.value })}
              placeholder="350"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Home Maintenance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.home_maintenance as string) || ''}
              onChange={(e) => setFormData({ ...formData, home_maintenance: e.target.value })}
              placeholder="200"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Average monthly for repairs, lawn care, etc.</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Leave blank if not applicable. You can update these later.
      </p>
    </div>
  )
}
