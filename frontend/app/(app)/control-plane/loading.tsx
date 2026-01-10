import { PageShell } from '@/components/layout/PageShell';
import { ControlPlaneSkeleton, SidebarCardSkeleton } from '@/components/ui/Skeletons';

export default function ControlPlaneLoading() {
  return (
    <PageShell
      variant="control-plane"
      sidebar={
        <div className="space-y-6">
          <SidebarCardSkeleton />
          <SidebarCardSkeleton />
          <SidebarCardSkeleton />
        </div>
      }
    >
      <ControlPlaneSkeleton />
    </PageShell>
  );
}
