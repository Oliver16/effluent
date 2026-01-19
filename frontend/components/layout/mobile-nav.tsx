'use client'

import { useState } from 'react'
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
  Menu,
  X,
  CalendarHeart,
  Target,
  FlaskConical,
  ListTodo,
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
  { name: 'Admin Tasks', href: '/admin/tasks', icon: ListTodo },
  { name: 'Settings', href: '/settings', icon: Settings },
] as const

interface MobileNavProps {
  onLogout: () => void
}

export function MobileNav({ onLogout }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-card px-4 py-4 shadow-sm sm:px-6 lg:hidden border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="-m-2.5"
          onClick={() => setIsOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </Button>
        <div className="flex-1 text-sm font-semibold leading-6">
          <Link href="/control-plane" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">E</span>
            </div>
            <span className="font-bold">Effluent.io</span>
          </Link>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="relative z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar panel */}
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              {/* Close button */}
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="-m-2.5"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </div>

              {/* Sidebar content */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <Link href="/control-plane" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-lg">E</span>
                    </div>
                    <span className="text-xl font-bold">Effluent.io</span>
                  </Link>
                </div>

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
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                  'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                                  isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                              >
                                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                                {item.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </li>

                    <li className="mt-auto">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-x-3 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setIsOpen(false)
                          onLogout()
                        }}
                      >
                        <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                        Sign out
                      </Button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
