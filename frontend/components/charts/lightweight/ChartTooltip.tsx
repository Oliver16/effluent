'use client';

import { cn } from '@/lib/utils';
import { TYPOGRAPHY, STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import type { TooltipData } from './types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// =============================================================================
// ENHANCED CHART TOOLTIP — Delta-First Display
// =============================================================================
//
// The tooltip now shows:
// - Absolute value
// - Delta vs baseline (if baseline series exists)
// - Delta vs previous month (trend)
// - Tone + threshold comparison
//
// This supports the Task 18 "delta-first" principle.
//
// =============================================================================

/**
 * Extended tooltip value with delta information
 */
export interface TooltipValueWithDelta {
  seriesId: string;
  seriesName: string;
  value: number;
  valueFormatted: string;
  color: string;
  /** Delta vs baseline */
  deltaBaseline?: {
    value: number;
    formatted: string;
    direction: 'up' | 'down' | 'flat';
    tone: StatusTone;
  };
  /** Delta vs previous point (trend) */
  deltaPrevious?: {
    value: number;
    formatted: string;
    direction: 'up' | 'down' | 'flat';
    tone: StatusTone;
  };
  /** Threshold comparison */
  thresholdStatus?: {
    tone: StatusTone;
    label: string;
  };
}

/**
 * Extended tooltip data with delta support
 */
export interface TooltipDataWithDeltas extends Omit<TooltipData, 'values'> {
  values: TooltipValueWithDelta[];
  /** Whether to show delta columns */
  showDeltas?: boolean;
  /** Whether to show trend indicators */
  showTrend?: boolean;
}

interface ChartTooltipProps {
  data: TooltipData | TooltipDataWithDeltas | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Show delta vs baseline column */
  showDeltas?: boolean;
  /** Show trend (delta vs previous) */
  showTrend?: boolean;
  className?: string;
}

export function ChartTooltip({
  data,
  containerRef,
  showDeltas = false,
  showTrend = false,
  className,
}: ChartTooltipProps) {
  if (!data || !containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();

  // Dynamic width based on columns shown
  const baseWidth = 180;
  const deltaWidth = showDeltas ? 80 : 0;
  const trendWidth = showTrend ? 60 : 0;
  const tooltipWidth = baseWidth + deltaWidth + trendWidth;
  const tooltipHeight = 100;

  let left = data.position.x + 16;
  let top = data.position.y - tooltipHeight / 2;

  // Flip to left side if would overflow right
  if (left + tooltipWidth > containerRect.width) {
    left = data.position.x - tooltipWidth - 16;
  }

  // Clamp vertical position
  if (top < 0) top = 0;
  if (top + tooltipHeight > containerRect.height) {
    top = containerRect.height - tooltipHeight;
  }

  // Check if we have delta data
  const hasDeltas = data.values.some(
    (v) => 'deltaBaseline' in v || 'deltaPrevious' in v
  );

  return (
    <div
      className={cn(
        'absolute pointer-events-none z-50',
        'rounded-lg border bg-card shadow-lg',
        'px-3 py-2',
        className
      )}
      style={{
        left,
        top,
        transform: 'translateY(-50%)',
        minWidth: tooltipWidth,
      }}
    >
      {/* Time header */}
      <div className={cn(TYPOGRAPHY.labelText, 'mb-2 pb-1.5 border-b border-border/50')}>
        {data.timeFormatted}
      </div>

      {/* Series values */}
      <div className="space-y-1.5">
        {data.values.map((item) => (
          <TooltipRow
            key={item.seriesId}
            item={item}
            showDeltas={showDeltas && hasDeltas}
            showTrend={showTrend && hasDeltas}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual tooltip row with delta support
 */
function TooltipRow({
  item,
  showDeltas,
  showTrend,
}: {
  item: TooltipValueWithDelta | TooltipData['values'][0];
  showDeltas: boolean;
  showTrend: boolean;
}) {
  const deltaBaseline = 'deltaBaseline' in item ? item.deltaBaseline : undefined;
  const deltaPrevious = 'deltaPrevious' in item ? item.deltaPrevious : undefined;
  const thresholdStatus = 'thresholdStatus' in item ? item.thresholdStatus : undefined;

  return (
    <div className="flex items-center gap-3">
      {/* Series indicator + name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span
          className="h-2.5 w-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: item.color }}
        />
        <span className="text-sm text-muted-foreground truncate">{item.seriesName}</span>
      </div>

      {/* Value */}
      <span className="text-sm font-semibold tabular-nums shrink-0">
        {item.valueFormatted}
      </span>

      {/* Delta vs baseline */}
      {showDeltas && deltaBaseline && (
        <DeltaIndicator
          direction={deltaBaseline.direction}
          formatted={deltaBaseline.formatted}
          tone={deltaBaseline.tone}
          label="vs baseline"
        />
      )}

      {/* Trend (delta vs previous) */}
      {showTrend && deltaPrevious && (
        <TrendIndicator
          direction={deltaPrevious.direction}
          tone={deltaPrevious.tone}
        />
      )}

      {/* Threshold status badge */}
      {thresholdStatus && (
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            STATUS_COLORS[thresholdStatus.tone].bg,
            STATUS_COLORS[thresholdStatus.tone].text
          )}
        >
          {thresholdStatus.label}
        </span>
      )}
    </div>
  );
}

/**
 * Delta indicator with direction arrow and value
 */
function DeltaIndicator({
  direction,
  formatted,
  tone,
  label,
}: {
  direction: 'up' | 'down' | 'flat';
  formatted: string;
  tone: StatusTone;
  label?: string;
}) {
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Icon className={cn('h-3 w-3', STATUS_COLORS[tone].icon)} />
      <span className={cn('text-xs tabular-nums', STATUS_COLORS[tone].text)}>
        {formatted}
      </span>
    </div>
  );
}

/**
 * Simple trend indicator (just arrow)
 */
function TrendIndicator({
  direction,
  tone,
}: {
  direction: 'up' | 'down' | 'flat';
  tone: StatusTone;
}) {
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;

  return (
    <div
      className={cn(
        'flex items-center justify-center h-5 w-5 rounded',
        STATUS_COLORS[tone].bg
      )}
    >
      <Icon className={cn('h-3 w-3', STATUS_COLORS[tone].icon)} />
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create delta information for tooltip
 */
export function createTooltipDelta(
  currentValue: number,
  compareValue: number,
  formatFn: (value: number) => string,
  higherIsBetter = true
): TooltipValueWithDelta['deltaBaseline'] {
  const delta = currentValue - compareValue;
  const direction: 'up' | 'down' | 'flat' =
    delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  let tone: StatusTone;
  if (direction === 'flat') {
    tone = 'neutral';
  } else if (higherIsBetter) {
    tone = direction === 'up' ? 'good' : 'critical';
  } else {
    tone = direction === 'down' ? 'good' : 'critical';
  }

  return {
    value: delta,
    formatted: formatFn(delta),
    direction,
    tone,
  };
}

/**
 * Enhance tooltip data with delta calculations
 */
export function enhanceTooltipWithDeltas(
  data: TooltipData,
  baselineValues: Record<string, number>,
  previousValues: Record<string, number>,
  formatFn: (value: number) => string,
  higherIsBetter = true
): TooltipDataWithDeltas {
  const enhancedValues: TooltipValueWithDelta[] = data.values.map((item) => {
    const baselineValue = baselineValues[item.seriesId];
    const previousValue = previousValues[item.seriesId];

    return {
      ...item,
      deltaBaseline: baselineValue !== undefined
        ? createTooltipDelta(item.value, baselineValue, formatFn, higherIsBetter)
        : undefined,
      deltaPrevious: previousValue !== undefined
        ? createTooltipDelta(item.value, previousValue, formatFn, higherIsBetter)
        : undefined,
    };
  });

  return {
    ...data,
    values: enhancedValues,
    showDeltas: true,
    showTrend: true,
  };
}
