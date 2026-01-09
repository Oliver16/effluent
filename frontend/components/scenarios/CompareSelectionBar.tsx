'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

interface CompareSelectionBarProps {
  /** Number of selected scenarios */
  selectedCount: number;
  /** Maximum scenarios that can be compared */
  maxSelections?: number;
  /** Compare handler */
  onCompare: () => void;
  /** Clear selection handler */
  onClear: () => void;
  /** Is visible */
  visible: boolean;
  /** Additional classes */
  className?: string;
}

export function CompareSelectionBar({
  selectedCount,
  maxSelections = 2,
  onCompare,
  onClear,
  visible,
  className,
}: CompareSelectionBarProps) {
  if (!visible) return null;

  const canCompare = selectedCount >= 2 && selectedCount <= maxSelections;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-card border border-border shadow-lg',
        className
      )}
    >
      <span className="text-sm font-medium">
        {selectedCount} scenario{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="h-8"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>

        <Button
          size="sm"
          onClick={onCompare}
          disabled={!canCompare}
          className="h-8"
        >
          Compare
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
