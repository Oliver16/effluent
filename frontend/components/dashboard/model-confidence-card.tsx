'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { DataQualityResponse, DataQualityIssue } from '@/lib/types'

interface ModelConfidenceCardProps {
  report: DataQualityResponse | null
  isLoading?: boolean
}

export function ModelConfidenceCard({ report, isLoading }: ModelConfidenceCardProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Model Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-2 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return null
  }

  const confidencePercent = Math.round(report.confidenceScore * 100)
  const allIssues = [...report.issues, ...report.warnings]
  const hasIssues = allIssues.length > 0

  const getConfidenceBadgeVariant = () => {
    switch (report.confidenceTier) {
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getConfidenceColor = () => {
    switch (report.confidenceTier) {
      case 'high':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const handleIssueClick = () => {
    // Navigate to settings page
    router.push('/settings')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Model Confidence</CardTitle>
          <Badge variant={getConfidenceBadgeVariant()}>
            {report.confidenceTier.charAt(0).toUpperCase() + report.confidenceTier.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence Score</span>
            <span className={getConfidenceColor()}>{confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} className="h-2" />
        </div>

        {!hasIssues ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Model confidence is high</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {allIssues.length} item{allIssues.length !== 1 ? 's' : ''} need{allIssues.length === 1 ? 's' : ''} attention
            </p>
            <div className="space-y-2">
              {allIssues.slice(0, 3).map((issue, index) => (
                <div
                  key={`${issue.field}-${index}`}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                >
                  {issue.severity === 'critical' ? (
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{issue.message}</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={handleIssueClick}
                    >
                      Fix
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {allIssues.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{allIssues.length - 3} more items
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
