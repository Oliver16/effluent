'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetricSnapshot, GoalStatusResult, GoalType } from '@/lib/types'
import { DollarSign, Calendar, TrendingUp, TrendingDown, Minus, Shield, PiggyBank, Wallet } from 'lucide-react'

interface NorthStarCardsProps {
  metrics: MetricSnapshot | null
  goalStatus: GoalStatusResult[] | null
  isLoading?: boolean
}

interface MetricCardData {
  key: string
  title: string
  icon: React.ReactNode
  getValue: (m: MetricSnapshot) => string
  getTarget: (goals: GoalStatusResult[]) => string | null
  getDelta: (goals: GoalStatusResult[]) => string | null
  getStatus: (goals: GoalStatusResult[]) => 'good' | 'warning' | 'critical' | null
  format: 'currency' | 'months' | 'ratio' | 'percent'
  goalType: GoalType | null
}

const METRIC_CARDS: MetricCardData[] = [
  {
    key: 'netWorth',
    title: 'Net Worth',
    icon: <DollarSign className="h-4 w-4" />,
    getValue: (m) => m.netWorthMarket,
    getTarget: (goals) => {
      const goal = goals.find(g => g.goalType === 'net_worth_target')
      return goal ? goal.targetValue : null
    },
    getDelta: (goals) => {
      const goal = goals.find(g => g.goalType === 'net_worth_target')
      return goal ? goal.deltaToTarget : null
    },
    getStatus: (goals) => {
      const goal = goals.find(g => g.goalType === 'net_worth_target')
      return goal ? (goal.status as 'good' | 'warning' | 'critical') : null
    },
    format: 'currency',
    goalType: 'net_worth_target',
  },
  {
    key: 'monthlySurplus',
    title: 'Monthly Surplus',
    icon: <Wallet className="h-4 w-4" />,
    getValue: (m) => m.monthlySurplus,
    getTarget: () => null,
    getDelta: () => null,
    getStatus: () => null,
    format: 'currency',
    goalType: null,
  },
  {
    key: 'liquidityMonths',
    title: 'Liquidity',
    icon: <Calendar className="h-4 w-4" />,
    getValue: (m) => m.liquidityMonths,
    getTarget: (goals) => {
      const goal = goals.find(g => g.goalType === 'emergency_fund_months')
      return goal ? goal.targetValue : null
    },
    getDelta: (goals) => {
      const goal = goals.find(g => g.goalType === 'emergency_fund_months')
      return goal ? goal.deltaToTarget : null
    },
    getStatus: (goals) => {
      const goal = goals.find(g => g.goalType === 'emergency_fund_months')
      return goal ? (goal.status as 'good' | 'warning' | 'critical') : null
    },
    format: 'months',
    goalType: 'emergency_fund_months',
  },
  {
    key: 'dscr',
    title: 'DSCR',
    icon: <Shield className="h-4 w-4" />,
    getValue: (m) => m.dscr,
    getTarget: (goals) => {
      const goal = goals.find(g => g.goalType === 'min_dscr')
      return goal ? goal.targetValue : null
    },
    getDelta: (goals) => {
      const goal = goals.find(g => g.goalType === 'min_dscr')
      return goal ? goal.deltaToTarget : null
    },
    getStatus: (goals) => {
      const goal = goals.find(g => g.goalType === 'min_dscr')
      return goal ? (goal.status as 'good' | 'warning' | 'critical') : null
    },
    format: 'ratio',
    goalType: 'min_dscr',
  },
  {
    key: 'savingsRate',
    title: 'Savings Rate',
    icon: <PiggyBank className="h-4 w-4" />,
    getValue: (m) => m.savingsRate,
    getTarget: (goals) => {
      const goal = goals.find(g => g.goalType === 'min_savings_rate')
      return goal ? goal.targetValue : null
    },
    getDelta: (goals) => {
      const goal = goals.find(g => g.goalType === 'min_savings_rate')
      return goal ? goal.deltaToTarget : null
    },
    getStatus: (goals) => {
      const goal = goals.find(g => g.goalType === 'min_savings_rate')
      return goal ? (goal.status as 'good' | 'warning' | 'critical') : null
    },
    format: 'percent',
    goalType: 'min_savings_rate',
  },
]

function formatValue(value: string, format: MetricCardData['format']): string {
  const num = parseFloat(value)
  if (isNaN(num)) return value

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num)
    case 'months':
      return `${num.toFixed(1)} mo`
    case 'ratio':
      return `${num.toFixed(2)}x`
    case 'percent':
      // Backend returns ratio (0.10 for 10%), multiply by 100 for display
      return `${(num * 100).toFixed(1)}%`
    default:
      return value
  }
}

function formatDelta(delta: string, format: MetricCardData['format']): string {
  const num = parseFloat(delta)
  if (isNaN(num)) return delta

  const prefix = num >= 0 ? '+' : ''

  switch (format) {
    case 'currency':
      return `${prefix}${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num)}`
    case 'months':
      return `${prefix}${num.toFixed(1)} mo`
    case 'ratio':
      return `${prefix}${num.toFixed(2)}`
    case 'percent':
      // Backend returns ratio (0.10 for 10%), multiply by 100 for display
      return `${prefix}${(num * 100).toFixed(1)}%`
    default:
      return delta
  }
}

function MetricCard({
  card,
  metrics,
  goalStatus,
  isLoading,
}: {
  card: MetricCardData
  metrics: MetricSnapshot | null
  goalStatus: GoalStatusResult[] | null
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          <div className="h-4 w-4 text-muted-foreground">{card.icon}</div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const value = metrics ? card.getValue(metrics) : 'N/A'
  const target = goalStatus ? card.getTarget(goalStatus) : null
  const delta = goalStatus ? card.getDelta(goalStatus) : null
  const status = goalStatus ? card.getStatus(goalStatus) : null

  const deltaNum = delta ? parseFloat(delta) : 0

  const getStatusBadgeVariant = () => {
    switch (status) {
      case 'good':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'critical':
        return 'destructive'
      default:
        return undefined
    }
  }

  const getDeltaIcon = () => {
    if (!delta) return null
    if (deltaNum > 0) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (deltaNum < 0) return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{card.icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value, card.format)}</div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {target && <span>Target: {formatValue(target, card.format)}</span>}
          </div>
          {status && (
            <Badge variant={getStatusBadgeVariant()} className="text-xs">
              {status === 'good' ? 'On Track' : status === 'warning' ? 'At Risk' : 'Critical'}
            </Badge>
          )}
        </div>
        {delta && (
          <div className="flex items-center gap-1 text-xs mt-1">
            {getDeltaIcon()}
            <span className={deltaNum >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatDelta(delta, card.format)} to target
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function NorthStarCards({ metrics, goalStatus, isLoading }: NorthStarCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {METRIC_CARDS.map((card) => (
        <MetricCard
          key={card.key}
          card={card}
          metrics={metrics}
          goalStatus={goalStatus}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
