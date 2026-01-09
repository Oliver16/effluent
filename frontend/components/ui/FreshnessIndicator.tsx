import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/design-tokens';
import { formatRelativeTime } from '@/lib/format';
import { deriveFreshnessStatus } from '@/lib/status';
import { RefreshCw } from 'lucide-react';

interface FreshnessIndicatorProps {
  /** Last update timestamp */
  lastUpdated: Date | string | number;
  /** Show as dot only (no text) */
  dotOnly?: boolean;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Additional classes */
  className?: string;
}

export function FreshnessIndicator({
  lastUpdated,
  dotOnly = false,
  showRefresh = false,
  onRefresh,
  className,
}: FreshnessIndicatorProps) {
  const { tone, label } = deriveFreshnessStatus(lastUpdated);
  const colors = STATUS_COLORS[tone];

  if (dotOnly) {
    return (
      <span
        className={cn('inline-block h-2 w-2 rounded-full', colors.bgSolid, className)}
        title={`${label}: ${formatRelativeTime(lastUpdated)}`}
      />
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', colors.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.bgSolid)} />
      <span>{formatRelativeTime(lastUpdated)}</span>
      {showRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className="p-0.5 hover:bg-muted rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
