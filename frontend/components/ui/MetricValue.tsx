import { cn } from '@/lib/utils';

export function MetricValue({
  value,
  suffix,
  className,
}: {
  value: string | number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline gap-1 tabular-nums', className)}>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}
