'use client';

import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/lib/design-tokens';
import type { TooltipData } from './types';

interface ChartTooltipProps {
  data: TooltipData | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export function ChartTooltip({ data, containerRef, className }: ChartTooltipProps) {
  if (!data || !containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();

  // Position tooltip to avoid overflow
  const tooltipWidth = 200;
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

  return (
    <div
      className={cn(
        'absolute pointer-events-none z-50',
        'rounded-lg border bg-card shadow-lg',
        'px-3 py-2 min-w-[180px]',
        className
      )}
      style={{
        left,
        top,
        transform: 'translateY(-50%)',
      }}
    >
      {/* Time header */}
      <div className={cn(TYPOGRAPHY.labelText, 'mb-2 pb-1.5 border-b border-border/50')}>
        {data.timeFormatted}
      </div>

      {/* Series values */}
      <div className="space-y-1.5">
        {data.values.map((item) => (
          <div key={item.seriesId} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground truncate">{item.seriesName}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{item.valueFormatted}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
