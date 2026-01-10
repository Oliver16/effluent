'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    householdId: '',
  })
  const [joinExisting, setJoinExisting] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      // Register the user
      const registrationData: Record<string, string> = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
      }

      // Include household_id if joining an existing household
      if (joinExisting && formData.householdId.trim()) {
        registrationData.household_id = formData.householdId.trim()
      }

      await api.post('/api/auth/register/', registrationData)

      // Redirect to login page
      router.push('/login?registered=true')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Registration failed. Please try again.')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Start modeling your finances like a business
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="joinExisting"
                checked={joinExisting}
                onChange={(e) => setJoinExisting(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="joinExisting" className="text-sm font-normal cursor-pointer">
                Join an existing household
              </Label>
            </div>
            {joinExisting && (
              <div className="mt-2">
                <Input
                  id="householdId"
                  type="text"
                  placeholder="Enter household ID"
                  value={formData.householdId}
                  onChange={(e) => setFormData({ ...formData, householdId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ask the household owner for the ID from their settings page
                </p>
              </div>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-muted-foreground text-center">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </CardFooter>
    </Card>
  )
}
