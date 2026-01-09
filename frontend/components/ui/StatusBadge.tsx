import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { CheckCircle2, AlertTriangle, XCircle, Minus, Info } from 'lucide-react';

// Legacy Status type for backwards compatibility
export type Status = 'good' | 'warning' | 'critical' | 'neutral';

interface StatusBadgeProps {
  /** Status tone determines color (supports both legacy 'status' and new 'tone') */
  tone?: StatusTone;
  /** Legacy status prop for backwards compatibility */
  status?: Status;
  /** Label text to display */
  label?: string;
  /** Legacy statusLabel prop for backwards compatibility */
  statusLabel?: string;
  /** Show icon alongside label */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional classes */
  className?: string;
}

const ICONS = {
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  neutral: Minus,
  info: Info,
};

export function StatusBadge({
  tone,
  status,
  label,
  statusLabel,
  showIcon = false,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  // Support both new 'tone' and legacy 'status' props
  const effectiveTone: StatusTone = tone || status || 'neutral';
  // Support both new 'label' and legacy 'statusLabel' props
  const effectiveLabel = label || statusLabel || '';

  const colors = STATUS_COLORS[effectiveTone];
  const Icon = ICONS[effectiveTone];

  return (
    <span
      role="status"
      aria-label={`Status: ${effectiveLabel}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {showIcon && <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {effectiveLabel}
    </span>
  );
}
