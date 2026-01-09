'use client';

import { cn } from '@/lib/utils';
import { STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface StatusItem {
  /** Short code (2-3 chars): "NW", "CF", "LQ" */
  code: string;
  /** Full label for tooltip */
  label: string;
  /** Current status */
  tone: StatusTone;
  /** Current value for tooltip */
  value?: string;
  /** Click handler */
  onClick?: () => void;
}

interface StatusAnnunciatorProps {
  items: StatusItem[];
  /** Layout direction */
  direction?: 'row' | 'column';
  /** Additional classes */
  className?: string;
}

export function StatusAnnunciator({
  items,
  direction = 'row',
  className,
}: StatusAnnunciatorProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          'inline-flex gap-1',
          direction === 'column' ? 'flex-col' : 'flex-row',
          className
        )}
      >
        {items.map((item) => {
          const colors = STATUS_COLORS[item.tone];

          return (
            <Tooltip key={item.code}>
              <TooltipTrigger asChild>
                <button
                  onClick={item.onClick}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg px-2 py-1 transition-colors',
                    'border',
                    colors.bg,
                    colors.border,
                    item.onClick && 'hover:opacity-80 cursor-pointer'
                  )}
                >
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', colors.text)}>
                    {item.code}
                  </span>
                  <span className={cn('h-1.5 w-4 rounded-full mt-0.5', colors.bgSolid)} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{item.label}</p>
                {item.value && <p className="text-muted-foreground">{item.value}</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
