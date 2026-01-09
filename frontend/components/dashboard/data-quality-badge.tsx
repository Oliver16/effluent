'use client'

import { useState, useEffect } from 'react'
import { dataQuality } from '@/lib/api'
import type { DataQualityResponse } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'

interface DataQualityBadgeProps {
  className?: string
}

const tierConfig = {
  high: {
    icon: CheckCircle,
    color: 'text-green-600',
    variant: 'outline' as const,
    label: 'High Confidence',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    variant: 'outline' as const,
    label: 'Medium Confidence',
  },
  low: {
    icon: AlertCircle,
    color: 'text-red-600',
    variant: 'destructive' as const,
    label: 'Low Confidence',
  },
}

export function DataQualityBadge({ className }: DataQualityBadgeProps) {
  const [data, setData] = useState<DataQualityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadDataQuality()
  }, [])

  const loadDataQuality = async () => {
    try {
      setLoading(true)
      const response = await dataQuality.report()
      setData(response)
    } catch (err) {
      console.error('Failed to load data quality:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Badge variant="outline" className={className}>
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        Loading...
      </Badge>
    )
  }

  if (!data) {
    return null
  }

  const config = tierConfig[data.confidenceTier]
  const Icon = config.icon
  const hasIssues = data.issues.length > 0 || data.warnings.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-auto py-1 px-2 ${className}`}
        >
          <Badge variant={config.variant} className="gap-1">
            <Icon className={`h-3 w-3 ${config.color}`} />
            <span>{data.confidenceScore}%</span>
            <span className="hidden sm:inline">{config.label}</span>
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Data Quality</h4>
            <p className="text-sm text-muted-foreground">{data.tierDescription}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">Assets:</span>
              <span className="ml-1 font-medium">{data.summary.assetAccounts}</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">Liabilities:</span>
              <span className="ml-1 font-medium">{data.summary.liabilityAccounts}</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">Income:</span>
              <span className="ml-1 font-medium">{data.summary.incomeSources}</span>
            </div>
            <div className="bg-muted rounded p-2">
              <span className="text-muted-foreground">Expenses:</span>
              <span className="ml-1 font-medium">{data.summary.expenseFlows}</span>
            </div>
          </div>

          {hasIssues && (
            <div className="space-y-2">
              {data.issues.map((issue, idx) => (
                <div
                  key={`issue-${idx}`}
                  className="flex items-start gap-2 text-sm"
                >
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{issue.message}</span>
                </div>
              ))}
              {data.warnings.map((warning, idx) => (
                <div
                  key={`warning-${idx}`}
                  className="flex items-start gap-2 text-sm"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {!hasIssues && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>All data looks complete!</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
