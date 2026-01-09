import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionCard({
  title,
  description,
  right,
  children,
  className,
  dense = false,
}: {
  title?: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section className={cn('rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm', className)}>
      {(title || right) ? (
        <header className={cn('flex items-start justify-between gap-4 border-b border-border/50', dense ? 'p-3' : 'p-4')}>
          <div className="space-y-0.5">
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {right}
        </header>
      ) : null}
      <div className={dense ? 'p-3' : 'p-4'}>{children}</div>
    </section>
  );
}
