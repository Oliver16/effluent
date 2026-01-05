'use client'

import { useEffect, useState, useCallback } from 'react'
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

const STEP_DESCRIPTIONS: Record<string, string> = {
  welcome: 'Configure your household\'s operating model',
  household_info: 'Give your household a name',
  members: 'Add the people in your household',
  tax_filing: 'Set your tax filing status and state',
  income_sources: 'Add your sources of income',
  income_details: 'Provide details about your income',
  withholding: 'Configure your tax withholding settings',
  pretax_deductions: 'Add pre-tax deductions like 401(k) contributions',
  bank_accounts: 'Add your checking and savings accounts',
  investments: 'Add your investment and brokerage accounts',
  retirement: 'Add your retirement accounts',
  real_estate: 'Add any real estate you own',
  vehicles: 'Add your vehicles',
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
  frequency: string
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
}

interface Vehicle {
  name: string
  value: number
}

interface Mortgage {
  name: string
  lender: string
  balance: number
  rate: number
  payment?: number
}

interface CreditCard {
  name: string
  issuer: string
  balance: number
  rate?: number
  limit?: number
}

interface StudentLoan {
  name: string
  servicer: string
  balance: number
  rate?: number
  payment?: number
}

interface Debt {
  name: string
  lender: string
  balance: number
  rate?: number
  payment?: number
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
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

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
  }

  const loadCurrentStep = async () => {
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
  }

  // Auto-save with debounce
  const autoSave = useCallback(async (data: Record<string, unknown>) => {
    try {
      await onboarding.saveStep(data)
    } catch {
      // Silent fail for auto-save
    }
  }, [])

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
                      onChange={(e) => updateArrayItem<IncomeSource>('sources', index, { income_type: e.target.value })}
                    >
                      {INCOME_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Annual Salary/Income</Label>
                    <Input
                      type="number"
                      value={source.salary || ''}
                      onChange={(e) => updateArrayItem<IncomeSource>('sources', index, { salary: parseFloat(e.target.value) || undefined })}
                      placeholder="75000"
                    />
                  </div>
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
              onClick={() => addArrayItem<IncomeSource>('sources', { name: '', income_type: 'w2', frequency: 'biweekly' })}
            >
              + Add Income Source
            </Button>
          </div>
        )

      case 'income_details':
      case 'withholding':
      case 'pretax_deductions':
        return (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              This step allows you to configure additional income details.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              You can skip this for now and configure it later from your dashboard.
            </p>
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
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={account.balance ?? ''}
                      onChange={(e) => updateArrayItem<InvestmentAccount>('accounts', index, { balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
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
                No investment accounts? You can skip this step.
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
                  <div className="col-span-2">
                    <Label>Estimated Value</Label>
                    <Input
                      type="number"
                      value={property.value ?? ''}
                      onChange={(e) => updateArrayItem<Property>('properties', index, { value: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
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
            {vehicles.map((vehicle, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Vehicle {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeArrayItem('vehicles', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Vehicle Description</Label>
                    <Input
                      value={vehicle.name || ''}
                      onChange={(e) => updateArrayItem<Vehicle>('vehicles', index, { name: e.target.value })}
                      placeholder="e.g., 2022 Toyota Camry"
                    />
                  </div>
                  <div>
                    <Label>Estimated Value</Label>
                    <Input
                      type="number"
                      value={vehicle.value ?? ''}
                      onChange={(e) => updateArrayItem<Vehicle>('vehicles', index, { value: parseFloat(e.target.value) || 0 })}
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
                  <div className="col-span-2">
                    <Label>Monthly Payment (optional)</Label>
                    <Input
                      type="number"
                      value={mortgage.payment ?? ''}
                      onChange={(e) => updateArrayItem<Mortgage>('mortgages', index, { payment: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
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
                  <div className="col-span-2">
                    <Label>Credit Limit (optional)</Label>
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
                  <div className="col-span-2">
                    <Label>Monthly Payment (optional)</Label>
                    <Input
                      type="number"
                      value={loan.payment ?? ''}
                      onChange={(e) => updateArrayItem<StudentLoan>('loans', index, { payment: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00"
                    />
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
        return (
          <div className="text-center py-6">
            <p className="text-lg mb-4">
              Review your financial profile before completing setup.
            </p>
            <p className="text-muted-foreground">
              You can always update this information later from your dashboard.
            </p>
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
