'use client'

import { useRouter } from 'next/navigation'
import { SectionCard } from '@/components/layout/SectionCard'
import { StatusBadge, Status } from '@/components/ui/StatusBadge'
import { SidebarCardSkeleton } from '@/components/ui/Skeletons'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { DataQualityResponse, DataQualityIssue } from '@/lib/types'

interface ModelConfidenceCardProps {
  report: DataQualityResponse | null
  isLoading?: boolean
}

function getConfidenceStatus(level: string): Status {
  switch (level) {
    case 'high':
      return 'good'
    case 'medium':
      return 'warning'
    case 'low':
      return 'critical'
    default:
      return 'neutral'
  }
}

function getStatusLabel(level: string): string {
  switch (level) {
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    default:
      return '—'
  }
}

export function ModelConfidenceCard({ report, isLoading }: ModelConfidenceCardProps) {
  const router = useRouter()

  if (isLoading) {
    return <SidebarCardSkeleton />
  }

  if (!report) {
    return null
  }

  const confidencePercent = Math.round(report.confidenceScore * 100)
  const status = getConfidenceStatus(report.confidenceTier)
  const statusLabel = getStatusLabel(report.confidenceTier)

  const allIssues = [...report.issues, ...report.warnings]
  const hasIssues = allIssues.length > 0

  const handleIssueClick = (issue: DataQualityIssue) => {
    if (issue.accountId) {
      router.push(`/accounts/${issue.accountId}` as '/accounts')
    } else if (issue.sourceId) {
      router.push(`/flows?source=${issue.sourceId}` as '/flows')
    } else {
      router.push('/settings')
    }
  }

  return (
    <SectionCard dense title="Model Confidence">
      <div className="space-y-3">
        {/* Score display */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {confidencePercent}%
          </span>
          <StatusBadge status={status} statusLabel={statusLabel} />
        </div>

        {/* Progress bar */}
        <Progress value={confidencePercent} className="h-2" />

        {/* Status message or issues */}
        {!hasIssues ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Model confidence is high</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {allIssues.length} item{allIssues.length !== 1 ? 's' : ''} need{allIssues.length === 1 ? 's' : ''} attention
            </p>
            <div className="space-y-1.5">
              {allIssues.slice(0, 3).map((issue, index) => (
                <button
                  key={`${issue.field}-${index}`}
                  onClick={() => handleIssueClick(issue)}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50 w-full text-left hover:bg-muted transition-colors"
                >
                  {issue.severity === 'critical' ? (
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{issue.message}</p>
                    <span className="text-xs text-primary flex items-center gap-1">
                      Fix
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {allIssues.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{allIssues.length - 3} more items
              </p>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  )
}
