'use client'

import { useQuery } from '@tanstack/react-query'
import { accounts } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, CreditCard, GraduationCap, Home, Car, Receipt } from 'lucide-react'

const DEBT_TYPE_ICONS: Record<string, React.ElementType> = {
  credit_card: CreditCard,
  store_card: CreditCard,
  student_loan_federal: GraduationCap,
  student_loan_private: GraduationCap,
  primary_mortgage: Home,
  rental_mortgage: Home,
  second_mortgage: Home,
  heloc: Home,
  auto_loan: Car,
  personal_loan: Receipt,
  medical_debt: Receipt,
}

const LIABILITY_TYPES = [
  'credit_card', 'store_card', 'heloc', 'personal_loc', 'business_loc',
  'primary_mortgage', 'rental_mortgage', 'second_mortgage',
  'auto_loan', 'personal_loan', 'student_loan_federal', 'student_loan_private',
  'boat_loan', 'medical_debt', 'tax_debt', 'family_loan', 'other_liability'
]

export default function DebtsPage() {
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list(),
  })

  const debtAccounts = (accountsData?.results || []).filter(a =>
    LIABILITY_TYPES.includes(a.accountType)
  )
  const totalDebt = debtAccounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0)

  // Group by type
  const mortgages = debtAccounts.filter(a =>
    ['primary_mortgage', 'rental_mortgage', 'second_mortgage', 'heloc'].includes(a.accountType)
  )
  const creditCards = debtAccounts.filter(a =>
    ['credit_card', 'store_card'].includes(a.accountType)
  )
  const studentLoans = debtAccounts.filter(a =>
    ['student_loan_federal', 'student_loan_private'].includes(a.accountType)
  )
  const otherDebts = debtAccounts.filter(a =>
    !['primary_mortgage', 'rental_mortgage', 'second_mortgage', 'heloc', 'credit_card', 'store_card', 'student_loan_federal', 'student_loan_private'].includes(a.accountType)
  )

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debts</h1>
          <p className="text-muted-foreground">Manage your loans and liabilities</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Debt
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Debt</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              ${totalDebt.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mortgages</CardDescription>
            <CardTitle className="text-2xl">
              ${mortgages.reduce((s, a) => s + Number(a.currentBalance || 0), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credit Cards</CardDescription>
            <CardTitle className="text-2xl">
              ${creditCards.reduce((s, a) => s + Number(a.currentBalance || 0), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Student Loans</CardDescription>
            <CardTitle className="text-2xl">
              ${studentLoans.reduce((s, a) => s + Number(a.currentBalance || 0), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {debtAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No debts tracked yet</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Debt
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {mortgages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Mortgages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mortgages.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.institution}</p>
                    </div>
                    <span className="font-medium text-red-600">
                      ${Number(account.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {creditCards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Credit Cards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creditCards.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.institution}</p>
                    </div>
                    <span className="font-medium text-red-600">
                      ${Number(account.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {studentLoans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Loans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentLoans.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.institution}</p>
                    </div>
                    <span className="font-medium text-red-600">
                      ${Number(account.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {otherDebts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Other Debts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherDebts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.institution}</p>
                    </div>
                    <span className="font-medium text-red-600">
                      ${Number(account.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
