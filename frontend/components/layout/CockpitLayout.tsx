import { cn } from '@/lib/utils';
import { SPACING } from '@/lib/design-tokens';
import { ReactNode } from 'react';

interface CockpitLayoutProps {
  /** Main content area */
  children: ReactNode;
  /** Right sidebar content (optional) */
  sidebar?: ReactNode;
  /** Context bar (renders above main content) */
  contextBar?: ReactNode;
  /** Additional classes for main area */
  className?: string;
}

export function CockpitLayout({
  children,
  sidebar,
  contextBar,
  className,
}: CockpitLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Context bar (sticky) */}
      {contextBar}

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <main className={cn('flex-1 overflow-auto', SPACING.pageGutter, className)}>
          {children}
        </main>

        {/* Sidebar */}
        {sidebar && (
          <aside className="w-80 shrink-0 border-l border-border overflow-auto">
            <div className={SPACING.pageGutter}>{sidebar}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
