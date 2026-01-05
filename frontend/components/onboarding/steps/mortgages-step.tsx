'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, Building } from 'lucide-react'
import type { StepProps } from './index'

interface Mortgage {
  name: string
  type: string
  lender: string
  balance: string
  rate: string
  payment: string
  term: string
}

const MORTGAGE_TYPE_OPTIONS = [
  { value: 'primary_mortgage', label: 'Primary Residence Mortgage' },
  { value: 'rental_mortgage', label: 'Rental Property Mortgage' },
  { value: 'second_mortgage', label: 'Second Mortgage' },
  { value: 'heloc', label: 'Home Equity Line of Credit' },
]

export function MortgagesStep({ formData, setFormData }: StepProps) {
  const mortgages = (formData.mortgages as Mortgage[]) || []

  const addMortgage = () => {
    const newMortgages = [...mortgages, {
      name: '',
      type: 'primary_mortgage',
      lender: '',
      balance: '',
      rate: '',
      payment: '',
      term: '360',
    }]
    setFormData({ ...formData, mortgages: newMortgages })
  }

  const updateMortgage = (index: number, field: keyof Mortgage, value: string) => {
    const newMortgages = [...mortgages]
    newMortgages[index] = { ...newMortgages[index], [field]: value }
    setFormData({ ...formData, mortgages: newMortgages })
  }

  const removeMortgage = (index: number) => {
    const newMortgages = mortgages.filter((_, i) => i !== index)
    setFormData({ ...formData, mortgages: newMortgages })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add any mortgages or home equity loans. This step is optional.
      </p>

      {mortgages.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No mortgages added</p>
          <Button onClick={addMortgage}>
            <Plus className="h-4 w-4 mr-2" />
            Add Mortgage
          </Button>
        </div>
      ) : (
        <>
          {mortgages.map((mortgage, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Mortgage {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMortgage(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Mortgage Name</Label>
                  <Input
                    value={mortgage.name}
                    onChange={(e) => updateMortgage(index, 'name', e.target.value)}
                    placeholder="e.g., Home Mortgage"
                  />
                </div>

                <div>
                  <Label>Type</Label>
                  <Select
                    value={mortgage.type}
                    onChange={(e) => updateMortgage(index, 'type', e.target.value)}
                    options={MORTGAGE_TYPE_OPTIONS}
                  />
                </div>

                <div>
                  <Label>Lender</Label>
                  <Input
                    value={mortgage.lender}
                    onChange={(e) => updateMortgage(index, 'lender', e.target.value)}
                    placeholder="e.g., Wells Fargo"
                  />
                </div>

                <div>
                  <Label>Current Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={mortgage.balance}
                      onChange={(e) => updateMortgage(index, 'balance', e.target.value)}
                      placeholder="280000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.125"
                    value={mortgage.rate}
                    onChange={(e) => updateMortgage(index, 'rate', e.target.value)}
                    placeholder="6.5"
                  />
                </div>

                <div>
                  <Label>Monthly Payment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={mortgage.payment}
                      onChange={(e) => updateMortgage(index, 'payment', e.target.value)}
                      placeholder="2100"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addMortgage} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Mortgage
          </Button>
        </>
      )}
    </div>
  )
}
