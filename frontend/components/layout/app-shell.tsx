'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { NewMenu } from '@/components/nav/NewMenu'
import { CommandPalette } from '@/components/nav/CommandPalette'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('householdId')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Mobile navigation */}
      <MobileNav onLogout={handleLogout} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top header bar - desktop only */}
        <header className="sticky top-0 z-40 hidden lg:flex h-14 items-center justify-between gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          <div className="flex-1">
            {/* Command palette search trigger */}
            <CommandPalette />
          </div>
          <div className="flex items-center gap-2">
            {/* New menu - creates scenarios, decisions, etc. */}
            <NewMenu showStressTests />
          </div>
        </header>

        {/* Page content */}
        <main>
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
