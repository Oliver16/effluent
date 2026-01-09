'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY, StatusTone } from '@/lib/design-tokens';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Clock, RefreshCw, LucideIcon } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

// =============================================================================
// CONTROL STRIP — Required Layout Primitive for HMI Pages
// =============================================================================
//
// The ControlStrip provides consistent context and controls at the top of every
// major page. It ensures users always know:
// - What scenario/context they're viewing
// - When data was last updated (freshness)
// - Key toggles for the view (baseline compare, time range)
// - Primary action buttons (levers)
//
// Every page template should include a ControlStrip by default.
//
// =============================================================================

/**
 * Action button configuration
 */
export interface ControlStripAction {
  /** Unique identifier */
  id: string;
  /** Button label */
  label: string;
  /** Button icon */
  icon?: LucideIcon;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  /** Is loading */
  loading?: boolean;
  /** Is disabled */
  disabled?: boolean;
}

/**
 * Toggle control configuration
 */
export interface ControlStripToggle {
  /** Unique identifier */
  id: string;
  /** Toggle label */
  label: string;
  /** Current checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Is disabled */
  disabled?: boolean;
}

/**
 * Time range options
 */
export interface TimeRangeOption {
  value: string;
  label: string;
}

/**
 * ControlStrip props
 */
export interface ControlStripProps {
  // ---------------------------------------------------------------------------
  // Context (Left Section)
  // ---------------------------------------------------------------------------
  /** Primary context label (e.g., scenario name, page title) */
  contextLabel: string;
  /** Secondary context (e.g., "vs Baseline", subtitle) */
  contextSubtitle?: string;
  /** Context status indicator */
  status?: {
    tone: StatusTone;
    label: string;
  };
  /** Context icon */
  contextIcon?: LucideIcon;

  // ---------------------------------------------------------------------------
  // Freshness (Left-Center)
  // ---------------------------------------------------------------------------
  /** Last updated timestamp */
  lastUpdated?: Date | string;
  /** Freshness tone override */
  freshnessTone?: StatusTone;
  /** Refresh handler (shows refresh button if provided) */
  onRefresh?: () => void;
  /** Is refreshing */
  isRefreshing?: boolean;

  // ---------------------------------------------------------------------------
  // Controls (Center)
  // ---------------------------------------------------------------------------
  /** Time range selector */
  timeRange?: {
    value: string;
    options: TimeRangeOption[];
    onChange: (value: string) => void;
  };
  /** Toggle controls */
  toggles?: ControlStripToggle[];
  /** Custom controls (rendered in center section) */
  customControls?: ReactNode;

  // ---------------------------------------------------------------------------
  // Actions (Right Section)
  // ---------------------------------------------------------------------------
  /** Primary actions (lever buttons) */
  actions?: ControlStripAction[];
  /** Custom actions (rendered after standard actions) */
  customActions?: ReactNode;

  // ---------------------------------------------------------------------------
  // Layout Options
  // ---------------------------------------------------------------------------
  /** Make strip sticky at top */
  sticky?: boolean;
  /** Compact mode (reduced padding) */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

export function ControlStrip({
  // Context
  contextLabel,
  contextSubtitle,
  status,
  contextIcon: ContextIcon,

  // Freshness
  lastUpdated,
  freshnessTone,
  onRefresh,
  isRefreshing,

  // Controls
  timeRange,
  toggles,
  customControls,

  // Actions
  actions,
  customActions,

  // Layout
  sticky = true,
  compact = false,
  className,
}: ControlStripProps) {
  // Derive freshness display
  const freshnessDisplay = lastUpdated
    ? {
        text: formatRelativeTime(lastUpdated),
        tone: freshnessTone ?? deriveFreshnessTone(lastUpdated),
      }
    : null;

  const hasControls = timeRange || toggles?.length || customControls;
  const hasActions = actions?.length || customActions;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        compact ? 'px-4 py-2' : 'px-4 py-2.5',
        'border-b border-border bg-card/50 backdrop-blur-sm',
        sticky && 'sticky top-0 z-10',
        className
      )}
    >
      {/* Left Section: Context + Freshness */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Context */}
        <div className="flex items-center gap-3 min-w-0">
          {ContextIcon && (
            <div className="shrink-0">
              <ContextIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={cn(TYPOGRAPHY.sectionTitle, 'truncate')}>{contextLabel}</h1>
              {status && <StatusBadge tone={status.tone} label={status.label} />}
            </div>
            {contextSubtitle && (
              <p className="text-xs text-muted-foreground truncate">{contextSubtitle}</p>
            )}
          </div>
        </div>

        {/* Freshness Indicator */}
        {freshnessDisplay && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3.5 w-3.5" />
              <span className={cn(freshnessDisplay.tone !== 'good' && getToneTextClass(freshnessDisplay.tone))}>
                {freshnessDisplay.text}
              </span>
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Center Section: Controls */}
      {hasControls && (
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          {timeRange && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Range:</span>
              <Select value={timeRange.value} onValueChange={timeRange.onChange}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRange.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Toggles */}
          {toggles?.map((toggle) => (
            <div key={toggle.id} className="flex items-center gap-2">
              <Switch
                id={toggle.id}
                checked={toggle.checked}
                onCheckedChange={toggle.onChange}
                disabled={toggle.disabled}
              />
              <Label htmlFor={toggle.id} className="text-xs cursor-pointer">
                {toggle.label}
              </Label>
            </div>
          ))}

          {/* Custom Controls */}
          {customControls}
        </div>
      )}

      {/* Right Section: Actions */}
      {hasActions && (
        <div className="flex items-center gap-2">
          {actions?.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant ?? 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className="h-8"
              >
                {Icon && (
                  <Icon
                    className={cn('h-4 w-4 mr-1.5', action.loading && 'animate-spin')}
                  />
                )}
                {action.label}
              </Button>
            );
          })}
          {customActions}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

/**
 * Default time range options
 */
export const DEFAULT_TIME_RANGES: TimeRangeOption[] = [
  { value: '12', label: '1 Year' },
  { value: '24', label: '2 Years' },
  { value: '60', label: '5 Years' },
  { value: '120', label: '10 Years' },
  { value: '360', label: '30 Years' },
];

/**
 * Create a baseline comparison toggle
 */
export function createBaselineToggle(
  checked: boolean,
  onChange: (checked: boolean) => void
): ControlStripToggle {
  return {
    id: 'baseline-compare',
    label: 'Compare Baseline',
    checked,
    onChange,
  };
}

/**
 * Create a goal lines toggle
 */
export function createGoalLinesToggle(
  checked: boolean,
  onChange: (checked: boolean) => void
): ControlStripToggle {
  return {
    id: 'goal-lines',
    label: 'Show Goals',
    checked,
    onChange,
  };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function deriveFreshnessTone(timestamp: Date | string): StatusTone {
  const d = new Date(timestamp);
  const ageMs = Date.now() - d.getTime();

  const HOUR = 1000 * 60 * 60;
  const DAY = HOUR * 24;
  const WEEK = DAY * 7;

  if (ageMs <= HOUR) return 'good';
  if (ageMs <= DAY) return 'neutral';
  if (ageMs <= WEEK) return 'warning';
  return 'critical';
}

function getToneTextClass(tone: StatusTone): string {
  const classes: Record<StatusTone, string> = {
    good: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    critical: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground',
    info: 'text-blue-600 dark:text-blue-400',
  };
  return classes[tone];
}
