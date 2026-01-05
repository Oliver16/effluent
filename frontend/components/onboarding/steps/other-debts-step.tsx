'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, Receipt } from 'lucide-react'
import type { StepProps } from './index'

interface OtherDebt {
  name: string
  type: string
  lender: string
  balance: string
  rate: string
  payment: string
}

const DEBT_TYPE_OPTIONS = [
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'medical_debt', label: 'Medical Debt' },
  { value: 'tax_debt', label: 'Tax Debt' },
  { value: 'family_loan', label: 'Loan from Family/Friends' },
  { value: 'other_liability', label: 'Other' },
]

export function OtherDebtsStep({ formData, setFormData }: StepProps) {
  const debts = (formData.other_debts as OtherDebt[]) || []

  const addDebt = () => {
    const newDebts = [...debts, {
      name: '',
      type: 'personal_loan',
      lender: '',
      balance: '',
      rate: '',
      payment: '',
    }]
    setFormData({ ...formData, other_debts: newDebts })
  }

  const updateDebt = (index: number, field: keyof OtherDebt, value: string) => {
    const newDebts = [...debts]
    newDebts[index] = { ...newDebts[index], [field]: value }
    setFormData({ ...formData, other_debts: newDebts })
  }

  const removeDebt = (index: number) => {
    const newDebts = debts.filter((_, i) => i !== index)
    setFormData({ ...formData, other_debts: newDebts })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add any other debts like personal loans, medical debt, or car loans. This step is optional.
      </p>

      {debts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No other debts added</p>
          <Button onClick={addDebt}>
            <Plus className="h-4 w-4 mr-2" />
            Add Debt
          </Button>
        </div>
      ) : (
        <>
          {debts.map((debt, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Debt {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDebt(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={debt.name}
                    onChange={(e) => updateDebt(index, 'name', e.target.value)}
                    placeholder="e.g., Car Loan, Medical Bill"
                  />
                </div>

                <div>
                  <Label>Type</Label>
                  <Select
                    value={debt.type}
                    onChange={(e) => updateDebt(index, 'type', e.target.value)}
                    options={DEBT_TYPE_OPTIONS}
                  />
                </div>

                <div>
                  <Label>Lender/Provider</Label>
                  <Input
                    value={debt.lender}
                    onChange={(e) => updateDebt(index, 'lender', e.target.value)}
                    placeholder="e.g., Toyota Financial"
                  />
                </div>

                <div>
                  <Label>Current Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={debt.balance}
                      onChange={(e) => updateDebt(index, 'balance', e.target.value)}
                      placeholder="15000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={debt.rate}
                    onChange={(e) => updateDebt(index, 'rate', e.target.value)}
                    placeholder="7.5"
                  />
                </div>

                <div>
                  <Label>Monthly Payment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={debt.payment}
                      onChange={(e) => updateDebt(index, 'payment', e.target.value)}
                      placeholder="350"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addDebt} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Debt
          </Button>
        </>
      )}
    </div>
  )
}
