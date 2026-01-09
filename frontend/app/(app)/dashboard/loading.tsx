import { PageShell } from '@/components/layout/PageShell';
import { DashboardSkeleton, SidebarCardSkeleton } from '@/components/ui/Skeletons';

export default function DashboardLoading() {
  return (
    <PageShell
      variant="dashboard"
      sidebar={
        <div className="space-y-6">
          <SidebarCardSkeleton />
          <SidebarCardSkeleton />
          <SidebarCardSkeleton />
        </div>
      }
    >
      <DashboardSkeleton />
    </PageShell>
  );
}
