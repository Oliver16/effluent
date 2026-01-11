'use client';

import { cn } from '@/lib/utils';
import { TYPOGRAPHY, StatusTone } from '@/lib/design-tokens';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Play, Plus, Sparkles, Loader2, GitMerge } from 'lucide-react';

interface ScenarioContextBarProps {
  /** Current scenario name */
  scenarioName: string;
  /** Baseline name (for comparison context) */
  baselineName?: string;
  /** Overall scenario status */
  status?: {
    tone: StatusTone;
    label: string;
  };
  /** Run projection handler */
  onRunProjection?: () => void;
  /** Add change handler */
  onAddChange?: () => void;
  /** Life event handler */
  onLifeEvent?: () => void;
  /** Merge scenarios handler */
  onMerge?: () => void;
  /** Is projection running */
  isRunning?: boolean;
  /** Is this the baseline scenario (hides certain actions) */
  isBaseline?: boolean;
  /** Additional classes */
  className?: string;
}

export function ScenarioContextBar({
  scenarioName,
  baselineName,
  status,
  onRunProjection,
  onAddChange,
  onLifeEvent,
  onMerge,
  isRunning = false,
  isBaseline = false,
  className,
}: ScenarioContextBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2.5',
        'border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10',
        className
      )}
    >
      {/* Left: Scenario context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className={cn(TYPOGRAPHY.sectionTitle, 'truncate')}>{scenarioName}</h1>
            {status && <StatusBadge tone={status.tone} label={status.label} />}
          </div>
          {baselineName && (
            <p className="text-xs text-muted-foreground">vs {baselineName}</p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Merge button - only for non-baseline scenarios */}
        {onMerge && !isBaseline && (
          <Button variant="outline" size="sm" onClick={onMerge} className="h-8">
            <GitMerge className="h-4 w-4 mr-1.5" />
            Combine
          </Button>
        )}
        {onLifeEvent && (
          <Button variant="outline" size="sm" onClick={onLifeEvent} className="h-8">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Life Event
          </Button>
        )}
        {onAddChange && (
          <Button variant="outline" size="sm" onClick={onAddChange} className="h-8">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Change
          </Button>
        )}
        {onRunProjection && (
          <Button size="sm" onClick={onRunProjection} disabled={isRunning} className="h-8">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Computing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1.5" />
                Run Projection
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
