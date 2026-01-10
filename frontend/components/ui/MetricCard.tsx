import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY, STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { StatusBadge } from './StatusBadge';
import { DeltaPill } from './DeltaPill';
import { MetricExplainer } from '@/components/help';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  /** Metric label */
  label: string;
  /** Formatted value */
  value: string;
  /** Status tone */
  tone?: StatusTone;
  /** Status label (e.g., "Healthy", "Critical") */
  statusLabel?: string;
  /** Delta from previous/baseline */
  delta?: {
    value: string;
    direction: 'up' | 'down' | 'flat';
    tone: StatusTone;
  };
  /** Optional icon */
  icon?: LucideIcon;
  /** Click handler (makes card interactive) */
  onClick?: () => void;
  /** Additional classes */
  className?: string;
  /** Metric key for help explanation (e.g., 'liquidityMonths', 'savingsRate') */
  metricKey?: string;
  /** Raw numeric value for contextual interpretation */
  rawValue?: number;
}

export function MetricCard({
  label,
  value,
  tone = 'neutral',
  statusLabel,
  delta,
  icon: Icon,
  onClick,
  className,
  metricKey,
  rawValue,
}: MetricCardProps) {
  const isInteractive = !!onClick;
  const colors = STATUS_COLORS[tone];

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={cn(
        SURFACE.card,
        'p-4',
        // Left border indicator for status
        tone !== 'neutral' && `border-l-2 ${colors.border.replace('border-', 'border-l-')}`,
        isInteractive && 'cursor-pointer hover:bg-muted/30 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className
      )}
    >
      {/* Header: Label + Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn('p-1.5 rounded-lg', colors.bg)}>
              <Icon className={cn('h-4 w-4', colors.icon)} />
            </div>
          )}
          <span className={TYPOGRAPHY.metricLabel}>{label}</span>
          {metricKey && (
            <MetricExplainer
              metricKey={metricKey}
              currentValue={rawValue}
              size="sm"
            />
          )}
        </div>
        {statusLabel && <StatusBadge tone={tone} label={statusLabel} />}
      </div>

      {/* Value */}
      <div className={cn(TYPOGRAPHY.metricValue, 'mb-1')}>{value}</div>

      {/* Delta (if provided) */}
      {delta && (
        <div className="flex items-center gap-1">
          <DeltaPill value={delta.value} direction={delta.direction} tone={delta.tone} />
          <span className="text-xs text-muted-foreground">vs baseline</span>
        </div>
      )}
    </div>
  );
}
