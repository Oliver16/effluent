'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { households, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { isOnboardingComplete } from '@/lib/utils'
import { logout, updateHouseholdCookie } from '@/lib/auth'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated' | 'network_error'

export default function Home() {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

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
      // Sync householdId to cookie for SSR
      await updateHouseholdCookie(household.id)

      if (isOnboardingComplete(household)) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    } catch (error) {
      // Distinguish between auth errors and network/server errors
      if (error instanceof ApiError) {
        if (error.status === 401 || error.status === 403) {
          // Token invalid or expired - clear auth and show login
          await logout()
          setAuthState('unauthenticated')
        } else {
          // Server error - don't wipe credentials
          setErrorMessage(`Server error (${error.status}): ${error.message}`)
          setAuthState('network_error')
        }
      } else {
        // Network error or other issue - don't wipe credentials
        setErrorMessage('Unable to connect to the server. Please check your connection.')
        setAuthState('network_error')
      }
    }
  }

  const handleLoginSuccess = () => {
    setAuthState('loading')
    checkAuthAndRedirect()
  }

  const handleRetry = () => {
    setAuthState('loading')
    setErrorMessage('')
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

  if (authState === 'network_error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Connection Error</h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRetry}>
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await logout()
                setAuthState('unauthenticated')
              }}
            >
              Sign in again
            </Button>
          </div>
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
