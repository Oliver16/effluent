'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeaderHelpButton } from '@/components/help'
import { Target, Lightbulb, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { GoalStatusResult } from '@/lib/types'

interface DashboardHeaderProps {
  goalStatus: GoalStatusResult[] | null
  isLoading?: boolean
}

export function DashboardHeader({ goalStatus, isLoading }: DashboardHeaderProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const buildStatusSentence = () => {
    if (!goalStatus || goalStatus.length === 0) {
      return null
    }

    // Group by status
    const critical = goalStatus.filter(g => g.status === 'critical')
    const warning = goalStatus.filter(g => g.status === 'warning')
    const onTrack = goalStatus.filter(g => g.status === 'good' || g.status === 'achieved')

    const parts = []

    if (critical.length > 0) {
      parts.push(
        <span key="critical" className="inline-flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600 font-medium">{critical.length} critical</span>
        </span>
      )
    }

    if (warning.length > 0) {
      parts.push(
        <span key="warning" className="inline-flex items-center gap-1">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-600 font-medium">{warning.length} need attention</span>
        </span>
      )
    }

    if (onTrack.length > 0) {
      parts.push(
        <span key="onTrack" className="inline-flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-600 font-medium">{onTrack.length} on track</span>
        </span>
      )
    }

    return parts
  }

  const statusParts = buildStatusSentence()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-tour="dashboard-header">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {isLoading ? (
          <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        ) : statusParts && statusParts.length > 0 ? (
          <div className="flex items-center gap-3 text-sm">
            {statusParts.map((part, idx) => (
              <span key={idx}>
                {idx > 0 && <span className="text-muted-foreground mx-1">•</span>}
                {part}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set goals to track your financial health
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <HeaderHelpButton module="dashboard" />
        <Button variant="outline" size="sm" asChild>
          <Link href="/goals">
            <Target className="h-4 w-4 mr-2" />
            Edit Goals
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/decisions">
            <Lightbulb className="h-4 w-4 mr-2" />
            Model a Decision
          </Link>
        </Button>
      </div>
    </div>
  )
}
