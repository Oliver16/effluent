'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { baseline } from '@/lib/api';
import { BaselineHealth, BaselineMode } from '@/lib/types';
import { Pin, RefreshCw, PinOff, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PinBaselineDialog } from './pin-baseline-dialog';

interface BaselineStatusProps {
  health: BaselineHealth | null;
  onRefresh?: () => void;
}

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Never';

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function BaselineStatus({ health, onRefresh }: BaselineStatusProps) {
  const [showPinDialog, setShowPinDialog] = useState(false);
  const queryClient = useQueryClient();

  const refreshMutation = useMutation({
    mutationFn: () => baseline.refresh(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baseline'] });
      toast.success('Baseline refreshed successfully');
      onRefresh?.();
    },
    onError: () => {
      toast.error('Failed to refresh baseline');
    },
  });

  const unpinMutation = useMutation({
    mutationFn: () => baseline.unpin(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baseline'] });
      toast.success('Baseline unpinned - now tracking live data');
      onRefresh?.();
    },
    onError: () => {
      toast.error('Failed to unpin baseline');
    },
  });

  if (!health) return null;

  const isLive = health.baseline_mode === 'live';
  const isPinned = health.baseline_mode === 'pinned';
  const isRefreshing = refreshMutation.isPending;
  const isUnpinning = unpinMutation.isPending;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Status Pill */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
                  isLive && 'bg-green-100 text-green-800',
                  isPinned && 'bg-blue-100 text-blue-800'
                )}
              >
                {isLive ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Live baseline (auto-updates)
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4" />
                    Pinned baseline: {health.baseline_pinned_as_of_date}
                  </>
                )}
              </div>

              {/* Last projected timestamp */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last projected: {formatRelativeTime(health.last_projected_at)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {isLive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPinDialog(true)}
                >
                  <Pin className="h-4 w-4 mr-2" />
                  Pin baseline
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unpinMutation.mutate()}
                  disabled={isUnpinning}
                >
                  {isUnpinning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PinOff className="h-4 w-4 mr-2" />
                  )}
                  Unpin
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshMutation.mutate()}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PinBaselineDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['baseline'] });
          onRefresh?.();
        }}
      />
    </>
  );
}
