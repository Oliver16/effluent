import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function PageShell({
  children,
  sidebar,
  variant = 'default',
  className,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
  variant?: 'default' | 'control-plane';
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8', className)}>
      {variant === 'control-plane' && sidebar ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 2xl:col-span-9">{children}</div>
          <aside className="xl:col-span-4 2xl:col-span-3">
            {/* top-20 = 5rem = header height (3.5rem/h-14) + gap (1.5rem) */}
            <div className="sticky top-20 space-y-6">{sidebar}</div>
          </aside>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
