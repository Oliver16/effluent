'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Redirect to life events page
 * All scenarios now start with a life event
 */
export default function NewScenarioPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/life-events');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
