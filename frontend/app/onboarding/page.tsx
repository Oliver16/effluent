'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { onboarding, households } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import type { OnboardingStepResponse } from '@/lib/types'

// Import all step components
import {
  WelcomeStep,
  HouseholdInfoStep,
  MembersStep,
  TaxFilingStep,
  IncomeSourcesStep,
  IncomeDetailsStep,
  WithholdingStep,
  PretaxDeductionsStep,
  BankAccountsStep,
  InvestmentsStep,
  RetirementStep,
  RealEstateStep,
  VehiclesStep,
  MortgagesStep,
  CreditCardsStep,
  StudentLoansStep,
  OtherDebtsStep,
  HousingExpensesStep,
  UtilitiesStep,
  InsuranceStep,
  TransportationStep,
  FoodStep,
  OtherExpensesStep,
  ReviewStep,
  CompleteStep,
  STEP_CONFIG,
} from '@/components/onboarding/steps'

// Map step names to components
const STEP_COMPONENTS: Record<string, React.ComponentType<{
  formData: Record<string, unknown>
  setFormData: (data: Record<string, unknown>) => void
  errors?: Record<string, string>
}>> = {
  welcome: WelcomeStep,
  household_info: HouseholdInfoStep,
  members: MembersStep,
  tax_filing: TaxFilingStep,
  income_sources: IncomeSourcesStep,
  income_details: IncomeDetailsStep,
  withholding: WithholdingStep,
  pretax_deductions: PretaxDeductionsStep,
  bank_accounts: BankAccountsStep,
  investments: InvestmentsStep,
  retirement: RetirementStep,
  real_estate: RealEstateStep,
  vehicles: VehiclesStep,
  mortgages: MortgagesStep,
  credit_cards: CreditCardsStep,
  student_loans: StudentLoansStep,
  other_debts: OtherDebtsStep,
  housing_expenses: HousingExpensesStep,
  utilities: UtilitiesStep,
  insurance: InsuranceStep,
  transportation: TransportationStep,
  food: FoodStep,
  other_expenses: OtherExpensesStep,
  review: ReviewStep,
  complete: CompleteStep,
}

export default function OnboardingPage() {
  const router = useRouter()
  const [stepData, setStepData] = useState<OnboardingStepResponse | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const loadCurrentStep = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await onboarding.getProgress()
      setStepData(data)
      setFormData(data.draftData || {})
    } catch {
      setError('Failed to load onboarding progress')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkAuthAndLoadStep = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

    try {
      const householdList = await households.list()
      if (householdList.length === 0) {
        const newHousehold = await households.create({ name: 'My Household' })
        localStorage.setItem('householdId', newHousehold.id)
      } else {
        const household = householdList[0]
        localStorage.setItem('householdId', household.id)
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
  }, [router, loadCurrentStep])

  useEffect(() => {
    checkAuthAndLoadStep()
  }, [checkAuthAndLoadStep])

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

  // Auto-save draft on form changes (debounced)
  useEffect(() => {
    if (!stepData || isLoading) return

    const timer = setTimeout(async () => {
      try {
        await onboarding.saveStep(formData)
      } catch {
        // Silent fail for auto-save
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [formData, stepData, isLoading])

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
  const stepConfig = STEP_CONFIG[currentStep] || { title: currentStep, description: '' }
  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Begin Infusing Model DNA</h1>
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
            <CardTitle>{stepConfig.title}</CardTitle>
            <CardDescription>{stepConfig.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {StepComponent && (
              <StepComponent
                formData={formData}
                setFormData={setFormData}
                errors={stepData?.validationErrors}
              />
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
