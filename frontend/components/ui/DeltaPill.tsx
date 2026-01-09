import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface DeltaPillProps {
  /** Formatted value string (e.g., "+$1,234" or "-5.2%") */
  value: string;
  /** Direction of change */
  direction: 'up' | 'down' | 'flat';
  /** Status tone for coloring */
  tone: StatusTone;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional classes */
  className?: string;
}

export function DeltaPill({
  value,
  direction,
  tone,
  size = 'sm',
  className,
}: DeltaPillProps) {
  const colors = STATUS_COLORS[tone];
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-0.5',
    md: 'px-2.5 py-1 text-sm gap-1',
    lg: 'px-3 py-1.5 text-base gap-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium tabular-nums',
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn('shrink-0', iconSizes[size])} aria-hidden />
      <span>{value}</span>
    </span>
  );
}
