import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-3 shadow-sm"
      aria-busy="true"
      aria-label="Loading metric card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function SidebarCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-4 shadow-sm space-y-3"
      aria-busy="true"
      aria-label="Loading sidebar content"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
      aria-busy="true"
      aria-label="Loading chart"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-64 w-full rounded-lg" />
    </div>
  );
}

export function ListRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* North Star Cards skeleton */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart skeleton */}
      <ChartSkeleton />

      {/* Accounts list skeleton */}
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <Skeleton className="h-5 w-24 mb-4" />
        <ListRowSkeleton count={4} />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
