'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StepProps } from './index'

export function UtilitiesStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter your average monthly utility costs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Electricity</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.electricity as string) || ''}
              onChange={(e) => setFormData({ ...formData, electricity: e.target.value })}
              placeholder="150"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Natural Gas</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.natural_gas as string) || ''}
              onChange={(e) => setFormData({ ...formData, natural_gas: e.target.value })}
              placeholder="75"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Water & Sewer</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.water as string) || ''}
              onChange={(e) => setFormData({ ...formData, water: e.target.value })}
              placeholder="60"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Trash/Recycling</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.trash as string) || ''}
              onChange={(e) => setFormData({ ...formData, trash: e.target.value })}
              placeholder="30"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Internet</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.internet as string) || ''}
              onChange={(e) => setFormData({ ...formData, internet: e.target.value })}
              placeholder="80"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Phone/Mobile</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.phone as string) || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="120"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Cable/Streaming</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.streaming as string) || ''}
              onChange={(e) => setFormData({ ...formData, streaming: e.target.value })}
              placeholder="50"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Netflix, Spotify, etc.</p>
        </div>
      </div>
    </div>
  )
}
