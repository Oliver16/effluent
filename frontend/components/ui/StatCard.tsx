import { SectionCard } from '@/components/layout/SectionCard';
import { StatusBadge, Status } from './StatusBadge';
import { MetricValue } from './MetricValue';
import { cn } from '@/lib/utils';

export function StatCard({
  title,
  value,
  suffix,
  status,
  statusLabel,
  targetLabel,
  deltaLabel,
  sparkline,
  onClick,
  className,
}: {
  title: string;
  value: string | number;
  suffix?: string;
  status: Status;
  statusLabel: string;
  targetLabel?: string;
  deltaLabel?: string;
  sparkline?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const isClickable = Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <SectionCard
      dense
      className={cn(
        isClickable && 'cursor-pointer hover:bg-muted/30 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
    >
      <div
        className="flex items-start justify-between gap-3"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={isClickable ? `${title}: ${value}. Status: ${statusLabel}` : undefined}
      >
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate">{title}</h3>
            <StatusBadge status={status} statusLabel={statusLabel} />
          </div>
          <MetricValue value={value} suffix={suffix} />
          {(targetLabel || deltaLabel) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {targetLabel ? <span>{targetLabel}</span> : null}
              {targetLabel && deltaLabel ? <span aria-hidden>•</span> : null}
              {deltaLabel ? <span>{deltaLabel}</span> : null}
            </div>
          )}
        </div>
        {sparkline ? <div className="w-24 flex-shrink-0">{sparkline}</div> : null}
      </div>
    </SectionCard>
  );
}
