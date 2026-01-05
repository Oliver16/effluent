'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onboarding, households } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OnboardingStepResponse } from '@/lib/types'

const STEP_LABELS: Record<string, string> = {
  welcome: 'Welcome',
  household_info: 'Household Info',
  members: 'Family Members',
  tax_filing: 'Tax Filing',
  income_sources: 'Income Sources',
  income_details: 'Income Details',
  withholding: 'Withholding',
  pretax_deductions: 'Pre-Tax Deductions',
  bank_accounts: 'Bank Accounts',
  investments: 'Investments',
  retirement: 'Retirement Accounts',
  real_estate: 'Real Estate',
  vehicles: 'Vehicles',
  mortgages: 'Mortgages',
  credit_cards: 'Credit Cards',
  student_loans: 'Student Loans',
  other_debts: 'Other Debts',
  housing_expenses: 'Housing Expenses',
  utilities: 'Utilities',
  insurance: 'Insurance',
  transportation: 'Transportation',
  food: 'Food',
  other_expenses: 'Other Expenses',
  review: 'Review',
  complete: 'Complete',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [stepData, setStepData] = useState<OnboardingStepResponse | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuthAndLoadStep()
  }, [])

  const checkAuthAndLoadStep = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      // Ensure we have a household
      const householdList = await households.list()
      if (householdList.length === 0) {
        // Create a new household
        const newHousehold = await households.create({ name: 'My Household' })
        localStorage.setItem('householdId', newHousehold.id)
      } else {
        const household = householdList[0]
        localStorage.setItem('householdId', household.id)
        // Handle both camelCase and snake_case from API
        const onboardingComplete = household.onboardingCompleted ??
          (household as unknown as { onboarding_completed?: boolean }).onboarding_completed
        if (onboardingComplete) {
          router.push('/dashboard')
          return
        }
      }

      await loadCurrentStep()
    } catch {
      router.push('/')
    }
  }

  const loadCurrentStep = async () => {
    setIsLoading(true)
    try {
      const data = await onboarding.getProgress()
      setStepData(data)
      setFormData(data.draftData || {})
    } catch (err) {
      setError('Failed to load onboarding progress')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = async () => {
    setIsSaving(true)
    setError('')
    try {
      const result = await onboarding.completeStep(formData)
      if (result.success) {
        if (result.nextStep === 'complete' || !result.nextStep) {
          router.push('/dashboard')
        } else {
          await loadCurrentStep()
        }
      } else if (result.errors) {
        setError(Object.values(result.errors).join(', '))
      }
    } catch {
      setError('Failed to save step')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = async () => {
    setIsSaving(true)
    try {
      const result = await onboarding.skip()
      if (result.success) {
        await loadCurrentStep()
      }
    } catch {
      setError('Failed to skip step')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = async () => {
    setIsSaving(true)
    try {
      const result = await onboarding.back()
      if (result.success) {
        await loadCurrentStep()
      }
    } catch {
      setError('Failed to go back')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </main>
    )
  }

  const currentStep = stepData?.step || 'welcome'
  const stepLabel = STEP_LABELS[currentStep] || currentStep

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Build Your Financial Model</h1>
          <div className="w-full bg-muted rounded-full h-2 mb-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${stepData?.progressPercentage || 0}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {stepData?.progressPercentage || 0}% complete
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{stepLabel}</CardTitle>
            <CardDescription>
              {currentStep === 'welcome' && 'Configure your household\'s operating model'}
              {currentStep === 'household_info' && 'Tell us about your household'}
              {currentStep === 'members' && 'Add family members'}
              {currentStep === 'bank_accounts' && 'Add your bank accounts'}
              {currentStep === 'complete' && 'You\'re all set!'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 'welcome' && (
              <div className="text-center py-6">
                <p className="text-lg mb-4">
                  Your household is a business. It's time to model it like one.
                </p>
                <p className="text-muted-foreground mb-4">
                  We'll walk through your income, assets, liabilities, and expenses to
                  build a complete financial picture. Skip what you don't need—you can
                  always add it later.
                </p>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted end-to-end and never shared.
                </p>
              </div>
            )}

            {currentStep === 'household_info' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Household Name</Label>
                  <Input
                    id="name"
                    value={(formData.name as string) || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., The Smith Family"
                  />
                </div>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-6">
                <p className="text-lg mb-4">
                  Congratulations! Your financial profile is set up.
                </p>
                <p className="text-muted-foreground">
                  You can now view your dashboard and start modeling scenarios.
                </p>
              </div>
            )}

            {/* Generic form for other steps */}
            {!['welcome', 'household_info', 'complete'].includes(currentStep) && (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  Step: {stepLabel}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This step can be configured in more detail later.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              {stepData?.canGoBack && (
                <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {stepData?.canSkip && (
                <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
                  Skip
                </Button>
              )}
              <Button onClick={handleNext} disabled={isSaving}>
                {currentStep === 'complete' ? 'Go to Dashboard' : 'Continue'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
