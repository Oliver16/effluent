'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StepProps } from './index'

export function FoodStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter your average monthly food expenses.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Groceries</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.groceries as string) || ''}
              onChange={(e) => setFormData({ ...formData, groceries: e.target.value })}
              placeholder="600"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Supermarket, Costco, etc.</p>
        </div>

        <div>
          <Label>Dining Out</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.dining_out as string) || ''}
              onChange={(e) => setFormData({ ...formData, dining_out: e.target.value })}
              placeholder="200"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Restaurants, takeout</p>
        </div>

        <div>
          <Label>Coffee/Snacks</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.coffee as string) || ''}
              onChange={(e) => setFormData({ ...formData, coffee: e.target.value })}
              placeholder="50"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Starbucks, convenience stores</p>
        </div>

        <div>
          <Label>Food Delivery</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.food_delivery as string) || ''}
              onChange={(e) => setFormData({ ...formData, food_delivery: e.target.value })}
              placeholder="100"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">DoorDash, UberEats, etc.</p>
        </div>
      </div>
    </div>
  )
}
