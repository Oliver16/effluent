'use client';

import { cn } from '@/lib/utils';
import type { PriceLineConfig, SeriesConfig } from './types';

interface ChartLegendProps {
  /** Series configurations */
  series?: SeriesConfig[];
  /** Price lines (goals) */
  priceLines?: PriceLineConfig[];
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Additional class name */
  className?: string;
}

export function ChartLegend({
  series = [],
  priceLines = [],
  orientation = 'horizontal',
  className,
}: ChartLegendProps) {
  const hasItems = series.length > 0 || priceLines.length > 0;

  if (!hasItems) return null;

  return (
    <div
      className={cn(
        'flex gap-4 text-xs text-muted-foreground',
        orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row flex-wrap',
        className
      )}
    >
      {/* Series */}
      {series.map((s) => (
        <div key={s.id} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
          <span>{s.name}</span>
        </div>
      ))}

      {/* Price lines */}
      {priceLines.map((line) => (
        <div key={line.id} className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4"
            style={{
              backgroundColor: line.color,
              backgroundImage:
                line.lineStyle === 'dashed'
                  ? `repeating-linear-gradient(90deg, ${line.color} 0, ${line.color} 4px, transparent 4px, transparent 8px)`
                  : undefined,
            }}
          />
          <span>{line.label}</span>
        </div>
      ))}
    </div>
  );
}
