'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { TimeRangePreset, SeriesConfig } from './types';

interface ChartControlsProps {
  /** Current time range preset */
  timeRange: TimeRangePreset;
  /** Time range change handler */
  onTimeRangeChange: (range: TimeRangePreset) => void;
  /** Series configurations (for toggles) */
  series?: SeriesConfig[];
  /** Series visibility state */
  seriesVisibility?: Record<string, boolean>;
  /** Series visibility change handler */
  onSeriesVisibilityChange?: (seriesId: string, visible: boolean) => void;
  /** Zoom in handler */
  onZoomIn?: () => void;
  /** Zoom out handler */
  onZoomOut?: () => void;
  /** Reset zoom handler */
  onResetZoom?: () => void;
  /** Show zoom controls */
  showZoomControls?: boolean;
  /** Additional class name */
  className?: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRangePreset; label: string }[] = [
  { value: '1Y', label: '1Y' },
  { value: '2Y', label: '2Y' },
  { value: '5Y', label: '5Y' },
  { value: '10Y', label: '10Y' },
  { value: 'ALL', label: 'All' },
];

export function ChartControls({
  timeRange,
  onTimeRangeChange,
  series,
  seriesVisibility,
  onSeriesVisibilityChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  showZoomControls = false,
  className,
}: ChartControlsProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Left: Series toggles */}
      <div className="flex items-center gap-3">
        {series?.map((s) => {
          const isVisible = seriesVisibility?.[s.id] ?? s.visible ?? true;

          return (
            <button
              key={s.id}
              onClick={() => onSeriesVisibilityChange?.(s.id, !isVisible)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors',
                isVisible ? 'bg-transparent hover:bg-muted' : 'bg-muted/50 text-muted-foreground'
              )}
            >
              <span
                className={cn('h-2.5 w-2.5 rounded-sm', !isVisible && 'opacity-40')}
                style={{ backgroundColor: s.color }}
              />
              <span className={cn(!isVisible && 'line-through')}>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Time range + zoom */}
      <div className="flex items-center gap-2">
        {/* Time range selector */}
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={(v) => v && onTimeRangeChange(v as TimeRangePreset)}
          className="h-8"
        >
          {TIME_RANGE_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="h-8 px-2.5 text-xs">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Zoom controls */}
        {showZoomControls && (
          <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onZoomIn}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onZoomOut}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onResetZoom}
              title="Reset zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
