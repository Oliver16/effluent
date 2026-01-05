'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StepProps } from './index'

export function TransportationStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter your average monthly transportation costs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Auto Insurance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.auto_insurance as string) || ''}
              onChange={(e) => setFormData({ ...formData, auto_insurance: e.target.value })}
              placeholder="150"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Monthly premium</p>
        </div>

        <div>
          <Label>Gas/Fuel</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.gas as string) || ''}
              onChange={(e) => setFormData({ ...formData, gas: e.target.value })}
              placeholder="200"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Auto Maintenance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.auto_maintenance as string) || ''}
              onChange={(e) => setFormData({ ...formData, auto_maintenance: e.target.value })}
              placeholder="100"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Oil changes, repairs, etc.</p>
        </div>

        <div>
          <Label>Parking</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.parking as string) || ''}
              onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
              placeholder="50"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Tolls</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.tolls as string) || ''}
              onChange={(e) => setFormData({ ...formData, tolls: e.target.value })}
              placeholder="30"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Public Transit</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.transit as string) || ''}
              onChange={(e) => setFormData({ ...formData, transit: e.target.value })}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Monthly pass or avg rideshare</p>
        </div>
      </div>
    </div>
  )
}
