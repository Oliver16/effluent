'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, GraduationCap } from 'lucide-react'
import type { StepProps } from './index'

interface StudentLoan {
  name: string
  type: string
  servicer: string
  balance: string
  rate: string
  payment: string
}

const LOAN_TYPE_OPTIONS = [
  { value: 'student_loan_federal', label: 'Federal Student Loan' },
  { value: 'student_loan_private', label: 'Private Student Loan' },
]

export function StudentLoansStep({ formData, setFormData }: StepProps) {
  const loans = (formData.student_loans as StudentLoan[]) || []

  const addLoan = () => {
    const newLoans = [...loans, {
      name: '',
      type: 'student_loan_federal',
      servicer: '',
      balance: '',
      rate: '',
      payment: '',
    }]
    setFormData({ ...formData, student_loans: newLoans })
  }

  const updateLoan = (index: number, field: keyof StudentLoan, value: string) => {
    const newLoans = [...loans]
    newLoans[index] = { ...newLoans[index], [field]: value }
    setFormData({ ...formData, student_loans: newLoans })
  }

  const removeLoan = (index: number) => {
    const newLoans = loans.filter((_, i) => i !== index)
    setFormData({ ...formData, student_loans: newLoans })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add any student loans. This step is optional.
      </p>

      {loans.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No student loans added</p>
          <Button onClick={addLoan}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student Loan
          </Button>
        </div>
      ) : (
        <>
          {loans.map((loan, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Student Loan {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLoan(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Loan Name</Label>
                  <Input
                    value={loan.name}
                    onChange={(e) => updateLoan(index, 'name', e.target.value)}
                    placeholder="e.g., Undergrad Loans"
                  />
                </div>

                <div>
                  <Label>Loan Type</Label>
                  <Select
                    value={loan.type}
                    onChange={(e) => updateLoan(index, 'type', e.target.value)}
                    options={LOAN_TYPE_OPTIONS}
                  />
                </div>

                <div>
                  <Label>Servicer</Label>
                  <Input
                    value={loan.servicer}
                    onChange={(e) => updateLoan(index, 'servicer', e.target.value)}
                    placeholder="e.g., Mohela, Nelnet"
                  />
                </div>

                <div>
                  <Label>Current Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={loan.balance}
                      onChange={(e) => updateLoan(index, 'balance', e.target.value)}
                      placeholder="35000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={loan.rate}
                    onChange={(e) => updateLoan(index, 'rate', e.target.value)}
                    placeholder="5.5"
                  />
                </div>

                <div>
                  <Label>Monthly Payment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={loan.payment}
                      onChange={(e) => updateLoan(index, 'payment', e.target.value)}
                      placeholder="350"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addLoan} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Student Loan
          </Button>
        </>
      )}
    </div>
  )
}
