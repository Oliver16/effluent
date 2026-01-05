'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StepProps } from './index'

export function OtherExpensesStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter other recurring monthly expenses.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Childcare/Daycare</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.childcare as string) || ''}
              onChange={(e) => setFormData({ ...formData, childcare: e.target.value })}
              placeholder="0"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Children Activities</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.child_activities as string) || ''}
              onChange={(e) => setFormData({ ...formData, child_activities: e.target.value })}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Sports, lessons, tutoring</p>
        </div>

        <div>
          <Label>Gym/Fitness</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.gym as string) || ''}
              onChange={(e) => setFormData({ ...formData, gym: e.target.value })}
              placeholder="50"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Subscriptions</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.subscriptions as string) || ''}
              onChange={(e) => setFormData({ ...formData, subscriptions: e.target.value })}
              placeholder="50"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Software, magazines, memberships</p>
        </div>

        <div>
          <Label>Pet Expenses</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.pets as string) || ''}
              onChange={(e) => setFormData({ ...formData, pets: e.target.value })}
              placeholder="100"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Food, vet, grooming</p>
        </div>

        <div>
          <Label>Personal Care</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.personal_care as string) || ''}
              onChange={(e) => setFormData({ ...formData, personal_care: e.target.value })}
              placeholder="75"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Haircuts, toiletries</p>
        </div>

        <div>
          <Label>Clothing</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.clothing as string) || ''}
              onChange={(e) => setFormData({ ...formData, clothing: e.target.value })}
              placeholder="100"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Average monthly</p>
        </div>

        <div>
          <Label>Entertainment/Hobbies</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.entertainment as string) || ''}
              onChange={(e) => setFormData({ ...formData, entertainment: e.target.value })}
              placeholder="150"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Charitable Giving</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.charitable as string) || ''}
              onChange={(e) => setFormData({ ...formData, charitable: e.target.value })}
              placeholder="100"
              className="pl-7"
            />
          </div>
        </div>

        <div>
          <Label>Miscellaneous</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={(formData.miscellaneous as string) || ''}
              onChange={(e) => setFormData({ ...formData, miscellaneous: e.target.value })}
              placeholder="200"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Buffer for unplanned expenses</p>
        </div>
      </div>
    </div>
  )
}
