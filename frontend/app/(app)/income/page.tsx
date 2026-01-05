'use client'

import { useQuery } from '@tanstack/react-query'
import { flows } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Briefcase, TrendingUp } from 'lucide-react'

export default function IncomePage() {
  const { data: flowsData, isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flows.list(),
  })

  const incomeFlows = (flowsData || []).filter(f => f.flowType === 'income')
  const totalMonthlyIncome = incomeFlows.reduce((sum, f) => sum + Number(f.monthlyAmount || 0), 0)

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Income</h1>
          <p className="text-muted-foreground">Manage your income sources</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Income
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Monthly Income</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              ${totalMonthlyIncome.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Annual Income</CardDescription>
            <CardTitle className="text-3xl">
              ${(totalMonthlyIncome * 12).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Income Sources</CardDescription>
            <CardTitle className="text-3xl">{incomeFlows.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <CardDescription>All your sources of income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {incomeFlows.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No income sources added yet</p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Income Source
              </Button>
            </div>
          ) : (
            incomeFlows.map((flow) => (
              <div key={flow.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">{flow.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {flow.incomeCategory?.replace(/_/g, ' ') || flow.frequency}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    ${Number(flow.monthlyAmount || 0).toLocaleString()}/mo
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${Number(flow.amount || 0).toLocaleString()} {flow.frequency}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
