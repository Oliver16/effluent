'use client';

import { Plus, Sparkles, GitBranch, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface NewMenuProps {
  showStressTests?: boolean; // Enable after TASK-15
}

export function NewMenu({ showStressTests = false }: NewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/decisions" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Model a Decision
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={"/scenarios/new" as any} className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Create Scenario
          </Link>
        </DropdownMenuItem>
        {showStressTests ? (
          <DropdownMenuItem asChild>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={"/stress-tests/new" as any} className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Run Stress Test
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="flex items-center gap-2 opacity-50">
            <Zap className="h-4 w-4" />
            Run Stress Test
            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
