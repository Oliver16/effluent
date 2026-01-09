import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/lib/design-tokens';
import { DeltaPill } from './DeltaPill';
import { deriveDeltaStatus, deriveDeltaDirection } from '@/lib/status';
import { LucideIcon } from 'lucide-react';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatRatio,
  formatMonths,
  formatNumber,
  formatCurrencySigned,
  formatPercentSigned,
} from '@/lib/format';

type MetricFormat = 'currency' | 'currency_compact' | 'percent' | 'ratio' | 'months' | 'number';

interface MetricRowProps {
  /** Row label */
  label: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Baseline value (number) */
  baseline: number;
  /** Scenario value (number) */
  scenario: number;
  /** How to format the values */
  format?: MetricFormat;
  /** Whether higher values are better (for status coloring) */
  goodDirection?: 'up' | 'down';
  /** Additional classes */
  className?: string;
}

function formatValue(value: number, format: MetricFormat): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'currency_compact':
      return formatCurrencyCompact(value);
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    case 'months':
      return formatMonths(value, true);
    default:
      return formatNumber(value);
  }
}

function formatDelta(value: number, format: MetricFormat): string {
  switch (format) {
    case 'currency':
    case 'currency_compact':
      return formatCurrencySigned(value);
    case 'percent':
      return formatPercentSigned(value);
    default:
      return value > 0 ? `+${formatValue(value, format)}` : formatValue(value, format);
  }
}

export function MetricRow({
  label,
  icon: Icon,
  baseline,
  scenario,
  format = 'currency',
  goodDirection = 'up',
  className,
}: MetricRowProps) {
  const delta = scenario - baseline;
  const direction = deriveDeltaDirection(delta);
  const tone = deriveDeltaStatus(delta, goodDirection);

  return (
    <div
      className={cn(
        'grid grid-cols-12 items-center gap-3 py-2.5 border-b border-border/40 last:border-0',
        className
      )}
    >
      {/* Label (col 1-4) */}
      <div className="col-span-4 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium truncate">{label}</span>
      </div>

      {/* Delta - PRIMARY (col 5-6) */}
      <div className="col-span-2 flex justify-end">
        <DeltaPill value={formatDelta(delta, format)} direction={direction} tone={tone} size="md" />
      </div>

      {/* Scenario value (col 7-9) */}
      <div className={cn('col-span-3 text-right', TYPOGRAPHY.tableCell, 'font-semibold')}>
        {formatValue(scenario, format)}
      </div>

      {/* Baseline value (col 10-12) */}
      <div className={cn('col-span-3 text-right', TYPOGRAPHY.tableCell, 'text-muted-foreground')}>
        {formatValue(baseline, format)}
      </div>
    </div>
  );
}

/**
 * Header row for MetricRow tables
 */
export function MetricRowHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-12 items-center gap-3 py-2 border-b border-border',
        TYPOGRAPHY.tableHeader,
        className
      )}
    >
      <div className="col-span-4">Metric</div>
      <div className="col-span-2 text-right">Change</div>
      <div className="col-span-3 text-right">Scenario</div>
      <div className="col-span-3 text-right">Baseline</div>
    </div>
  );
}
