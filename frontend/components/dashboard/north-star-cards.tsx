'use client'

import { StatCard } from '@/components/ui/StatCard'
import { StatCardSkeleton } from '@/components/ui/Skeletons'
import { MetricSnapshot, GoalStatusResult, GoalType, GoalStatus } from '@/lib/types'
import { goalStatusToStatus } from '@/lib/status'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'
import type { Status } from '@/components/ui/StatusBadge'

interface NorthStarCardsProps {
  metrics: MetricSnapshot | null
  goalStatus: GoalStatusResult[] | null
  isLoading?: boolean
}

interface MetricCardConfig {
  key: string
  title: string
  goalType: GoalType | null
  getValue: (m: MetricSnapshot) => string
  formatValue: (value: string) => string
  getSuffix?: () => string
  getDefaultStatus: (value: number) => Status
  getDefaultStatusLabel: (value: number) => string
}

const METRIC_CARDS: MetricCardConfig[] = [
  {
    key: 'netWorth',
    title: 'Net Worth',
    goalType: 'net_worth_target',
    getValue: (m) => m.netWorthMarket,
    formatValue: (v) => formatCurrency(v),
    getDefaultStatus: (v) => v >= 0 ? 'good' : 'warning',
    getDefaultStatusLabel: (v) => v >= 0 ? 'Positive' : 'Negative',
  },
  {
    key: 'monthlySurplus',
    title: 'Monthly Surplus',
    goalType: null,
    getValue: (m) => m.monthlySurplus,
    formatValue: (v) => formatCurrency(v),
    getDefaultStatus: (v) => v >= 0 ? 'good' : v >= -500 ? 'warning' : 'critical',
    getDefaultStatusLabel: (v) => v >= 0 ? 'Positive' : v >= -500 ? 'Tight' : 'Deficit',
  },
  {
    key: 'liquidityMonths',
    title: 'Liquidity',
    goalType: 'emergency_fund_months',
    getValue: (m) => m.liquidityMonths,
    formatValue: (v) => formatNumber(v, 1),
    getSuffix: () => 'months',
    getDefaultStatus: (v) => v >= 6 ? 'good' : v >= 3 ? 'warning' : 'critical',
    getDefaultStatusLabel: (v) => v >= 6 ? 'Good' : v >= 3 ? 'Low' : 'Critical',
  },
  {
    key: 'dscr',
    title: 'DSCR',
    goalType: 'min_dscr',
    getValue: (m) => m.dscr,
    formatValue: (v) => `${parseFloat(v).toFixed(2)}x`,
    getDefaultStatus: (v) => v >= 1.25 ? 'good' : v >= 1.0 ? 'warning' : 'critical',
    getDefaultStatusLabel: (v) => v >= 1.25 ? 'Strong' : v >= 1.0 ? 'Adequate' : 'Weak',
  },
  {
    key: 'savingsRate',
    title: 'Savings Rate',
    goalType: 'min_savings_rate',
    getValue: (m) => m.savingsRate,
    formatValue: (v) => formatPercent(v, 1),
    getDefaultStatus: (v) => v >= 0.20 ? 'good' : v >= 0.10 ? 'warning' : 'critical',
    getDefaultStatusLabel: (v) => v >= 0.20 ? 'Strong' : v >= 0.10 ? 'Moderate' : 'Low',
  },
  {
    key: 'totalDebt',
    title: 'Total Debt',
    goalType: 'debt_free_date',
    getValue: (m) => m.totalLiabilities,
    formatValue: (v) => formatCurrency(Math.abs(parseFloat(v) || 0)),
    getDefaultStatus: (v) => v <= 0 ? 'good' : 'neutral',
    getDefaultStatusLabel: (v) => v <= 0 ? 'Debt-free' : 'Active',
  },
]

function getGoalData(goalStatus: GoalStatusResult[] | null, goalType: GoalType | null) {
  if (!goalStatus || !goalType) return null
  return goalStatus.find(g => g.goalType === goalType)
}

function convertGoalStatus(status: GoalStatus): Status {
  return goalStatusToStatus(status)
}

function getStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'good':
    case 'achieved':
      return 'On Track'
    case 'warning':
      return 'At Risk'
    case 'critical':
      return 'Critical'
    default:
      return '—'
  }
}

function formatDelta(delta: string, goalType: GoalType | null): string | undefined {
  const num = parseFloat(delta)
  if (isNaN(num) || Math.abs(num) < 0.01) return undefined

  const absVal = Math.abs(num)
  const direction = num > 0 ? 'above' : 'below'

  // Format based on goal type
  if (goalType === 'emergency_fund_months') {
    return `${absVal.toFixed(1)} mo ${direction} target`
  }
  if (goalType === 'min_dscr') {
    return `${absVal.toFixed(2)} ${direction} target`
  }
  if (goalType === 'min_savings_rate') {
    return `${(absVal * 100).toFixed(1)}% ${direction} target`
  }
  if (goalType === 'net_worth_target' || goalType === 'debt_free_date') {
    return `${formatCurrency(absVal)} ${direction} target`
  }

  return undefined
}

export function NorthStarCards({ metrics, goalStatus, isLoading }: NorthStarCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {METRIC_CARDS.map((card) => (
          <StatCardSkeleton key={card.key} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {METRIC_CARDS.map((card) => {
        const rawValue = metrics ? card.getValue(metrics) : '0'
        const numValue = parseFloat(rawValue) || 0
        const formattedValue = card.formatValue(rawValue)

        // Get goal data if available
        const goal = getGoalData(goalStatus, card.goalType)

        // Determine status - use goal status if available, else compute default
        const status: Status = goal
          ? convertGoalStatus(goal.status)
          : card.getDefaultStatus(numValue)

        const statusLabel = goal
          ? getStatusLabel(goal.status)
          : card.getDefaultStatusLabel(numValue)

        // Target and delta labels
        const targetLabel = goal && goal.targetValue
          ? `Target: ${card.formatValue(goal.targetValue)}`
          : undefined

        const deltaLabel = goal && goal.deltaToTarget
          ? formatDelta(goal.deltaToTarget, card.goalType)
          : undefined

        return (
          <StatCard
            key={card.key}
            title={card.title}
            value={formattedValue}
            suffix={card.getSuffix?.()}
            status={status}
            statusLabel={statusLabel}
            targetLabel={targetLabel}
            deltaLabel={deltaLabel}
          />
        )
      })}
    </div>
  )
}
