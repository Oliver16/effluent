'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { households } from '@/lib/api'
import { updateHouseholdCookie } from '@/lib/auth'
import { isOnboardingComplete } from '@/lib/utils'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/')
      return
    }

    try {
      // Verify token is valid
      const householdList = await households.list()

      if (householdList.length === 0) {
        router.push('/onboarding')
        return
      }

      const household = householdList[0]
      localStorage.setItem('householdId', household.id)
      // Sync householdId to cookie for SSR
      await updateHouseholdCookie(household.id)

      if (!isOnboardingComplete(household)) {
        router.push('/onboarding')
        return
      }

      setIsAuthenticated(true)
    } catch {
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">E</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
