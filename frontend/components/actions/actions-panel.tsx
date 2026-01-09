'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { actions as actionsApi } from '@/lib/api'
import type { ActionSuggestion, ActionCandidate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, Info, ChevronRight, Loader2, Play } from 'lucide-react'

interface ActionsPanelProps {
  className?: string
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    badgeVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    badgeVariant: 'outline' as const,
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    badgeVariant: 'secondary' as const,
  },
}

export function ActionsPanel({ className }: ActionsPanelProps) {
  const router = useRouter()
  const [actionsList, setActionsList] = useState<ActionSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedAction, setExpandedAction] = useState<string | null>(null)

  useEffect(() => {
    loadActions()
  }, [])

  const loadActions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await actionsApi.next()
      setActionsList(response.actions || [])
    } catch (err) {
      console.error('Failed to load actions:', err)
      setError('Unable to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyAction = async (
    templateId: string,
    candidate: ActionCandidate,
    actionName: string
  ) => {
    try {
      setApplying(`${templateId}-${candidate.id}`)
      const response = await actionsApi.apply(
        templateId,
        candidate.id,
        undefined,
        `${actionName}: ${candidate.name}`
      )
      // Navigate to the new scenario
      router.push(response.redirectUrl)
    } catch (err) {
      console.error('Failed to apply action:', err)
      setError('Failed to create scenario')
    } finally {
      setApplying(null)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Next Best Actions</CardTitle>
          <CardDescription>Loading recommendations...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Next Best Actions</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={loadActions}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (actionsList.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Next Best Actions</CardTitle>
          <CardDescription>You're on track! No urgent actions needed.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Next Best Actions</CardTitle>
        <CardDescription>
          Recommendations to improve your financial health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionsList.map((action) => {
          const config = severityConfig[action.severity]
          const Icon = config.icon
          const isExpanded = expandedAction === action.templateId
          const recommendedCandidate = action.candidates.find(
            c => c.id === action.recommendedCandidateId
          )

          return (
            <div
              key={action.templateId}
              className={`rounded-lg border p-4 ${config.bgColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{action.name}</h4>
                      <Badge variant={config.badgeVariant}>
                        {action.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {action.description}
                    </p>
                    {action.context && Object.keys(action.context).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {Object.entries(action.context).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key.replace(/_/g, ' ')}: <strong>{value}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedAction(isExpanded ? null : action.templateId)}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </Button>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <p className="text-sm font-medium mb-2">Choose an approach:</p>
                  {action.candidates.map((candidate) => {
                    const isRecommended = candidate.id === action.recommendedCandidateId
                    const isApplying = applying === `${action.templateId}-${candidate.id}`

                    return (
                      <div
                        key={candidate.id}
                        className={`flex items-center justify-between p-3 rounded-md bg-background ${
                          isRecommended ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{candidate.name}</span>
                            {isRecommended && (
                              <Badge variant="default" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {candidate.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Impact: {candidate.impactEstimate}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isRecommended ? 'default' : 'outline'}
                          disabled={isApplying || applying !== null}
                          onClick={() => handleApplyAction(
                            action.templateId,
                            candidate,
                            action.name
                          )}
                        >
                          {isApplying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Model This
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {!isExpanded && recommendedCandidate && (
                <div className="mt-3 flex items-center justify-end">
                  <Button
                    size="sm"
                    disabled={applying !== null}
                    onClick={() => handleApplyAction(
                      action.templateId,
                      recommendedCandidate,
                      action.name
                    )}
                  >
                    {applying === `${action.templateId}-${recommendedCandidate.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Model This
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
