'use client';

import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY, StatusTone } from '@/lib/design-tokens';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FreshnessIndicator } from '@/components/ui/FreshnessIndicator';
import { DeltaPill } from '@/components/ui/DeltaPill';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrencyCompact } from '@/lib/format';
import { deriveDeltaDirection, deriveDeltaStatus } from '@/lib/status';

interface ScenarioTileProps {
  /** Scenario ID */
  id: string;
  /** Scenario name */
  name: string;
  /** Description or source */
  description?: string;
  /** Is this the baseline scenario */
  isBaseline?: boolean;
  /** Projection horizon in months */
  horizonMonths: number;
  /** Last projection run time */
  lastRun?: Date | string;
  /** Overall status */
  status?: {
    tone: StatusTone;
    label: string;
  };
  /** Key metrics */
  metrics?: {
    netWorth?: number;
    netWorthDelta?: number;
    surplus?: number;
    surplusDelta?: number;
    liquidity?: number;
  };
  /** Is selected for comparison */
  isSelected?: boolean;
  /** Selection change handler */
  onSelectionChange?: (selected: boolean) => void;
  /** Open scenario handler */
  onOpen: () => void;
  /** Additional classes */
  className?: string;
}

export function ScenarioTile({
  id,
  name,
  description,
  isBaseline = false,
  horizonMonths,
  lastRun,
  status,
  metrics,
  isSelected = false,
  onSelectionChange,
  onOpen,
  className,
}: ScenarioTileProps) {
  return (
    <div
      className={cn(
        SURFACE.card,
        'p-4 relative',
        isBaseline && 'bg-muted/30 border-primary/20',
        isSelected && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Selection checkbox */}
      {onSelectionChange && !isBaseline && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(!!checked)}
          className="absolute top-3 right-3"
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(TYPOGRAPHY.sectionTitle, 'truncate')}>{name}</h3>
            {isBaseline && (
              <StatusBadge tone="info" label="Baseline" />
            )}
            {status && !isBaseline && (
              <StatusBadge tone={status.tone} label={status.label} />
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      {metrics && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Net Worth */}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Net Worth</div>
            <div className="text-sm font-semibold tabular-nums">
              {metrics.netWorth !== undefined ? formatCurrencyCompact(metrics.netWorth) : '—'}
            </div>
            {metrics.netWorthDelta !== undefined && !isBaseline && (
              <DeltaPill
                value={formatCurrencyCompact(Math.abs(metrics.netWorthDelta))}
                direction={deriveDeltaDirection(metrics.netWorthDelta)}
                tone={deriveDeltaStatus(metrics.netWorthDelta, 'up')}
                size="sm"
              />
            )}
          </div>

          {/* Surplus */}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Surplus</div>
            <div className="text-sm font-semibold tabular-nums">
              {metrics.surplus !== undefined ? formatCurrencyCompact(metrics.surplus) : '—'}
            </div>
            {metrics.surplusDelta !== undefined && !isBaseline && (
              <DeltaPill
                value={formatCurrencyCompact(Math.abs(metrics.surplusDelta))}
                direction={deriveDeltaDirection(metrics.surplusDelta)}
                tone={deriveDeltaStatus(metrics.surplusDelta, 'up')}
                size="sm"
              />
            )}
          </div>

          {/* Liquidity */}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Liquidity</div>
            <div className="text-sm font-semibold tabular-nums">
              {metrics.liquidity !== undefined ? `${metrics.liquidity.toFixed(1)} mo` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{horizonMonths}mo horizon</span>
          {lastRun && (
            <>
              <span>•</span>
              <FreshnessIndicator lastUpdated={lastRun} />
            </>
          )}
        </div>

        <Button size="sm" onClick={onOpen} className="h-7">
          {isBaseline ? 'View' : 'Open'}
        </Button>
      </div>
    </div>
  );
}
