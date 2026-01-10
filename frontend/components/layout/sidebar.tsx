'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  LineChart,
  Settings,
  LogOut,
  CalendarHeart,
  Target,
  FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Control Plane', href: '/control-plane', icon: LayoutDashboard },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Flows', href: '/flows', icon: ArrowLeftRight },
  { name: 'Life Events', href: '/life-events', icon: CalendarHeart },
  { name: 'Scenarios', href: '/scenarios', icon: LineChart },
  { name: 'Stress Tests', href: '/stress-tests', icon: FlaskConical },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Settings', href: '/settings', icon: Settings },
] as const

interface SidebarProps {
  onLogout: () => void
}

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-sidebar px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/control-plane" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-primary transition-all duration-200 group-hover:shadow-lg group-hover:scale-105">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Effluent.io
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex gap-x-3 rounded-lg p-2.5 text-sm font-medium leading-6 transition-all duration-200',
                          isActive
                            ? 'bg-gradient-primary text-primary-foreground shadow-primary'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-200",
                            !isActive && "group-hover:scale-110"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>

            {/* Logout at bottom */}
            <li className="mt-auto">
              <Button
                variant="ghost"
                className="w-full justify-start gap-x-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={onLogout}
              >
                <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                Sign out
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  )
}
