'use client'

import { useQuery } from '@tanstack/react-query'
import { accounts } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Building2, TrendingUp, Landmark, Home, CreditCard } from 'lucide-react'

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  checking: Building2,
  savings: Building2,
  brokerage: TrendingUp,
  traditional_401k: Landmark,
  roth_401k: Landmark,
  traditional_ira: Landmark,
  roth_ira: Landmark,
  primary_residence: Home,
  credit_card: CreditCard,
}

export default function AccountsPage() {
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list(),
  })

  const accountsList = accountsData?.results || []

  // Group accounts by type
  const assetAccounts = accountsList.filter(a =>
    ['checking', 'savings', 'money_market', 'brokerage', 'traditional_401k', 'roth_401k', 'traditional_ira', 'roth_ira', 'primary_residence'].includes(a.accountType)
  )
  const liabilityAccounts = accountsList.filter(a =>
    ['credit_card', 'primary_mortgage', 'student_loan_federal', 'student_loan_private', 'auto_loan'].includes(a.accountType)
  )

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Manage your financial accounts</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>Bank accounts, investments, and property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assetAccounts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No asset accounts</p>
            ) : (
              assetAccounts.map((account) => {
                const Icon = ACCOUNT_TYPE_ICONS[account.accountType] || Building2
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">{account.institution}</p>
                      </div>
                    </div>
                    <span className="font-medium text-green-600">
                      ${Number(account.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
            <CardDescription>Credit cards, loans, and debts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liabilityAccounts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No liability accounts</p>
            ) : (
              liabilityAccounts.map((account) => {
                const Icon = ACCOUNT_TYPE_ICONS[account.accountType] || CreditCard
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">{account.institution}</p>
                      </div>
                    </div>
                    <span className="font-medium text-red-600">
                      ${Number(account.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
