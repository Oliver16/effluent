'use client'

import Link from 'next/link'
import { SectionCard } from '@/components/layout/SectionCard'
import { StatusBadge, Status } from '@/components/ui/StatusBadge'
import { SidebarCardSkeleton } from '@/components/ui/Skeletons'
import {
  ArrowRight,
  CreditCard,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { MetricSnapshot, GoalStatusResult } from '@/lib/types'

interface ActionPanelProps {
  metrics: MetricSnapshot | null
  goalStatus: GoalStatusResult[] | null
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

const priorityToStatus: Record<string, Status> = {
  high: 'critical',
  medium: 'warning',
  low: 'neutral',
}

const priorityLabel: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function ActionPanel({ metrics, goalStatus, isLoading }: ActionPanelProps) {
  if (isLoading) {
    return <SidebarCardSkeleton />
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
    <SectionCard dense title="Suggested Actions">
      <div className="space-y-2">
        {sortedActions.map((action) => (
          <Link
            key={action.id}
            href={action.href as '/decisions'}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className={`p-2 rounded-lg ${
              action.priority === 'high'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : action.priority === 'medium'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-primary/10 text-primary'
            }`}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{action.title}</p>
                <StatusBadge
                  status={priorityToStatus[action.priority]}
                  statusLabel={priorityLabel[action.priority]}
                  className="flex-shrink-0"
                />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {action.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </Link>
        ))}
      </div>
    </SectionCard>
  )
}
