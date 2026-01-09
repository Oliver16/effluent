'use client';

import { useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { SectionCard } from '@/components/layout/SectionCard';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service (e.g., Sentry)
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <PageShell>
      <SectionCard>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            We couldn&apos;t load your dashboard. This might be a temporary issue.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <p className="mt-2 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded max-w-md truncate">
              {error.message}
            </p>
          )}
          <Button onClick={reset} className="mt-6 gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </SectionCard>
    </PageShell>
  );
}
