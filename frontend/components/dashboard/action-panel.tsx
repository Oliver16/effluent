'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  CreditCard,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { MetricSnapshot, GoalStatusDTO } from '@/lib/types'

interface ActionPanelProps {
  metrics: MetricSnapshot | null
  goalStatus: GoalStatusDTO[] | null
  isLoading?: boolean
}

interface SuggestedAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  priority: 'high' | 'medium' | 'low'
}

export function ActionPanel({ metrics, goalStatus, isLoading }: ActionPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Suggested Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generate suggested actions based on goal status
  const actions: SuggestedAction[] = []

  if (goalStatus) {
    // Check for critical liquidity goal
    const liquidityGoal = goalStatus.find(
      g => g.goalType === 'emergency_fund_months' && g.status === 'critical'
    )
    if (liquidityGoal) {
      actions.push({
        id: 'reduce-expenses',
        title: 'Model expense reduction',
        description: 'Find ways to increase your emergency fund',
        icon: <TrendingDown className="h-4 w-4" />,
        href: '/decisions?template=add_expense',
        priority: 'high',
      })
    }

    // Check for low DSCR
    const dscrGoal = goalStatus.find(
      g => g.goalType === 'min_dscr' && (g.status === 'critical' || g.status === 'warning')
    )
    if (dscrGoal) {
      actions.push({
        id: 'payoff-debt',
        title: 'Model debt payoff',
        description: 'See how paying off debt impacts your safety ratio',
        icon: <CreditCard className="h-4 w-4" />,
        href: '/decisions?template=payoff_debt',
        priority: dscrGoal.status === 'critical' ? 'high' : 'medium',
      })
    }

    // Check for low savings rate
    const savingsGoal = goalStatus.find(
      g => g.goalType === 'min_savings_rate' && (g.status === 'critical' || g.status === 'warning')
    )
    if (savingsGoal) {
      actions.push({
        id: 'increase-savings',
        title: 'Increase 401k contribution',
        description: 'Boost your savings rate with retirement contributions',
        icon: <PiggyBank className="h-4 w-4" />,
        href: '/decisions?template=change_401k',
        priority: 'medium',
      })
    }
  }

  // Add default actions if we don't have any goal-based ones
  if (actions.length === 0) {
    actions.push(
      {
        id: 'model-income',
        title: 'Model income change',
        description: 'See how a raise or new income affects your finances',
        icon: <TrendingUp className="h-4 w-4" />,
        href: '/decisions?template=increase_income',
        priority: 'low',
      },
      {
        id: 'model-savings',
        title: 'Start a savings goal',
        description: 'Build toward a specific financial target',
        icon: <Wallet className="h-4 w-4" />,
        href: '/decisions?template=start_savings',
        priority: 'low',
      }
    )
  }

  // Sort by priority and take top 3
  const sortedActions = actions
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    .slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Suggested Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedActions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-3"
              asChild
            >
              <Link href={action.href}>
                <div className="flex items-start gap-3 w-full">
                  <div className={`p-2 rounded-lg ${
                    action.priority === 'high'
                      ? 'bg-red-100 text-red-600'
                      : action.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground self-center" />
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
