'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  GitBranch,
  Target,
  Zap,
  Plus,
  RefreshCw,
  Settings,
  HelpCircle,
} from 'lucide-react';

// NOTE: Named "CommandPaletteItem" to avoid collision with shadcn CommandItem
interface CommandPaletteItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
}

const navigationItems: CommandPaletteItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { name: 'Accounts', href: '/accounts', icon: Wallet, keywords: ['bank', 'balance', 'money'] },
  { name: 'Flows', href: '/flows', icon: ArrowRightLeft, keywords: ['income', 'expense', 'recurring'] },
  { name: 'Scenarios', href: '/scenarios', icon: GitBranch, keywords: ['what-if', 'projection'] },
  { name: 'Goals', href: '/settings/goals', icon: Target, keywords: ['target', 'objective'] },
  { name: 'Stress Tests', href: '/stress-tests', icon: Zap, keywords: ['risk', 'simulation'] },
  { name: 'Settings', href: '/settings', icon: Settings, keywords: ['preferences', 'config'] },
];

const actionItems: CommandPaletteItem[] = [
  { name: 'Model a Decision', href: '/scenarios/new/decision-builder', icon: Plus, keywords: ['new', 'create', 'scenario'] },
  { name: 'Update Account Balance', href: '/accounts?action=update', icon: RefreshCw, keywords: ['balance', 'refresh'] },
  { name: 'Help & Documentation', href: '/help', icon: HelpCircle, keywords: ['support', 'docs'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <span>Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.name} ${item.keywords?.join(' ') || ''}`}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onSelect={() => runCommand(() => router.push(item.href as any))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            {actionItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.name} ${item.keywords?.join(' ') || ''}`}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onSelect={() => runCommand(() => router.push(item.href as any))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
