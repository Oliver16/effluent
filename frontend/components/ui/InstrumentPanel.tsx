import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY } from '@/lib/design-tokens';
import { ReactNode } from 'react';

interface InstrumentPanelProps {
  /** Panel title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Controls to show in header (right side) */
  controls?: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Optional footer (e.g., legend, threshold info) */
  footer?: ReactNode;
  /** Remove padding from content area (for full-bleed charts) */
  noPadding?: boolean;
  /** Additional classes */
  className?: string;
}

export function InstrumentPanel({
  title,
  subtitle,
  controls,
  children,
  footer,
  noPadding = false,
  className,
}: InstrumentPanelProps) {
  return (
    <section className={cn(SURFACE.instrument, className)}>
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          <h2 className={cn(TYPOGRAPHY.sectionTitle, 'truncate')}>{title}</h2>
          {subtitle && <p className={cn(TYPOGRAPHY.sectionSubtitle, 'mt-0.5')}>{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-2 shrink-0">{controls}</div>}
      </header>

      {/* Content */}
      <div className={cn(noPadding ? '' : 'p-4')}>{children}</div>

      {/* Footer */}
      {footer && (
        <footer className="border-t border-border/50 px-4 py-2.5 bg-muted/30">{footer}</footer>
      )}
    </section>
  );
}
