'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { baseline } from '@/lib/api';
import { Loader2, Pin } from 'lucide-react';
import { toast } from 'sonner';

interface PinBaselineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function getDefaultDate(): string {
  const today = new Date();
  // Default to first of current month
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
}

export function PinBaselineDialog({ open, onOpenChange, onSuccess }: PinBaselineDialogProps) {
  const [asOfDate, setAsOfDate] = useState(getDefaultDate());

  const pinMutation = useMutation({
    mutationFn: (date: string) => baseline.pin(date),
    onSuccess: () => {
      toast.success('Baseline pinned successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to pin baseline: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asOfDate) {
      toast.error('Please select a date');
      return;
    }
    pinMutation.mutate(asOfDate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pin Baseline
          </DialogTitle>
          <DialogDescription>
            Pinned baseline freezes your starting point for comparisons. This is useful for
            tracking progress from a specific date without the baseline updating as you make
            changes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="as-of-date">As-of Date</Label>
              <Input
                id="as-of-date"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-sm text-muted-foreground">
                The baseline will use account balances and active flows as of this date.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pinMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pinMutation.isPending}>
              {pinMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pinning...
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin Baseline
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
