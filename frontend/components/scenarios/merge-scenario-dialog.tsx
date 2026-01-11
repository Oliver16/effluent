'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { scenarios } from '@/lib/api'
import { ScenarioMergeResponse } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScenarioPicker } from './scenario-picker'
import {
  GitMerge,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SURFACE, STATUS_COLORS } from '@/lib/design-tokens'

interface MergeScenarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetScenarioId: string
  targetScenarioName: string
}

/**
 * MergeScenarioDialog - Combines changes from one scenario into another.
 *
 * Think of it like merging branches - you select a source scenario
 * and all its changes get copied into the target scenario.
 */
export function MergeScenarioDialog({
  open,
  onOpenChange,
  targetScenarioId,
  targetScenarioName,
}: MergeScenarioDialogProps) {
  const queryClient = useQueryClient()

  const [sourceScenarioId, setSourceScenarioId] = useState<string>('')
  const [dedupe, setDedupe] = useState(true)
  const [result, setResult] = useState<ScenarioMergeResponse | null>(null)

  const mergeMutation = useMutation({
    mutationFn: () =>
      scenarios.merge(targetScenarioId, sourceScenarioId, { dedupe, recompute: true }),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      queryClient.invalidateQueries({ queryKey: ['scenarios', targetScenarioId] })
      queryClient.invalidateQueries({ queryKey: ['scenarios', targetScenarioId, 'projections'] })

      if (data.changesCopied > 0) {
        toast.success('Scenarios combined!', {
          description: `Added ${data.changesCopied} changes to "${targetScenarioName}".`,
        })
      } else {
        toast.info('No changes to add', {
          description: 'All changes were duplicates or the source scenario was empty.',
        })
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to combine scenarios', {
        description: error.message,
      })
    },
  })

  const handleMerge = () => {
    mergeMutation.mutate()
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after close animation
    setTimeout(() => {
      setSourceScenarioId('')
      setResult(null)
    }, 200)
  }

  // Show result view after successful merge
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className={cn('p-2 rounded-full', STATUS_COLORS.good.bg)}>
                <CheckCircle className={cn('h-5 w-5', STATUS_COLORS.good.text)} />
              </div>
              <div>
                <DialogTitle>Scenarios Combined</DialogTitle>
                <DialogDescription>
                  Changes have been merged into your scenario
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {result.changesCopied}
                </div>
                <div className="text-muted-foreground">Changes added</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {result.changesSkipped}
                </div>
                <div className="text-muted-foreground">Duplicates skipped</div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Heads up:</strong> Some changes may overlap.
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Copied changes */}
            {result.copied.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Changes Added:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {result.copied.map((change) => (
                    <Badge key={change.newChangeId} variant="secondary">
                      {change.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped changes */}
            {result.skipped.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Skipped (duplicates):
                </Label>
                <div className="flex flex-wrap gap-2">
                  {result.skipped.map((change) => (
                    <Badge key={change.sourceChangeId} variant="outline">
                      {change.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.projectionRecomputed && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                Projections have been updated automatically.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <GitMerge className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Combine Scenarios</DialogTitle>
              <DialogDescription>
                Add changes from another scenario into this one
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visual merge indicator */}
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex-1 text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-muted-foreground text-xs mb-1">From</div>
              <div className="font-medium truncate">
                {sourceScenarioId ? 'Selected scenario' : 'Choose source...'}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-muted-foreground text-xs mb-1">Into</div>
              <div className="font-medium truncate">{targetScenarioName}</div>
            </div>
          </div>

          {/* Source scenario picker */}
          <div className="space-y-2">
            <Label>Select source scenario</Label>
            <ScenarioPicker
              value={sourceScenarioId}
              onValueChange={setSourceScenarioId}
              excludeIds={[targetScenarioId]}
              excludeBaseline={true}
              placeholder="Choose a scenario to combine from..."
            />
            <p className="text-sm text-muted-foreground">
              All enabled changes from the source will be copied to your scenario
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options</Label>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="dedupe"
                checked={dedupe}
                onCheckedChange={(checked) => setDedupe(checked === true)}
              />
              <div className="space-y-1">
                <label
                  htmlFor="dedupe"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Skip duplicate changes
                </label>
                <p className="text-xs text-muted-foreground">
                  Don't add changes that already exist with the same settings
                </p>
              </div>
            </div>
          </div>

          {/* Info note */}
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              This copies changes from the source scenario. The original scenario
              remains unchanged.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!sourceScenarioId || mergeMutation.isPending}
          >
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Combining...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4 mr-2" />
                Combine Scenarios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
