'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { onboarding, households, members, incomeSources, accounts, flows, ApiError } from '@/lib/api'
import { logout, updateHouseholdCookie } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OnboardingStepResponse, HouseholdMember, IncomeSourceDetail, Account, RecurringFlow, Household } from '@/lib/types'

const STEP_LABELS: Record<string, string> = {
  welcome: 'Welcome',
  household_info: 'Household Info',
  members: 'Family Members',
  tax_filing: 'Tax Filing',
  income_sources: 'Income Sources',
  business_expenses: 'Business & Rental Expenses',
  withholding: 'Withholding',
  pretax_deductions: 'Pre-Tax Deductions',
  bank_accounts: 'Bank Accounts',
  investments: 'Investments',
  retirement: 'Retirement Accounts',
  real_estate: 'Real Estate',
  vehicles: 'Vehicles',
  personal_property: 'Personal Property',
  business_ownership: 'Business Ownership',
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

const STEP_DESCRIPTIONS: Record<string, string> = {
  welcome: 'Configure your household\'s operating model',
  household_info: 'Give your household a name',
  members: 'Add the people in your household',
  tax_filing: 'Set your tax filing status and state',
  income_sources: 'Add your sources of income with full details',
  business_expenses: 'Enter expenses for your business or rental income to calculate net taxable income',
  withholding: 'Configure your W-4 withholding settings for W-2 income',
  pretax_deductions: 'Add pre-tax deductions like 401(k) contributions',
  bank_accounts: 'Add your checking and savings accounts',
  investments: 'Add your investment and brokerage accounts',
  retirement: 'Add your retirement accounts',
  real_estate: 'Add any real estate you own',
  vehicles: 'Add your vehicles',
  personal_property: 'Add valuables like jewelry, collectibles, firearms, and other personal property',
  business_ownership: 'Add ownership stakes in businesses, partnerships, or LLCs',
  mortgages: 'Add your mortgage details',
  credit_cards: 'Add your credit card balances',
  student_loans: 'Add your student loan details',
  other_debts: 'Add any other debts',
  housing_expenses: 'Add your housing-related expenses',
  utilities: 'Add your utility bills',
  insurance: 'Add your insurance premiums',
  transportation: 'Add your transportation costs',
  food: 'Add your food expenses',
  other_expenses: 'Add any other recurring expenses',
  review: 'Review your financial profile',
  complete: 'You\'re all set!',
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'Washington DC' },
]

const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
]

const RELATIONSHIPS = [
  { value: 'self', label: 'Self' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'dependent', label: 'Other Dependent' },
]

const EMPLOYMENT_STATUSES = [
  { value: 'employed_w2', label: 'W-2 Employee' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'both', label: 'Both W-2 and Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
]

const INCOME_TYPES = [
  { value: 'w2', label: 'W-2 Employment' },
  { value: 'w2_hourly', label: 'W-2 Hourly' },
  { value: 'self_employed', label: 'Self-Employment (1099)' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'investment', label: 'Investment Income' },
  { value: 'retirement', label: 'Retirement/Pension' },
  { value: 'other', label: 'Other Income' },
]

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly (52)' },
  { value: 'biweekly', label: 'Bi-weekly (26)' },
  { value: 'semimonthly', label: 'Semi-monthly (24)' },
  { value: 'monthly', label: 'Monthly (12)' },
]

const WITHHOLDING_FILING_STATUSES = [
  { value: 'single', label: 'Single or Married Filing Separately' },
  { value: 'married', label: 'Married Filing Jointly' },
  { value: 'head_of_household', label: 'Head of Household' },
]

const PRETAX_DEDUCTION_TYPES = [
  { value: 'traditional_401k', label: '401(k) Traditional' },
  { value: 'roth_401k', label: '401(k) Roth' },
  { value: 'traditional_403b', label: '403(b)' },
  { value: 'tsp_traditional', label: 'TSP Traditional' },
  { value: 'tsp_roth', label: 'TSP Roth' },
  { value: 'hsa', label: 'HSA' },
  { value: 'fsa_health', label: 'Healthcare FSA' },
  { value: 'fsa_dependent', label: 'Dependent Care FSA' },
  { value: 'health_insurance', label: 'Health Insurance' },
  { value: 'dental_insurance', label: 'Dental Insurance' },
  { value: 'vision_insurance', label: 'Vision Insurance' },
  { value: 'life_insurance', label: 'Life Insurance' },
  { value: 'commuter_transit', label: 'Commuter Transit' },
  { value: 'commuter_parking', label: 'Commuter Parking' },
  { value: 'other_pretax', label: 'Other Pre-Tax' },
]

const AMOUNT_TYPES = [
  { value: 'fixed', label: 'Fixed Amount ($)' },
  { value: 'percentage', label: 'Percentage (%)' },
]

const BANK_ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'money_market', label: 'Money Market Account' },
]

const INVESTMENT_TYPES = [
  { value: 'brokerage', label: 'Brokerage Account' },
  { value: 'crypto', label: 'Cryptocurrency' },
]

const RETIREMENT_TYPES = [
  { value: 'traditional_401k', label: '401(k) - Traditional' },
  { value: 'roth_401k', label: '401(k) - Roth' },
  { value: 'traditional_ira', label: 'IRA - Traditional' },
  { value: 'roth_ira', label: 'IRA - Roth' },
  { value: 'hsa', label: 'Health Savings Account' },
  { value: 'pension', label: 'Pension' },
]

const PROPERTY_TYPES = [
  { value: 'primary_residence', label: 'Primary Residence' },
  { value: 'rental_property', label: 'Rental Property' },
  { value: 'vacation_property', label: 'Vacation Property' },
  { value: 'land', label: 'Land' },
  { value: 'commercial_property', label: 'Commercial Property' },
]

const PERSONAL_PROPERTY_TYPES = [
  { value: 'jewelry', label: 'Jewelry & Watches' },
  { value: 'precious_metals', label: 'Precious Metals (Gold, Silver, etc.)' },
  { value: 'collectibles', label: 'Collectibles & Antiques' },
  { value: 'art', label: 'Art & Fine Art' },
  { value: 'firearms', label: 'Firearms' },
  { value: 'electronics', label: 'Electronics & Equipment' },
  { value: 'musical_instruments', label: 'Musical Instruments' },
  { value: 'sports_equipment', label: 'Sports & Recreation Equipment' },
  { value: 'boat', label: 'Boats & Watercraft' },
  { value: 'rv', label: 'RVs & Campers' },
  { value: 'motorcycle', label: 'Motorcycles & ATVs' },
  { value: 'other', label: 'Other Valuables' },
]

const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'LLC' },
  { value: 'llc_partnership', label: 'LLC Partnership' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 'partnership', label: 'General Partnership' },
  { value: 'limited_partnership', label: 'Limited Partnership' },
  { value: 'professional_corp', label: 'Professional Corporation' },
  { value: 'other', label: 'Other' },
]

const UTILITY_CATEGORIES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'natural_gas', label: 'Natural Gas' },
  { value: 'water_sewer', label: 'Water & Sewer' },
  { value: 'trash', label: 'Trash/Recycling' },
  { value: 'internet', label: 'Internet' },
  { value: 'phone', label: 'Phone/Mobile' },
  { value: 'cable_streaming', label: 'Cable/Streaming' },
]

const INSURANCE_CATEGORIES = [
  { value: 'health_insurance', label: 'Health Insurance' },
  { value: 'dental_insurance', label: 'Dental Insurance' },
  { value: 'vision_insurance', label: 'Vision Insurance' },
  { value: 'life_insurance', label: 'Life Insurance' },
  { value: 'disability_insurance', label: 'Disability Insurance' },
]

const TRANSPORT_CATEGORIES = [
  { value: 'auto_insurance', label: 'Auto Insurance' },
  { value: 'gas_fuel', label: 'Gas/Fuel' },
  { value: 'auto_maintenance', label: 'Auto Maintenance' },
  { value: 'parking', label: 'Parking' },
  { value: 'public_transit', label: 'Public Transit' },
]

const BUSINESS_EXPENSE_CATEGORIES = [
  { value: 'business_office', label: 'Office Expenses' },
  { value: 'business_supplies', label: 'Business Supplies' },
  { value: 'business_advertising', label: 'Advertising & Marketing' },
  { value: 'business_professional', label: 'Professional Services' },
  { value: 'business_travel', label: 'Business Travel' },
  { value: 'business_vehicle', label: 'Business Vehicle/Mileage' },
  { value: 'business_rent', label: 'Business Rent/Lease' },
  { value: 'business_utilities', label: 'Business Utilities' },
  { value: 'business_equipment', label: 'Equipment & Tools' },
  { value: 'business_insurance', label: 'Business Insurance' },
  { value: 'business_license', label: 'Licenses & Permits' },
  { value: 'business_software', label: 'Software & Subscriptions' },
  { value: 'business_contractor', label: 'Contract Labor' },
  { value: 'business_other', label: 'Other Business Expense' },
]

const RENTAL_EXPENSE_CATEGORIES = [
  { value: 'rental_mortgage', label: 'Rental Property Mortgage' },
  { value: 'rental_insurance', label: 'Rental Property Insurance' },
  { value: 'rental_repairs', label: 'Rental Repairs & Maintenance' },
  { value: 'rental_management', label: 'Property Management' },
  { value: 'rental_utilities', label: 'Rental Property Utilities' },
  { value: 'rental_tax', label: 'Rental Property Tax' },
  { value: 'rental_other', label: 'Other Rental Expense' },
]

interface Member {
  name: string
  relationship: string
  is_primary: boolean
  employment_status: string
}

interface IncomeSource {
  name: string
  member_id?: string
  income_type: string
  salary?: number
  hourly_rate?: number
  expected_annual_hours?: number
  frequency: string
}

interface BusinessExpense {
  name: string
  category: string
  amount: number
  frequency?: string
}

interface IncomeSourceWithDetails {
  id: string
  name: string
  income_type: string
  salary?: number
  hourly_rate?: number
  expected_annual_hours?: number
  frequency: string
}

interface WithholdingData {
  income_source_id: string
  multiple_jobs: boolean
  child_dependents: number
  other_dependents: number
  extra_withholding: number
}

interface DeductionData {
  income_source_id: string
  type: string
  name: string
  amount_type: string
  amount: number
  employer_match: number
}

interface BankAccount {
  name: string
  type: string
  institution: string
  balance: number
}

interface InvestmentAccount {
  name: string
  type: string
  institution: string
  balance: number
  cost_basis?: number
}

interface RetirementAccount {
  name: string
  type: string
  institution: string
  balance: number
}

interface Property {
  name: string
  type: string
  value: number
  cost_basis?: number
}

interface Vehicle {
  name: string
  value: number
  cost_basis?: number
}

interface PersonalProperty {
  name: string
  type: string
  value: number
  cost_basis?: number
  description?: string
}

interface BusinessOwnership {
  name: string
  business_type: string
  ownership_percentage: number
  valuation: number
  cost_basis?: number
}

interface Mortgage {
  name: string
  lender: string
  balance: number
  rate: number
  payment?: number
  term?: number  // Remaining months
  original_balance?: number
}

interface CreditCard {
  name: string
  issuer: string
  balance: number
  rate?: number
  limit?: number
  min_payment?: number
}

interface StudentLoan {
  name: string
  servicer: string
  balance: number
  rate?: number
  payment?: number
  term?: number  // Remaining months
}

interface Debt {
  name: string
  lender: string
  balance: number
  rate?: number
  payment?: number
  term?: number  // Remaining months
}

interface Utility {
  name: string
  category: string
  amount: number
}

interface Insurance {
  name: string
  category: string
  amount: number
}

interface Expense {
  name: string
  category: string
  amount: number
}

export default function OnboardingPage() {
  const router = useRouter()
  const [stepData, setStepData] = useState<OnboardingStepResponse | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([])
  const [existingIncomeSources, setExistingIncomeSources] = useState<IncomeSourceDetail[]>([])
  const [reviewData, setReviewData] = useState<{
    household: Household | null
    members: HouseholdMember[]
    incomeSources: IncomeSourceDetail[]
    accountsList: Account[]
    flowsList: RecurringFlow[]
  }>({ household: null, members: [], incomeSources: [], accountsList: [], flowsList: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  // Helper to handle authentication errors - sign user out on token expiration
  const handleAuthError = useCallback((error: unknown): boolean => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      logout().then(() => router.push('/'))
      return true
    }
    return false
  }, [router])

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
      const householdList = await households.list()
      if (householdList.length === 0) {
        const newHousehold = await households.create({ name: 'My Household' })
        localStorage.setItem('householdId', newHousehold.id)
        // Sync householdId to cookie for SSR
        await updateHouseholdCookie(newHousehold.id)
      } else {
        const household = householdList[0]
        localStorage.setItem('householdId', household.id)
        // Sync householdId to cookie for SSR
        await updateHouseholdCookie(household.id)
        const onboardingComplete = household.onboardingCompleted ??
          (household as unknown as { onboarding_completed?: boolean }).onboarding_completed
        if (onboardingComplete) {
          router.push('/dashboard')
          return
        }
      }

      await loadCurrentStep()
    } catch (error) {
      if (!handleAuthError(error)) {
        // Non-auth error - could be network issue, show error
        setError('Unable to connect to server')
        setIsLoading(false)
      }
    }
  }

  const loadCurrentStep = async () => {
    setIsLoading(true)
    // Clear any pending auto-save timeout to prevent stale saves
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
      setAutoSaveTimeout(null)
    }
    try {
      const data = await onboarding.getProgress()
      setStepData(data)
      setFormData(data.draftData || {})

      // Fetch household members for income-related steps
      if (['income_sources', 'business_expenses', 'withholding', 'pretax_deductions'].includes(data.step)) {
        const memberList = await members.list()
        setHouseholdMembers(memberList)
      }

      // Fetch existing income sources for business expenses/withholding/deduction steps
      if (['business_expenses', 'withholding', 'pretax_deductions'].includes(data.step)) {
        const sourceList = await incomeSources.list()
        setExistingIncomeSources(sourceList)

        if (data.step === 'withholding') {
          // Initialize withholding data for W-2 income sources only
          // Filing status is derived from household tax filing status on the backend
          const w2Sources = sourceList.filter(src => src.incomeType === 'w2' || src.incomeType === 'w2_hourly')
          const withholdings = w2Sources.map(src => ({
            income_source_id: src.id,
            income_source_name: src.name,
            multiple_jobs: src.w2Withholding?.multipleJobsOrSpouseWorks || false,
            child_dependents: src.w2Withholding?.childTaxCreditDependents || 0,
            other_dependents: src.w2Withholding?.otherDependents || 0,
            extra_withholding: src.w2Withholding?.extraWithholding ? parseFloat(src.w2Withholding.extraWithholding) : 0,
          }))
          setFormData({ ...data.draftData, withholdings })
        }

        if (data.step === 'pretax_deductions') {
          // Initialize with existing deductions from DB
          const deductions: DeductionData[] = []
          sourceList.forEach(src => {
            src.pretaxDeductions?.forEach(ded => {
              deductions.push({
                income_source_id: src.id,
                type: ded.deductionType,
                name: ded.name,
                amount_type: ded.amountType,
                amount: parseFloat(ded.amount),
                employer_match: ded.employerMatchPercentage ? parseFloat(ded.employerMatchPercentage) * 100 : 0,
              })
            })
          })
          setFormData({ ...data.draftData, deductions })
        }
      }

      // Fetch all data for review step
      if (data.step === 'review') {
        const [householdList, memberList, sourceList, accountsData, flowsList] = await Promise.all([
          households.list(),
          members.list(),
          incomeSources.list(),
          accounts.list(),
          flows.list(),
        ])
        setReviewData({
          household: householdList[0] || null,
          members: memberList,
          incomeSources: sourceList,
          accountsList: accountsData.results || [],
          flowsList: flowsList,
        })
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        setError('Failed to load onboarding progress')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-save with debounce
  const autoSave = useCallback(async (data: Record<string, unknown>) => {
    try {
      await onboarding.saveStep(data)
    } catch (error) {
      // Sign out on auth errors, otherwise silent fail for auto-save
      handleAuthError(error)
    }
  }, [handleAuthError])

  const handleFormChange = useCallback((newData: Record<string, unknown>) => {
    setFormData(newData)

    // Debounced auto-save
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }
    const timeout = setTimeout(() => {
      autoSave(newData)
    }, 1000)
    setAutoSaveTimeout(timeout)
  }, [autoSaveTimeout, autoSave])

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
    } catch (error) {
      if (!handleAuthError(error)) {
        setError('Failed to save step')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = async () => {
    setIsSaving(true)
    try {
      // Clear any pending auto-save timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
        setAutoSaveTimeout(null)
      }
      // Save current step data before skipping
      await onboarding.saveStep(formData)

      const result = await onboarding.skip()
      if (result.success) {
        await loadCurrentStep()
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        setError('Failed to skip step')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = async () => {
    setIsSaving(true)
    try {
      // Clear any pending auto-save timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
        setAutoSaveTimeout(null)
      }
      // Save current step data before navigating back
      await onboarding.saveStep(formData)

      const result = await onboarding.back()
      if (result.success) {
        await loadCurrentStep()
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        setError('Failed to go back')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Array field helpers
  const addArrayItem = <T,>(key: string, defaultItem: T) => {
    const items = (formData[key] as T[]) || []
    handleFormChange({ ...formData, [key]: [...items, defaultItem] })
  }

  const removeArrayItem = (key: string, index: number) => {
    const items = (formData[key] as unknown[]) || []
    handleFormChange({ ...formData, [key]: items.filter((_, i) => i !== index) })
  }

  const updateArrayItem = <T,>(key: string, index: number, updates: Partial<T>) => {
    const items = (formData[key] as T[]) || []
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    handleFormChange({ ...formData, [key]: newItems })
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
  const stepDescription = STEP_DESCRIPTIONS[currentStep] || ''

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center py-6">
            <p className="text-lg mb-4">
              Your household is a business. It&apos;s time to model it like one.
            </p>
            <p className="text-muted-foreground mb-4">
              We&apos;ll walk through your income, assets, liabilities, and expenses to
              build a complete financial picture. Skip what you don&apos;t need—you can
              always add it later.
            </p>
            <p className="text-sm text-muted-foreground">
              Your data is encrypted end-to-end and never shared.
            </p>
          </div>
        )

      case 'household_info':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Household Name</Label>
              <Input
                id="name"
                value={(formData.name as string) || ''}
                onChange={(e) => handleFormChange({ ...formData, name: e.target.value })}
                placeholder="e.g., The Smith Family"
              />
            </div>
          </div>
        )

      case 'members':
        const members = (formData.members as Member[]) || []
        return (
          <div className="space-y-4">
            {members.map((member, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Member {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArrayItem('members', index)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={member.name || ''}
                      onChange={(e) => updateArrayItem<Member>('members', index, { name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={member.relationship || 'self'}
                      onChange={(e) => updateArrayItem<Member>('members', index, { relationship: e.target.value })}
                    >
                      {RELATIONSHIPS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Employment Status</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={member.employment_status || 'employed_w2'}
                      onChange={(e) => updateArrayItem<Member>('members', index, { employment_status: e.target.value })}
                    >
                      {EMPLOYMENT_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id={`primary-${index}`}
                      checked={member.is_primary || false}
                      onChange={(e) => updateArrayItem<Member>('members', index, { is_primary: e.target.checked })}
                    />
                    <Label htmlFor={`primary-${index}`}>Primary account holder</Label>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Member>('members', { name: '', relationship: 'self', is_primary: members.length === 0, employment_status: 'employed_w2' })}
            >
              + Add Member
            </Button>
          </div>
        )

      case 'tax_filing':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="filing_status">Filing Status</Label>
              <select
                id="filing_status"
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={(formData.filing_status as string) || ''}
                onChange={(e) => handleFormChange({ ...formData, filing_status: e.target.value })}
              >
                <option value="">Select filing status</option>
                {FILING_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="state">State of Residence</Label>
              <select
                id="state"
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={(formData.state as string) || ''}
                onChange={(e) => handleFormChange({ ...formData, state: e.target.value })}
              >
                <option value="">Select state</option>
                {US_STATES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'income_sources':
        const sources = (formData.sources as IncomeSource[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add each income source for all household members. At least one income source is required.
            </p>
            {sources.length === 0 && (
              <p className="text-sm text-amber-600 text-center py-2">
                Please add at least one income source to continue.
              </p>
            )}
            {sources.map((source, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Income Source {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('sources', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Household Member</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={source.member_id || ''}
                      onChange={(e) => updateArrayItem<IncomeSource>('sources', index, { member_id: e.target.value })}
                    >
                      <option value="">Select member...</option>
                      {householdMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Name/Employer</Label>
                    <Input
                      value={source.name || ''}
                      onChange={(e) => updateArrayItem<IncomeSource>('sources', index, { name: e.target.value })}
                      placeholder="e.g., Acme Corp"
                    />
                  </div>
                  <div>
                    <Label>Income Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={source.income_type || 'w2'}
                      onChange={(e) => updateArrayItem<IncomeSource>('sources', index, { income_type: e.target.value, salary: undefined, hourly_rate: undefined })}
                    >
                      {INCOME_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  {source.income_type === 'w2_hourly' ? (
                    <>
                      <div>
                        <Label>Hourly Rate ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={source.hourly_rate ?? ''}
                          onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value)
                          updateArrayItem<IncomeSource>('sources', index, { hourly_rate: isNaN(val as number) ? undefined : val })
                        }}
                          placeholder="25.00"
                        />
                      </div>
                      <div>
                        <Label>Expected Annual Hours</Label>
                        <Input
                          type="number"
                          value={source.expected_annual_hours ?? 2080}
                          onChange={(e) => updateArrayItem<IncomeSource>('sources', index, { expected_annual_hours: parseInt(e.target.value) || 2080 })}
                          placeholder="2080"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Full-time = 2080 hours</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label>
                        {source.income_type === 'rental' ? 'Annual Gross Rental Income ($)' :
                         source.income_type === 'self_employed' ? 'Annual Gross Revenue ($)' :
                         'Annual Salary/Income ($)'}
                      </Label>
                      <Input
                        type="number"
                        value={source.salary ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value)
                          updateArrayItem<IncomeSource>('sources', index, { salary: isNaN(val as number) ? undefined : val })
                        }}
                        placeholder="75000"
                      />
                      {(source.income_type === 'self_employed' || source.income_type === 'rental') && (
                        <p className="text-xs text-muted-foreground mt-1">Enter gross income before expenses</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label>Pay Frequency</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={source.frequency || 'biweekly'}
                      onChange={(e) => updateArrayItem<IncomeSource>('sources', index, { frequency: e.target.value })}
                    >
                      {PAY_FREQUENCIES.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<IncomeSource>('sources', { name: '', member_id: householdMembers[0]?.id || '', income_type: 'w2', frequency: 'biweekly' })}
            >
              + Add Income Source
            </Button>
          </div>
        )

      case 'business_expenses':
        const businessExpenses = (formData.expenses as BusinessExpense[]) || []
        // Determine which expense categories to show based on income types
        const incomeSources = (formData.sources as IncomeSource[]) || []
        const hasSelfEmployment = existingIncomeSources.some(s => s.incomeType === 'self_employed') ||
          incomeSources.some(s => s.income_type === 'self_employed')
        const hasRentalIncome = existingIncomeSources.some(s => s.incomeType === 'rental') ||
          incomeSources.some(s => s.income_type === 'rental')
        const availableCategories = [
          ...(hasSelfEmployment ? BUSINESS_EXPENSE_CATEGORIES : []),
          ...(hasRentalIncome ? RENTAL_EXPENSE_CATEGORIES : []),
        ]
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your business or rental property expenses to calculate your net taxable income.
              These expenses reduce your taxable income from self-employment or rental sources.
            </p>
            {businessExpenses.map((expense, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Expense {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('expenses', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Expense Name</Label>
                    <Input
                      value={expense.name || ''}
                      onChange={(e) => updateArrayItem<BusinessExpense>('expenses', index, { name: e.target.value })}
                      placeholder="e.g., Office Rent"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={expense.category || availableCategories[0]?.value || 'business_other'}
                      onChange={(e) => updateArrayItem<BusinessExpense>('expenses', index, { category: e.target.value })}
                    >
                      {availableCategories.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Monthly Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={expense.amount ?? ''}
                      onChange={(e) => updateArrayItem<BusinessExpense>('expenses', index, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="500.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<BusinessExpense>('expenses', {
                name: '',
                category: availableCategories[0]?.value || 'business_other',
                amount: 0
              })}
            >
              + Add Business/Rental Expense
            </Button>
            {businessExpenses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No expenses yet? Click the button above to add business or rental expenses.
              </p>
            )}
          </div>
        )

      case 'withholding':
        const withholdings = (formData.withholdings as (WithholdingData & { income_source_name?: string })[]) || []
        const w2Sources = existingIncomeSources.filter(src => src.incomeType === 'w2' || src.incomeType === 'w2_hourly')
        const w2SourcesExist = w2Sources.length > 0
        // Find W-2 sources that don't have withholding entries yet
        const existingWithholdingSourceIds = new Set(withholdings.map(wh => wh.income_source_id))
        const availableW2Sources = w2Sources.filter(src => !existingWithholdingSourceIds.has(src.id))
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure your W-4 tax withholding settings for each W-2 income source.
              Your filing status is based on your household tax filing selection from earlier.
            </p>
            {!w2SourcesExist ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No W-2 income sources found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This step only applies to W-2 employment income. You can skip it.
                </p>
              </div>
            ) : (
              <>
                {withholdings.map((wh, index) => (
                  <div key={wh.income_source_id || index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{wh.income_source_name || `Income Source ${index + 1}`}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newWithholdings = withholdings.filter((_, i) => i !== index)
                          handleFormChange({ ...formData, withholdings: newWithholdings })
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`multiple-jobs-${index}`}
                          checked={wh.multiple_jobs || false}
                          onChange={(e) => {
                            const newWithholdings = [...withholdings]
                            newWithholdings[index] = { ...wh, multiple_jobs: e.target.checked }
                            handleFormChange({ ...formData, withholdings: newWithholdings })
                          }}
                        />
                        <Label htmlFor={`multiple-jobs-${index}`}>
                          Multiple jobs or spouse works (W-4 Step 2c)
                        </Label>
                      </div>
                      <div>
                        <Label>Child dependents (under 17)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={wh.child_dependents ?? 0}
                          onChange={(e) => {
                            const newWithholdings = [...withholdings]
                            newWithholdings[index] = { ...wh, child_dependents: parseInt(e.target.value) || 0 }
                            handleFormChange({ ...formData, withholdings: newWithholdings })
                          }}
                          placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground mt-1">$2,000 credit each</p>
                      </div>
                      <div>
                        <Label>Other dependents</Label>
                        <Input
                          type="number"
                          min="0"
                          value={wh.other_dependents ?? 0}
                          onChange={(e) => {
                            const newWithholdings = [...withholdings]
                            newWithholdings[index] = { ...wh, other_dependents: parseInt(e.target.value) || 0 }
                            handleFormChange({ ...formData, withholdings: newWithholdings })
                          }}
                          placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground mt-1">$500 credit each</p>
                      </div>
                      <div className="col-span-2">
                        <Label>Extra withholding per paycheck ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={wh.extra_withholding ?? 0}
                          onChange={(e) => {
                            const newWithholdings = [...withholdings]
                            newWithholdings[index] = { ...wh, extra_withholding: parseFloat(e.target.value) || 0 }
                            handleFormChange({ ...formData, withholdings: newWithholdings })
                          }}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-muted-foreground mt-1">W-4 Step 4c - Additional amount to withhold</p>
                      </div>
                    </div>
                  </div>
                ))}
                {availableW2Sources.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const src = availableW2Sources[0]
                      const newWithholding = {
                        income_source_id: src.id,
                        income_source_name: src.name,
                        multiple_jobs: false,
                        child_dependents: 0,
                        other_dependents: 0,
                        extra_withholding: 0,
                      }
                      handleFormChange({ ...formData, withholdings: [...withholdings, newWithholding] })
                    }}
                  >
                    + Add Withholding for {availableW2Sources[0].name}
                  </Button>
                )}
                {withholdings.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    No withholding entries configured. Click the button above to add one.
                  </p>
                )}
              </>
            )}
          </div>
        )

      case 'pretax_deductions':
        const deductions = (formData.deductions as DeductionData[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add pre-tax deductions like 401(k) contributions, HSA, health insurance premiums, etc. These reduce your taxable income.
            </p>
            {existingIncomeSources.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No income sources found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Go back to add income sources, or skip this step.
                </p>
              </div>
            ) : (
              <>
                {deductions.map((ded, index) => {
                  return (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Deduction {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newDeductions = deductions.filter((_, i) => i !== index)
                            handleFormChange({ ...formData, deductions: newDeductions })
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Income Source</Label>
                          <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3"
                            value={ded.income_source_id || ''}
                            onChange={(e) => {
                              const newDeductions = [...deductions]
                              newDeductions[index] = { ...ded, income_source_id: e.target.value }
                              handleFormChange({ ...formData, deductions: newDeductions })
                            }}
                          >
                            <option value="">Select income source...</option>
                            {existingIncomeSources.map(src => (
                              <option key={src.id} value={src.id}>{src.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Deduction Type</Label>
                          <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3"
                            value={ded.type || ''}
                            onChange={(e) => {
                              const newDeductions = [...deductions]
                              newDeductions[index] = { ...ded, type: e.target.value }
                              handleFormChange({ ...formData, deductions: newDeductions })
                            }}
                          >
                            <option value="">Select type...</option>
                            {PRETAX_DEDUCTION_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Name (optional)</Label>
                          <Input
                            value={ded.name || ''}
                            onChange={(e) => {
                              const newDeductions = [...deductions]
                              newDeductions[index] = { ...ded, name: e.target.value }
                              handleFormChange({ ...formData, deductions: newDeductions })
                            }}
                            placeholder="e.g., Company 401(k)"
                          />
                        </div>
                        <div>
                          <Label>Amount Type</Label>
                          <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3"
                            value={ded.amount_type || 'fixed'}
                            onChange={(e) => {
                              const newDeductions = [...deductions]
                              newDeductions[index] = { ...ded, amount_type: e.target.value }
                              handleFormChange({ ...formData, deductions: newDeductions })
                            }}
                          >
                            {AMOUNT_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>
                            {ded.amount_type === 'percentage' ? 'Percentage (%)' : 'Amount per Paycheck ($)'}
                          </Label>
                          <Input
                            type="number"
                            step={ded.amount_type === 'percentage' ? '0.1' : '0.01'}
                            value={ded.amount ?? ''}
                            onChange={(e) => {
                              const newDeductions = [...deductions]
                              newDeductions[index] = { ...ded, amount: parseFloat(e.target.value) || 0 }
                              handleFormChange({ ...formData, deductions: newDeductions })
                            }}
                            placeholder={ded.amount_type === 'percentage' ? '6' : '500'}
                          />
                        </div>
                        <div>
                          <Label>Employer Match (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={ded.employer_match ?? ''}
                            onChange={(e) => {
                              const newDeductions = [...deductions]
                              newDeductions[index] = { ...ded, employer_match: parseFloat(e.target.value) || 0 }
                              handleFormChange({ ...formData, deductions: newDeductions })
                            }}
                            placeholder="0"
                          />
                          <p className="text-xs text-muted-foreground mt-1">e.g., 50 = employer matches 50% of your contribution</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Button
                  variant="outline"
                  onClick={() => {
                    const defaultSourceId = existingIncomeSources[0]?.id || ''
                    const newDeduction: DeductionData = {
                      income_source_id: defaultSourceId,
                      type: 'traditional_401k',
                      name: '',
                      amount_type: 'percentage',
                      amount: 0,
                      employer_match: 0,
                    }
                    handleFormChange({ ...formData, deductions: [...deductions, newDeduction] })
                  }}
                >
                  + Add Pre-Tax Deduction
                </Button>
                {deductions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    No pre-tax deductions? You can skip this step.
                  </p>
                )}
              </>
            )}
          </div>
        )

      case 'bank_accounts':
        const bankAccounts = (formData.accounts as BankAccount[]) || []
        return (
          <div className="space-y-4">
            {bankAccounts.map((account, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Account {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('accounts', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Account Name</Label>
                    <Input
                      value={account.name || ''}
                      onChange={(e) => updateArrayItem<BankAccount>('accounts', index, { name: e.target.value })}
                      placeholder="e.g., Primary Checking"
                    />
                  </div>
                  <div>
                    <Label>Account Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={account.type || 'checking'}
                      onChange={(e) => updateArrayItem<BankAccount>('accounts', index, { type: e.target.value })}
                    >
                      {BANK_ACCOUNT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Institution</Label>
                    <Input
                      value={account.institution || ''}
                      onChange={(e) => updateArrayItem<BankAccount>('accounts', index, { institution: e.target.value })}
                      placeholder="e.g., Chase Bank"
                    />
                  </div>
                  <div>
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={account.balance ?? ''}
                      onChange={(e) => updateArrayItem<BankAccount>('accounts', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<BankAccount>('accounts', { name: '', type: 'checking', institution: '', balance: 0 })}
            >
              + Add Bank Account
            </Button>
          </div>
        )

      case 'investments':
        const investments = (formData.accounts as InvestmentAccount[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track both current market value and what you originally paid (cost basis) to understand your unrealized gains.
            </p>
            {investments.map((account, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Investment Account {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('accounts', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Account Name</Label>
                    <Input
                      value={account.name || ''}
                      onChange={(e) => updateArrayItem<InvestmentAccount>('accounts', index, { name: e.target.value })}
                      placeholder="e.g., Brokerage Account"
                    />
                  </div>
                  <div>
                    <Label>Account Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={account.type || 'brokerage'}
                      onChange={(e) => updateArrayItem<InvestmentAccount>('accounts', index, { type: e.target.value })}
                    >
                      {INVESTMENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Institution</Label>
                    <Input
                      value={account.institution || ''}
                      onChange={(e) => updateArrayItem<InvestmentAccount>('accounts', index, { institution: e.target.value })}
                      placeholder="e.g., Fidelity"
                    />
                  </div>
                  <div>
                    <Label>Current Market Value</Label>
                    <Input
                      type="number"
                      value={account.balance ?? ''}
                      onChange={(e) => updateArrayItem<InvestmentAccount>('accounts', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Cost Basis (Total Amount Invested)</Label>
                    <Input
                      type="number"
                      value={account.cost_basis ?? ''}
                      onChange={(e) => updateArrayItem<InvestmentAccount>('accounts', index, { cost_basis: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The total amount you invested. Unrealized gain = Market Value - Cost Basis
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<InvestmentAccount>('accounts', { name: '', type: 'brokerage', institution: '', balance: 0 })}
            >
              + Add Investment Account
            </Button>
            {investments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No investment accounts? You can continue without adding any.
              </p>
            )}
          </div>
        )

      case 'retirement':
        const retirementAccounts = (formData.accounts as RetirementAccount[]) || []
        return (
          <div className="space-y-4">
            {retirementAccounts.map((account, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Retirement Account {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('accounts', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Account Name</Label>
                    <Input
                      value={account.name || ''}
                      onChange={(e) => updateArrayItem<RetirementAccount>('accounts', index, { name: e.target.value })}
                      placeholder="e.g., Company 401(k)"
                    />
                  </div>
                  <div>
                    <Label>Account Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={account.type || 'traditional_401k'}
                      onChange={(e) => updateArrayItem<RetirementAccount>('accounts', index, { type: e.target.value })}
                    >
                      {RETIREMENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Institution</Label>
                    <Input
                      value={account.institution || ''}
                      onChange={(e) => updateArrayItem<RetirementAccount>('accounts', index, { institution: e.target.value })}
                      placeholder="e.g., Vanguard"
                    />
                  </div>
                  <div>
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={account.balance ?? ''}
                      onChange={(e) => updateArrayItem<RetirementAccount>('accounts', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<RetirementAccount>('accounts', { name: '', type: 'traditional_401k', institution: '', balance: 0 })}
            >
              + Add Retirement Account
            </Button>
          </div>
        )

      case 'real_estate':
        const properties = (formData.properties as Property[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track both current market value and purchase price to understand your equity and unrealized gains.
            </p>
            {properties.map((property, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Property {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('properties', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Property Name</Label>
                    <Input
                      value={property.name || ''}
                      onChange={(e) => updateArrayItem<Property>('properties', index, { name: e.target.value })}
                      placeholder="e.g., 123 Main St"
                    />
                  </div>
                  <div>
                    <Label>Property Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={property.type || 'primary_residence'}
                      onChange={(e) => updateArrayItem<Property>('properties', index, { type: e.target.value })}
                    >
                      {PROPERTY_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Current Market Value</Label>
                    <Input
                      type="number"
                      value={property.value ?? ''}
                      onChange={(e) => updateArrayItem<Property>('properties', index, { value: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Purchase Price (Cost Basis)</Label>
                    <Input
                      type="number"
                      value={property.cost_basis ?? ''}
                      onChange={(e) => updateArrayItem<Property>('properties', index, { cost_basis: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      What you paid for the property
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Property>('properties', { name: '', type: 'primary_residence', value: 0 })}
            >
              + Add Property
            </Button>
            {properties.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No real estate? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'vehicles':
        const vehicles = (formData.vehicles as Vehicle[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track current value and what you paid to see depreciation or appreciation over time.
            </p>
            {vehicles.map((vehicle, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Vehicle {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('vehicles', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Vehicle Description</Label>
                    <Input
                      value={vehicle.name || ''}
                      onChange={(e) => updateArrayItem<Vehicle>('vehicles', index, { name: e.target.value })}
                      placeholder="e.g., 2022 Toyota Camry"
                    />
                  </div>
                  <div>
                    <Label>Current Market Value</Label>
                    <Input
                      type="number"
                      value={vehicle.value ?? ''}
                      onChange={(e) => updateArrayItem<Vehicle>('vehicles', index, { value: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Purchase Price (Cost Basis)</Label>
                    <Input
                      type="number"
                      value={vehicle.cost_basis ?? ''}
                      onChange={(e) => updateArrayItem<Vehicle>('vehicles', index, { cost_basis: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Vehicle>('vehicles', { name: '', value: 0 })}
            >
              + Add Vehicle
            </Button>
            {vehicles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No vehicles? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'personal_property':
        const personalItems = (formData.personal_property as PersonalProperty[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track valuable personal property like jewelry, precious metals, collectibles, firearms, and other assets.
              Include both current market value and what you paid to understand unrealized gains.
            </p>
            {personalItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Item {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('personal_property', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Item Name</Label>
                    <Input
                      value={item.name || ''}
                      onChange={(e) => updateArrayItem<PersonalProperty>('personal_property', index, { name: e.target.value })}
                      placeholder="e.g., Gold coins, Rolex watch"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={item.type || 'jewelry'}
                      onChange={(e) => updateArrayItem<PersonalProperty>('personal_property', index, { type: e.target.value })}
                    >
                      {PERSONAL_PROPERTY_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Current Market Value</Label>
                    <Input
                      type="number"
                      value={item.value ?? ''}
                      onChange={(e) => updateArrayItem<PersonalProperty>('personal_property', index, { value: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Purchase Price (Cost Basis)</Label>
                    <Input
                      type="number"
                      value={item.cost_basis ?? ''}
                      onChange={(e) => updateArrayItem<PersonalProperty>('personal_property', index, { cost_basis: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={item.description || ''}
                      onChange={(e) => updateArrayItem<PersonalProperty>('personal_property', index, { description: e.target.value })}
                      placeholder="e.g., 5oz gold eagles, serial numbers, condition notes"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<PersonalProperty>('personal_property', { name: '', type: 'jewelry', value: 0 })}
            >
              + Add Personal Property
            </Button>
            {personalItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No valuables to track? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'business_ownership':
        const businesses = (formData.business_ownership as BusinessOwnership[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track ownership stakes in businesses, partnerships, or LLCs. This is a key component of your net worth.
            </p>
            {businesses.map((business, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Business {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('business_ownership', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Business Name</Label>
                    <Input
                      value={business.name || ''}
                      onChange={(e) => updateArrayItem<BusinessOwnership>('business_ownership', index, { name: e.target.value })}
                      placeholder="e.g., ABC Consulting LLC"
                    />
                  </div>
                  <div>
                    <Label>Business Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={business.business_type || 'llc'}
                      onChange={(e) => updateArrayItem<BusinessOwnership>('business_ownership', index, { business_type: e.target.value })}
                    >
                      {BUSINESS_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Ownership Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={business.ownership_percentage ?? ''}
                      onChange={(e) => updateArrayItem<BusinessOwnership>('business_ownership', index, { ownership_percentage: parseFloat(e.target.value) || 0 })}
                      placeholder="100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Your share of ownership</p>
                  </div>
                  <div>
                    <Label>Your Equity Value (Market)</Label>
                    <Input
                      type="number"
                      value={business.valuation ?? ''}
                      onChange={(e) => updateArrayItem<BusinessOwnership>('business_ownership', index, { valuation: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Current value of your stake</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Capital Invested (Cost Basis)</Label>
                    <Input
                      type="number"
                      value={business.cost_basis ?? ''}
                      onChange={(e) => updateArrayItem<BusinessOwnership>('business_ownership', index, { cost_basis: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Total capital you&apos;ve contributed to the business</p>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<BusinessOwnership>('business_ownership', { name: '', business_type: 'llc', ownership_percentage: 100, valuation: 0 })}
            >
              + Add Business Ownership
            </Button>
            {businesses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No business ownership? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'mortgages':
        const mortgages = (formData.mortgages as Mortgage[]) || []
        return (
          <div className="space-y-4">
            {mortgages.map((mortgage, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Mortgage {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('mortgages', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mortgage Name</Label>
                    <Input
                      value={mortgage.name || ''}
                      onChange={(e) => updateArrayItem<Mortgage>('mortgages', index, { name: e.target.value })}
                      placeholder="e.g., Home Mortgage"
                    />
                  </div>
                  <div>
                    <Label>Lender</Label>
                    <Input
                      value={mortgage.lender || ''}
                      onChange={(e) => updateArrayItem<Mortgage>('mortgages', index, { lender: e.target.value })}
                      placeholder="e.g., Wells Fargo"
                    />
                  </div>
                  <div>
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={mortgage.balance ?? ''}
                      onChange={(e) => updateArrayItem<Mortgage>('mortgages', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={mortgage.rate ?? ''}
                      onChange={(e) => updateArrayItem<Mortgage>('mortgages', index, { rate: parseFloat(e.target.value) || 0 })}
                      placeholder="6.5"
                    />
                  </div>
                  <div>
                    <Label>Remaining Term (months)</Label>
                    <Input
                      type="number"
                      value={mortgage.term ?? ''}
                      onChange={(e) => updateArrayItem<Mortgage>('mortgages', index, { term: parseInt(e.target.value) || undefined })}
                      placeholder="e.g., 300 (25 years)"
                    />
                  </div>
                  <div>
                    <Label>Monthly Payment</Label>
                    <Input
                      type="number"
                      value={mortgage.payment ?? ''}
                      onChange={(e) => updateArrayItem<Mortgage>('mortgages', index, { payment: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter payment OR term + rate to calculate</p>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Mortgage>('mortgages', { name: '', lender: '', balance: 0, rate: 0 })}
            >
              + Add Mortgage
            </Button>
            {mortgages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No mortgages? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'credit_cards':
        const cards = (formData.cards as CreditCard[]) || []
        return (
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Credit Card {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('cards', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Card Name</Label>
                    <Input
                      value={card.name || ''}
                      onChange={(e) => updateArrayItem<CreditCard>('cards', index, { name: e.target.value })}
                      placeholder="e.g., Chase Sapphire"
                    />
                  </div>
                  <div>
                    <Label>Issuer</Label>
                    <Input
                      value={card.issuer || ''}
                      onChange={(e) => updateArrayItem<CreditCard>('cards', index, { issuer: e.target.value })}
                      placeholder="e.g., Chase"
                    />
                  </div>
                  <div>
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={card.balance ?? ''}
                      onChange={(e) => updateArrayItem<CreditCard>('cards', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>APR (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={card.rate ?? ''}
                      onChange={(e) => updateArrayItem<CreditCard>('cards', index, { rate: parseFloat(e.target.value) || undefined })}
                      placeholder="24.99"
                    />
                  </div>
                  <div>
                    <Label>Minimum Payment</Label>
                    <Input
                      type="number"
                      value={card.min_payment ?? ''}
                      onChange={(e) => updateArrayItem<CreditCard>('cards', index, { min_payment: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Credit Limit</Label>
                    <Input
                      type="number"
                      value={card.limit ?? ''}
                      onChange={(e) => updateArrayItem<CreditCard>('cards', index, { limit: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<CreditCard>('cards', { name: '', issuer: '', balance: 0 })}
            >
              + Add Credit Card
            </Button>
            {cards.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No credit card debt? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'student_loans':
        const studentLoans = (formData.loans as StudentLoan[]) || []
        return (
          <div className="space-y-4">
            {studentLoans.map((loan, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Student Loan {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('loans', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Loan Name</Label>
                    <Input
                      value={loan.name || ''}
                      onChange={(e) => updateArrayItem<StudentLoan>('loans', index, { name: e.target.value })}
                      placeholder="e.g., Federal Direct Loan"
                    />
                  </div>
                  <div>
                    <Label>Servicer</Label>
                    <Input
                      value={loan.servicer || ''}
                      onChange={(e) => updateArrayItem<StudentLoan>('loans', index, { servicer: e.target.value })}
                      placeholder="e.g., Nelnet"
                    />
                  </div>
                  <div>
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={loan.balance ?? ''}
                      onChange={(e) => updateArrayItem<StudentLoan>('loans', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={loan.rate ?? ''}
                      onChange={(e) => updateArrayItem<StudentLoan>('loans', index, { rate: parseFloat(e.target.value) || undefined })}
                      placeholder="5.5"
                    />
                  </div>
                  <div>
                    <Label>Remaining Term (months)</Label>
                    <Input
                      type="number"
                      value={loan.term ?? ''}
                      onChange={(e) => updateArrayItem<StudentLoan>('loans', index, { term: parseInt(e.target.value) || undefined })}
                      placeholder="e.g., 120 (10 years)"
                    />
                  </div>
                  <div>
                    <Label>Monthly Payment</Label>
                    <Input
                      type="number"
                      value={loan.payment ?? ''}
                      onChange={(e) => updateArrayItem<StudentLoan>('loans', index, { payment: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter payment OR term + rate to calculate</p>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<StudentLoan>('loans', { name: '', servicer: '', balance: 0 })}
            >
              + Add Student Loan
            </Button>
            {studentLoans.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No student loans? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'other_debts':
        const debts = (formData.debts as Debt[]) || []
        return (
          <div className="space-y-4">
            {debts.map((debt, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Debt {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('debts', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Debt Name</Label>
                    <Input
                      value={debt.name || ''}
                      onChange={(e) => updateArrayItem<Debt>('debts', index, { name: e.target.value })}
                      placeholder="e.g., Personal Loan"
                    />
                  </div>
                  <div>
                    <Label>Lender</Label>
                    <Input
                      value={debt.lender || ''}
                      onChange={(e) => updateArrayItem<Debt>('debts', index, { lender: e.target.value })}
                      placeholder="e.g., SoFi"
                    />
                  </div>
                  <div>
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={debt.balance ?? ''}
                      onChange={(e) => updateArrayItem<Debt>('debts', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={debt.rate ?? ''}
                      onChange={(e) => updateArrayItem<Debt>('debts', index, { rate: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Remaining Term (months)</Label>
                    <Input
                      type="number"
                      value={debt.term ?? ''}
                      onChange={(e) => updateArrayItem<Debt>('debts', index, { term: parseInt(e.target.value) || undefined })}
                      placeholder="e.g., 60 (5 years)"
                    />
                  </div>
                  <div>
                    <Label>Monthly Payment</Label>
                    <Input
                      type="number"
                      value={debt.payment ?? ''}
                      onChange={(e) => updateArrayItem<Debt>('debts', index, { payment: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter payment OR term + rate to calculate</p>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Debt>('debts', { name: '', lender: '', balance: 0 })}
            >
              + Add Other Debt
            </Button>
            {debts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No other debts? You can skip this step.
              </p>
            )}
          </div>
        )

      case 'housing_expenses':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you rent, enter your monthly rent. If you own, enter property tax and HOA fees (mortgage is tracked separately).
            </p>
            <div>
              <Label htmlFor="rent">Monthly Rent</Label>
              <Input
                id="rent"
                type="number"
                value={(formData.rent as number) ?? ''}
                onChange={(e) => handleFormChange({ ...formData, rent: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="property_tax">Monthly Property Tax</Label>
              <Input
                id="property_tax"
                type="number"
                value={(formData.property_tax as number) ?? ''}
                onChange={(e) => handleFormChange({ ...formData, property_tax: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="hoa">Monthly HOA Fees</Label>
              <Input
                id="hoa"
                type="number"
                value={(formData.hoa as number) ?? ''}
                onChange={(e) => handleFormChange({ ...formData, hoa: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>
          </div>
        )

      case 'utilities':
        const utilities = (formData.utilities as Utility[]) || []
        return (
          <div className="space-y-4">
            {utilities.map((utility, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Utility {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('utilities', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={utility.name || ''}
                      onChange={(e) => updateArrayItem<Utility>('utilities', index, { name: e.target.value })}
                      placeholder="e.g., Electric Bill"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={utility.category || 'electricity'}
                      onChange={(e) => updateArrayItem<Utility>('utilities', index, { category: e.target.value })}
                    >
                      {UTILITY_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Monthly Amount</Label>
                    <Input
                      type="number"
                      value={utility.amount ?? ''}
                      onChange={(e) => updateArrayItem<Utility>('utilities', index, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Utility>('utilities', { name: '', category: 'electricity', amount: 0 })}
            >
              + Add Utility
            </Button>
          </div>
        )

      case 'insurance':
        const insurances = (formData.insurance as Insurance[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add insurance premiums not already deducted from your paycheck.
            </p>
            {insurances.map((ins, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Insurance {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('insurance', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={ins.name || ''}
                      onChange={(e) => updateArrayItem<Insurance>('insurance', index, { name: e.target.value })}
                      placeholder="e.g., Health Insurance"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={ins.category || 'health_insurance'}
                      onChange={(e) => updateArrayItem<Insurance>('insurance', index, { category: e.target.value })}
                    >
                      {INSURANCE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Monthly Premium</Label>
                    <Input
                      type="number"
                      value={ins.amount ?? ''}
                      onChange={(e) => updateArrayItem<Insurance>('insurance', index, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Insurance>('insurance', { name: '', category: 'health_insurance', amount: 0 })}
            >
              + Add Insurance
            </Button>
          </div>
        )

      case 'transportation':
        const transportExpenses = (formData.expenses as Expense[]) || []
        return (
          <div className="space-y-4">
            {transportExpenses.map((exp, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Expense {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('expenses', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={exp.name || ''}
                      onChange={(e) => updateArrayItem<Expense>('expenses', index, { name: e.target.value })}
                      placeholder="e.g., Gas"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                      value={exp.category || 'gas_fuel'}
                      onChange={(e) => updateArrayItem<Expense>('expenses', index, { category: e.target.value })}
                    >
                      {TRANSPORT_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Monthly Amount</Label>
                    <Input
                      type="number"
                      value={exp.amount ?? ''}
                      onChange={(e) => updateArrayItem<Expense>('expenses', index, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Expense>('expenses', { name: '', category: 'gas_fuel', amount: 0 })}
            >
              + Add Transportation Expense
            </Button>
          </div>
        )

      case 'food':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="groceries">Monthly Groceries</Label>
              <Input
                id="groceries"
                type="number"
                value={(formData.groceries as number) ?? ''}
                onChange={(e) => handleFormChange({ ...formData, groceries: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="dining_out">Monthly Dining Out</Label>
              <Input
                id="dining_out"
                type="number"
                value={(formData.dining_out as number) ?? ''}
                onChange={(e) => handleFormChange({ ...formData, dining_out: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>
          </div>
        )

      case 'other_expenses':
        const otherExpenses = (formData.expenses as Expense[]) || []
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add any other recurring expenses not covered in previous steps.
            </p>
            {otherExpenses.map((exp, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Expense {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('expenses', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={exp.name || ''}
                      onChange={(e) => updateArrayItem<Expense>('expenses', index, { name: e.target.value })}
                      placeholder="e.g., Gym Membership"
                    />
                  </div>
                  <div>
                    <Label>Monthly Amount</Label>
                    <Input
                      type="number"
                      value={exp.amount ?? ''}
                      onChange={(e) => updateArrayItem<Expense>('expenses', index, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => addArrayItem<Expense>('expenses', { name: '', category: 'miscellaneous', amount: 0 })}
            >
              + Add Other Expense
            </Button>
          </div>
        )

      case 'review':
        const formatCurrency = (amount: number | string | undefined) => {
          if (amount === undefined || amount === null) return '$0'
          const num = typeof amount === 'string' ? parseFloat(amount) : amount
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
        }

        // Asset types - must match backend ASSET_TYPES
        const assetAccounts = reviewData.accountsList.filter(a =>
          [
            // Cash & Equivalents
            'checking', 'savings', 'money_market', 'cd', 'cash',
            // Investments
            'brokerage', 'crypto',
            // Retirement
            'traditional_401k', 'roth_401k', 'traditional_ira', 'roth_ira',
            'sep_ira', 'simple_ira', 'tsp', 'pension', 'annuity', 'hsa',
            // Real Property
            'primary_residence', 'rental_property', 'vacation_property', 'land', 'commercial_property',
            // Personal Property
            'vehicle', 'boat', 'jewelry', 'other_asset',
            // Business
            'business_equity',
            // Receivables
            'accounts_receivable', 'loans_receivable', 'tax_refund'
          ].includes(a.accountType || '')
        )
        // Liability types - must match backend LIABILITY_TYPES
        const liabilityAccounts = reviewData.accountsList.filter(a =>
          [
            // Revolving Debt
            'credit_card', 'store_card', 'heloc', 'personal_loc', 'business_loc',
            // Mortgages
            'primary_mortgage', 'rental_mortgage', 'second_mortgage',
            // Installment Loans
            'auto_loan', 'personal_loan', 'student_loan_federal', 'student_loan_private',
            'boat_loan', 'medical_debt', 'tax_debt', 'family_loan', 'other_liability'
          ].includes(a.accountType || '')
        )
        const expenseFlows = reviewData.flowsList.filter(f => f.flowType === 'expense')

        const totalAssets = assetAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || '0'), 0)
        const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || '0'), 0)
        const totalMonthlyExpenses = expenseFlows.reduce((sum, f) => {
          const amount = parseFloat(f.amount || '0')
          switch (f.frequency) {
            case 'weekly': return sum + (amount * 52 / 12)
            case 'biweekly': return sum + (amount * 26 / 12)
            case 'monthly': return sum + amount
            case 'quarterly': return sum + (amount / 3)
            case 'annually': return sum + (amount / 12)
            default: return sum + amount
          }
        }, 0)
        const totalAnnualIncome = reviewData.incomeSources.reduce((sum, src) => {
          if (src.grossAnnualSalary) return sum + parseFloat(src.grossAnnualSalary)
          if (src.hourlyRate && src.expectedAnnualHours) {
            return sum + (parseFloat(src.hourlyRate) * src.expectedAnnualHours)
          }
          return sum
        }, 0)

        return (
          <div className="space-y-6">
            <p className="text-muted-foreground text-center mb-4">
              Review your financial profile before completing setup. You can always update this later.
            </p>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Annual Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAnnualIncome)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalMonthlyExpenses)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAssets)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Liabilities</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalLiabilities)}</p>
              </div>
            </div>

            {/* Household & Members */}
            {reviewData.household && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Household</h3>
                <p className="text-sm">{reviewData.household.name}</p>
                <p className="text-sm text-muted-foreground">
                  Filing: {FILING_STATUSES.find(s => s.value === reviewData.household?.taxFilingStatus)?.label || reviewData.household.taxFilingStatus}
                  {reviewData.household.stateOfResidence && ` | State: ${reviewData.household.stateOfResidence}`}
                </p>
                {reviewData.members.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Members: {reviewData.members.map(m => m.name).join(', ')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Income Sources */}
            {reviewData.incomeSources.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Income Sources ({reviewData.incomeSources.length})</h3>
                <div className="space-y-2">
                  {reviewData.incomeSources.map((src, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{src.name} ({INCOME_TYPES.find(t => t.value === src.incomeType)?.label || src.incomeType})</span>
                      <span className="font-medium">
                        {src.grossAnnualSalary ? formatCurrency(src.grossAnnualSalary) + '/yr' :
                         src.hourlyRate ? `${formatCurrency(src.hourlyRate)}/hr` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {assetAccounts.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Assets ({assetAccounts.length})</h3>
                <div className="space-y-2">
                  {assetAccounts.map((acct, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{acct.name}</span>
                      <span className="font-medium">{formatCurrency(acct.currentBalance)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liabilities */}
            {liabilityAccounts.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Liabilities ({liabilityAccounts.length})</h3>
                <div className="space-y-2">
                  {liabilityAccounts.map((acct, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{acct.name}</span>
                      <span className="font-medium text-red-600">{formatCurrency(acct.currentBalance)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses */}
            {expenseFlows.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Recurring Expenses ({expenseFlows.length})</h3>
                <div className="space-y-2">
                  {expenseFlows.map((flow, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{flow.name}</span>
                      <span className="font-medium">{formatCurrency(flow.amount)}/{flow.frequency === 'monthly' ? 'mo' : flow.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Net Worth */}
            <div className="bg-gradient-to-r from-indigo-50 to-teal-50 dark:from-indigo-950 dark:to-teal-950 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Net Worth</p>
              <p className={`text-3xl font-bold ${totalAssets - totalLiabilities >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalAssets - totalLiabilities)}
              </p>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center py-6">
            <p className="text-lg mb-4">
              Congratulations! Your financial profile is set up.
            </p>
            <p className="text-muted-foreground">
              You can now view your dashboard and start modeling scenarios.
            </p>
          </div>
        )

      default:
        return (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Step: {stepLabel}
            </p>
          </div>
        )
    }
  }

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
            <CardDescription>{stepDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderStepContent()}

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
