'use client';

import { cn } from '@/lib/utils';
import { DensityMode } from '@/lib/design-tokens';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlignJustify, List, LayoutList } from 'lucide-react';

interface TableDensityToggleProps {
  value: DensityMode;
  onChange: (value: DensityMode) => void;
  className?: string;
}

export function TableDensityToggle({ value, onChange, className }: TableDensityToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as DensityMode)}
      className={cn('h-8', className)}
    >
      <ToggleGroupItem value="comfort" aria-label="Comfort density" className="h-8 w-8 p-0">
        <LayoutList className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="compact" aria-label="Compact density" className="h-8 w-8 p-0">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dense" aria-label="Dense density" className="h-8 w-8 p-0">
        <AlignJustify className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
