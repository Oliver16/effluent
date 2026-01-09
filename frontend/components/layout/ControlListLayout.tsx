import { cn } from '@/lib/utils';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { ReactNode } from 'react';

interface ControlListLayoutProps {
  /** Page title */
  title: string;
  /** Page subtitle */
  subtitle?: string;
  /** Header actions (right side) */
  actions?: ReactNode;
  /** Stat cards section */
  stats?: ReactNode;
  /** Table controls (filters, density toggle, etc.) */
  tableControls?: ReactNode;
  /** Table content */
  children: ReactNode;
  /** Additional classes */
  className?: string;
}

export function ControlListLayout({
  title,
  subtitle,
  actions,
  stats,
  tableControls,
  children,
  className,
}: ControlListLayoutProps) {
  return (
    <div className={cn(SPACING.pageGutter, SPACING.sectionGap, className)}>
      {/* Page header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className={TYPOGRAPHY.pageTitle}>{title}</h1>
          {subtitle && <p className={cn(TYPOGRAPHY.pageSubtitle, 'mt-1')}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      {/* Stats strip */}
      {stats && <div className="grid grid-cols-3 gap-4">{stats}</div>}

      {/* Table section */}
      <div className="space-y-3">
        {tableControls && (
          <div className="flex items-center justify-between gap-4">
            {tableControls}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
