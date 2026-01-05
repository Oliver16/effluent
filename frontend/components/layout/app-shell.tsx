'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'

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

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
