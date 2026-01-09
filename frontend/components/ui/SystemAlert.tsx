'use client';

import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface SystemAlertProps {
  /** Alert severity */
  tone: StatusTone;
  /** Alert title */
  title: string;
  /** Alert description */
  description?: string;
  /** Is dismissible */
  dismissible?: boolean;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Is collapsible */
  collapsible?: boolean;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional classes */
  className?: string;
}

const ICONS = {
  good: CheckCircle,
  warning: AlertTriangle,
  critical: AlertCircle,
  neutral: Info,
  info: Info,
};

export function SystemAlert({
  tone,
  title,
  description,
  dismissible = false,
  onDismiss,
  collapsible = false,
  action,
  className,
}: SystemAlertProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const colors = STATUS_COLORS[tone];
  const Icon = ICONS[tone];

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          colors.bg,
          colors.text,
          'hover:opacity-90 transition-opacity',
          className
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="font-medium">{title}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        colors.bg,
        colors.border,
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', colors.icon)} />

      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', colors.text)}>{title}</p>
        {description && (
          <p className={cn('text-sm mt-1', colors.text, 'opacity-90')}>{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn('text-sm font-medium mt-2 hover:underline', colors.text)}
          >
            {action.label}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(true)}
            className={cn('p-1 rounded hover:bg-black/5', colors.text)}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn('p-1 rounded hover:bg-black/5', colors.text)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
