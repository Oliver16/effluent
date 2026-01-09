'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  LayoutDashboard,
} from 'lucide-react'
import { DecisionRunResponse, DecisionSummary, DecisionMetricComparison } from '@/lib/types'

interface DecisionResultsProps {
  result: DecisionRunResponse
  onStartAnother: () => void
}

function formatValue(value: string, type: 'currency' | 'months' | 'ratio' | 'percent'): string {
  const num = parseFloat(value)
  if (isNaN(num)) return value

  switch (type) {
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
      return `${num.toFixed(1)}%`
  }
}

function MetricComparisonRow({
  label,
  baseline,
  scenario,
  type,
  higherIsBetter = true,
}: {
  label: string
  baseline: string
  scenario: string
  type: 'currency' | 'months' | 'ratio' | 'percent'
  higherIsBetter?: boolean
}) {
  const baselineNum = parseFloat(baseline)
  const scenarioNum = parseFloat(scenario)
  const diff = scenarioNum - baselineNum
  const isPositive = higherIsBetter ? diff > 0 : diff < 0
  const isNeutral = Math.abs(diff) < 0.01

  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-3 font-medium">{label}</td>
      <td className="py-3 text-right text-muted-foreground">
        {formatValue(baseline, type)}
      </td>
      <td className="py-3 text-right font-medium">
        {formatValue(scenario, type)}
      </td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {isNeutral ? (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ) : isPositive ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
          <span className={isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'}>
            {diff >= 0 ? '+' : ''}{formatValue(String(diff), type)}
          </span>
        </div>
      </td>
    </tr>
  )
}

function GoalStatusBadge({ status }: { status: string }) {
  if (status === 'good') {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        On Track
      </Badge>
    )
  }
  if (status === 'warning') {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        At Risk
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Critical
    </Badge>
  )
}

export function DecisionResults({ result, onStartAnother }: DecisionResultsProps) {
  const router = useRouter()
  const summary = result.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Scenario Created</h2>
        <p className="text-muted-foreground">
          "{result.scenarioName}" has been created with {result.changesCreated} change(s).
        </p>
      </div>

      {/* Takeaways */}
      {summary?.takeaways && summary.takeaways.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Key Takeaways</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.takeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Metric Comparison */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Baseline vs. Scenario Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-sm text-muted-foreground">Metric</th>
                  <th className="text-right py-2 font-medium text-sm text-muted-foreground">Baseline</th>
                  <th className="text-right py-2 font-medium text-sm text-muted-foreground">Scenario</th>
                  <th className="text-right py-2 font-medium text-sm text-muted-foreground">Change</th>
                </tr>
              </thead>
              <tbody>
                <MetricComparisonRow
                  label="Net Worth"
                  baseline={summary.baseline.net_worth}
                  scenario={summary.scenario.net_worth}
                  type="currency"
                />
                <MetricComparisonRow
                  label="Liquidity"
                  baseline={summary.baseline.liquidity_months}
                  scenario={summary.scenario.liquidity_months}
                  type="months"
                />
                <MetricComparisonRow
                  label="DSCR"
                  baseline={summary.baseline.dscr}
                  scenario={summary.scenario.dscr}
                  type="ratio"
                />
                <MetricComparisonRow
                  label="Savings Rate"
                  baseline={summary.baseline.savings_rate}
                  scenario={summary.scenario.savings_rate}
                  type="percent"
                />
                <MetricComparisonRow
                  label="Monthly Surplus"
                  baseline={summary.baseline.monthly_surplus}
                  scenario={summary.scenario.monthly_surplus}
                  type="currency"
                />
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Goal Status Comparison */}
      {summary?.goal_status && summary.goal_status.scenario.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Goal Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.goal_status.scenario.map((goal, index) => {
                const baselineGoal = summary.goal_status.baseline.find(g => g.goal_id === goal.goal_id)
                const statusChanged = baselineGoal && baselineGoal.status !== goal.status

                return (
                  <div
                    key={goal.goal_id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{goal.name}</p>
                      {statusChanged && (
                        <p className="text-sm text-muted-foreground">
                          Status changed from {baselineGoal?.status}
                        </p>
                      )}
                    </div>
                    <GoalStatusBadge status={goal.status} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" onClick={onStartAnother}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Model Another Decision
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/scenarios/${result.scenarioId}`}>
            View Scenario Detail
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
