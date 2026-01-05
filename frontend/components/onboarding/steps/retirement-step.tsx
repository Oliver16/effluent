'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, Landmark } from 'lucide-react'
import type { StepProps } from './index'

interface RetirementAccount {
  name: string
  type: string
  institution: string
  balance: string
}

const RETIREMENT_TYPE_OPTIONS = [
  { value: 'traditional_401k', label: '401(k) - Traditional' },
  { value: 'roth_401k', label: '401(k) - Roth' },
  { value: 'traditional_ira', label: 'IRA - Traditional' },
  { value: 'roth_ira', label: 'IRA - Roth' },
  { value: 'sep_ira', label: 'SEP IRA' },
  { value: 'simple_ira', label: 'SIMPLE IRA' },
  { value: 'tsp', label: 'TSP (Federal)' },
  { value: 'pension', label: 'Pension' },
  { value: 'hsa', label: 'Health Savings Account' },
]

export function RetirementStep({ formData, setFormData }: StepProps) {
  const accounts = (formData.retirement_accounts as RetirementAccount[]) || []

  const addAccount = () => {
    const newAccounts = [...accounts, {
      name: '',
      type: 'traditional_401k',
      institution: '',
      balance: '',
    }]
    setFormData({ ...formData, retirement_accounts: newAccounts })
  }

  const updateAccount = (index: number, field: keyof RetirementAccount, value: string) => {
    const newAccounts = [...accounts]
    newAccounts[index] = { ...newAccounts[index], [field]: value }
    setFormData({ ...formData, retirement_accounts: newAccounts })
  }

  const removeAccount = (index: number) => {
    const newAccounts = accounts.filter((_, i) => i !== index)
    setFormData({ ...formData, retirement_accounts: newAccounts })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add your retirement accounts including 401(k)s, IRAs, and pension plans.
      </p>

      {accounts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No retirement accounts added yet</p>
          <Button onClick={addAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Add Retirement Account
          </Button>
        </div>
      ) : (
        <>
          {accounts.map((account, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Retirement Account {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAccount(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Account Name</Label>
                  <Input
                    value={account.name}
                    onChange={(e) => updateAccount(index, 'name', e.target.value)}
                    placeholder="e.g., Work 401k, Roth IRA"
                  />
                </div>

                <div>
                  <Label>Account Type</Label>
                  <Select
                    value={account.type}
                    onChange={(e) => updateAccount(index, 'type', e.target.value)}
                    options={RETIREMENT_TYPE_OPTIONS}
                  />
                </div>

                <div>
                  <Label>Institution</Label>
                  <Input
                    value={account.institution}
                    onChange={(e) => updateAccount(index, 'institution', e.target.value)}
                    placeholder="e.g., Fidelity, Vanguard"
                  />
                </div>

                <div>
                  <Label>Current Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={account.balance}
                      onChange={(e) => updateAccount(index, 'balance', e.target.value)}
                      placeholder="150000"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addAccount} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Retirement Account
          </Button>
        </>
      )}
    </div>
  )
}
