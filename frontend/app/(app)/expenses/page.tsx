'use client'

import { useQuery } from '@tanstack/react-query'
import { flows } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Receipt, Home, Car, Utensils, Zap, Shield } from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  rent: Home,
  mortgage_principal: Home,
  mortgage_interest: Home,
  property_tax: Home,
  electricity: Zap,
  natural_gas: Zap,
  water_sewer: Zap,
  auto_insurance: Car,
  gas_fuel: Car,
  groceries: Utensils,
  dining_out: Utensils,
  health_insurance: Shield,
  life_insurance: Shield,
}

export default function ExpensesPage() {
  const { data: flowsData, isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flows.list(),
  })

  const expenseFlows = (flowsData || []).filter(f => f.flowType === 'expense')
  const totalMonthlyExpenses = expenseFlows.reduce((sum, f) => sum + Number(f.monthlyAmount || 0), 0)

  // Group by category
  const categories = expenseFlows.reduce((acc, flow) => {
    const cat = flow.expenseCategory || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(flow)
    return acc
  }, {} as Record<string, typeof expenseFlows>)

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Manage your recurring expenses</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Monthly Expenses</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              ${totalMonthlyExpenses.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Annual Expenses</CardDescription>
            <CardTitle className="text-3xl">
              ${(totalMonthlyExpenses * 12).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expense Items</CardDescription>
            <CardTitle className="text-3xl">{expenseFlows.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>Your recurring expenses by category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenseFlows.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expenses added yet</p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          ) : (
            expenseFlows.map((flow) => {
              const Icon = CATEGORY_ICONS[flow.expenseCategory || ''] || Receipt
              return (
                <div key={flow.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{flow.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {flow.expenseCategory?.replace(/_/g, ' ') || flow.frequency}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">
                      ${Number(flow.monthlyAmount || 0).toLocaleString()}/mo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(flow.amount || 0).toLocaleString()} {flow.frequency}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
