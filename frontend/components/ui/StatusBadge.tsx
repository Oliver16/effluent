import { cn } from '@/lib/utils';

export type Status = 'good' | 'warning' | 'critical' | 'neutral';

const statusStyles: Record<Status, string> = {
  good: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
  neutral: 'bg-muted text-muted-foreground',
};

export function StatusBadge({
  status,
  statusLabel,
  className,
}: {
  status: Status;
  statusLabel: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={`Status: ${statusLabel}`}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {statusLabel}
    </span>
  );
}
