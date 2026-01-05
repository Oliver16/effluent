'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, Building2 } from 'lucide-react'
import type { StepProps } from './index'

interface BankAccount {
  name: string
  type: string
  institution: string
  balance: string
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'money_market', label: 'Money Market Account' },
  { value: 'cd', label: 'Certificate of Deposit' },
]

export function BankAccountsStep({ formData, setFormData, errors }: StepProps) {
  const accounts = (formData.accounts as BankAccount[]) || []

  const addAccount = () => {
    const newAccounts = [...accounts, {
      name: '',
      type: 'checking',
      institution: '',
      balance: '',
    }]
    setFormData({ ...formData, accounts: newAccounts })
  }

  const updateAccount = (index: number, field: keyof BankAccount, value: string) => {
    const newAccounts = [...accounts]
    newAccounts[index] = { ...newAccounts[index], [field]: value }
    setFormData({ ...formData, accounts: newAccounts })
  }

  const removeAccount = (index: number) => {
    const newAccounts = accounts.filter((_, i) => i !== index)
    setFormData({ ...formData, accounts: newAccounts })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add your checking, savings, and other bank accounts. This helps track your cash position.
      </p>

      {accounts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No bank accounts added yet</p>
          <Button onClick={addAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
        </div>
      ) : (
        <>
          {accounts.map((account, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Account {index + 1}</span>
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
                    placeholder="e.g., Main Checking"
                  />
                  {errors?.[`accounts.${index}.name`] && (
                    <p className="text-sm text-red-500 mt-1">{errors[`accounts.${index}.name`]}</p>
                  )}
                </div>

                <div>
                  <Label>Account Type</Label>
                  <Select
                    value={account.type}
                    onChange={(e) => updateAccount(index, 'type', e.target.value)}
                    options={ACCOUNT_TYPE_OPTIONS}
                  />
                </div>

                <div>
                  <Label>Bank/Institution</Label>
                  <Input
                    value={account.institution}
                    onChange={(e) => updateAccount(index, 'institution', e.target.value)}
                    placeholder="e.g., Chase, Wells Fargo"
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
                      placeholder="5000"
                      className="pl-7"
                    />
                  </div>
                  {errors?.[`accounts.${index}.balance`] && (
                    <p className="text-sm text-red-500 mt-1">{errors[`accounts.${index}.balance`]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addAccount} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Account
          </Button>
        </>
      )}
    </div>
  )
}
