import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY, STATUS_COLORS, StatusTone } from '@/lib/design-tokens';
import { formatCurrencySigned } from '@/lib/format';
import { TrendingUp, TrendingDown, Repeat, LucideIcon } from 'lucide-react';

interface Driver {
  /** Description of the driver */
  label: string;
  /** Impact amount (positive or negative) */
  impact: number;
  /** Whether this is positive or negative for the user */
  tone: StatusTone;
  /** Is this a recurring impact */
  recurring?: boolean;
  /** Optional icon */
  icon?: LucideIcon;
}

interface DriversBlockProps {
  /** Section title */
  title: string;
  /** List of drivers */
  drivers: Driver[];
  /** Additional classes */
  className?: string;
}

export function DriversBlock({ title, drivers, className }: DriversBlockProps) {
  return (
    <div className={cn(SURFACE.inset, 'p-4', className)}>
      <h3 className={cn(TYPOGRAPHY.sectionTitle, 'text-sm mb-3')}>{title}</h3>

      <ul className="space-y-2">
        {drivers.map((driver, i) => {
          const colors = STATUS_COLORS[driver.tone];
          const Icon = driver.icon || (driver.impact >= 0 ? TrendingUp : TrendingDown);

          return (
            <li key={i} className="flex items-center gap-3">
              <div className={cn('p-1.5 rounded-lg', colors.bg)}>
                <Icon className={cn('h-3.5 w-3.5', colors.icon)} />
              </div>

              <span className="flex-1 text-sm">{driver.label}</span>

              {driver.recurring && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  /mo
                </span>
              )}

              <span className={cn('text-sm font-semibold tabular-nums', colors.text)}>
                {formatCurrencySigned(driver.impact)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
