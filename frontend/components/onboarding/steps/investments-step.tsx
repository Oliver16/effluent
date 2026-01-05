'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, TrendingUp } from 'lucide-react'
import type { StepProps } from './index'

interface Investment {
  name: string
  type: string
  institution: string
  balance: string
  cost_basis: string
}

const INVESTMENT_TYPE_OPTIONS = [
  { value: 'brokerage', label: 'Brokerage Account' },
  { value: 'crypto', label: 'Cryptocurrency' },
]

export function InvestmentsStep({ formData, setFormData }: StepProps) {
  const investments = (formData.investments as Investment[]) || []

  const addInvestment = () => {
    const newInvestments = [...investments, {
      name: '',
      type: 'brokerage',
      institution: '',
      balance: '',
      cost_basis: '',
    }]
    setFormData({ ...formData, investments: newInvestments })
  }

  const updateInvestment = (index: number, field: keyof Investment, value: string) => {
    const newInvestments = [...investments]
    newInvestments[index] = { ...newInvestments[index], [field]: value }
    setFormData({ ...formData, investments: newInvestments })
  }

  const removeInvestment = (index: number) => {
    const newInvestments = investments.filter((_, i) => i !== index)
    setFormData({ ...formData, investments: newInvestments })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add taxable investment accounts (not retirement accounts - those are next).
      </p>

      {investments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No investment accounts added yet</p>
          <Button onClick={addInvestment}>
            <Plus className="h-4 w-4 mr-2" />
            Add Investment Account
          </Button>
        </div>
      ) : (
        <>
          {investments.map((investment, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Investment {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeInvestment(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Account Name</Label>
                  <Input
                    value={investment.name}
                    onChange={(e) => updateInvestment(index, 'name', e.target.value)}
                    placeholder="e.g., Fidelity Brokerage"
                  />
                </div>

                <div>
                  <Label>Account Type</Label>
                  <Select
                    value={investment.type}
                    onChange={(e) => updateInvestment(index, 'type', e.target.value)}
                    options={INVESTMENT_TYPE_OPTIONS}
                  />
                </div>

                <div>
                  <Label>Institution</Label>
                  <Input
                    value={investment.institution}
                    onChange={(e) => updateInvestment(index, 'institution', e.target.value)}
                    placeholder="e.g., Fidelity, Schwab"
                  />
                </div>

                <div>
                  <Label>Current Market Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={investment.balance}
                      onChange={(e) => updateInvestment(index, 'balance', e.target.value)}
                      placeholder="50000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Cost Basis (optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={investment.cost_basis}
                      onChange={(e) => updateInvestment(index, 'cost_basis', e.target.value)}
                      placeholder="40000"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    The original amount you invested (for tracking gains/losses)
                  </p>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addInvestment} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Investment Account
          </Button>
        </>
      )}
    </div>
  )
}
