'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { households } from '@/lib/api'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

export default function Home() {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  const checkAuthAndRedirect = async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      setAuthState('unauthenticated')
      return
    }

    try {
      // Verify token is valid by fetching households
      const householdList = await households.list()

      if (householdList.length === 0) {
        // No household yet - need to create one (onboarding)
        router.push('/onboarding')
        return
      }

      const household = householdList[0]
      localStorage.setItem('householdId', household.id)

      // Check if onboarding is complete
      if (household.onboardingCompleted) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    } catch {
      // Token invalid or expired
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('householdId')
      setAuthState('unauthenticated')
    }
  }

  const handleLoginSuccess = () => {
    checkAuthAndRedirect()
  }

  if (authState === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Effluent.io</h1>
        <p className="text-muted-foreground">Personal Finance Modeling</p>
      </div>
      <LoginForm onSuccess={handleLoginSuccess} />
    </main>
  )
}
