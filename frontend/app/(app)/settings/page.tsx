'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { households, profile as profileApi, settings as settingsApi, incomeSources, members, accounts, flows } from '@/lib/api'
import { Household, UserProfile, UserSettings, UserSession, IncomeSourceDetail, HouseholdMember, Account, RecurringFlow } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { User, Home, Bell, Shield, DollarSign, Pencil, Trash2, Plus, Users, Wallet, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const TAX_FILING_STATUS: Record<string, string> = {
  single: 'Single',
  married_jointly: 'Married Filing Jointly',
  married_separately: 'Married Filing Separately',
  head_of_household: 'Head of Household',
  qualifying_widow: 'Qualifying Widow(er)',
}

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

const INCOME_TYPES: Record<string, string> = {
  w2: 'W-2 Salary',
  w2_hourly: 'W-2 Hourly',
  self_employed: 'Self-Employed',
  rental: 'Rental Income',
  investment: 'Investment Income',
  retirement: 'Retirement Income',
  social_security: 'Social Security',
  other: 'Other Income',
}

const PAY_FREQUENCIES: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  semimonthly: 'Twice Monthly',
  monthly: 'Monthly',
}

const RELATIONSHIPS: Record<string, string> = {
  self: 'Self',
  spouse: 'Spouse',
  partner: 'Partner',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  other: 'Other',
}

const EMPLOYMENT_STATUSES: Record<string, string> = {
  employed: 'Employed',
  self_employed: 'Self-Employed',
  unemployed: 'Unemployed',
  retired: 'Retired',
  student: 'Student',
  homemaker: 'Homemaker',
  other: 'Other',
}

const ACCOUNT_TYPES: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  money_market: 'Money Market',
  cd: 'Certificate of Deposit',
  brokerage: 'Brokerage',
  crypto: 'Cryptocurrency',
  '401k': '401(k)',
  '403b': '403(b)',
  ira: 'Traditional IRA',
  roth_ira: 'Roth IRA',
  hsa: 'HSA',
  pension: 'Pension',
  real_estate: 'Real Estate',
  vehicle: 'Vehicle',
  other_asset: 'Other Asset',
  mortgage: 'Mortgage',
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
  auto_loan: 'Auto Loan',
  personal_loan: 'Personal Loan',
  heloc: 'HELOC',
  other_liability: 'Other Liability',
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  transportation: 'Transportation',
  food: 'Food & Groceries',
  healthcare: 'Healthcare',
  insurance: 'Insurance',
  entertainment: 'Entertainment',
  personal: 'Personal Care',
  education: 'Education',
  childcare: 'Childcare',
  debt_payment: 'Debt Payment',
  savings: 'Savings',
  charitable: 'Charitable',
  other: 'Other',
}

const FLOW_FREQUENCIES: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  semimonthly: 'Twice Monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annually',
}

export default function SettingsPage() {
  const [householdData, setHouseholdData] = useState<Partial<Household>>({})
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({})
  const [notificationSettings, setNotificationSettings] = useState<Partial<UserSettings>>({})
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' })
  const [isSaved, setIsSaved] = useState(false)
  const [isProfileSaved, setIsProfileSaved] = useState(false)
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Income editing state
  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSourceDetail | null>(null)
  const [incomeForm, setIncomeForm] = useState({
    name: '',
    incomeType: 'w2',
    grossAnnual: '',
    payFrequency: 'biweekly',
  })

  // Member editing state
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null)
  const [memberForm, setMemberForm] = useState({
    name: '',
    relationship: 'self',
    employmentStatus: 'employed',
    dateOfBirth: '',
  })

  // Account editing state
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [accountForm, setAccountForm] = useState({
    name: '',
    accountType: 'checking',
    institution: '',
    currentBalance: '',
  })

  // Expense editing state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringFlow | null>(null)
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    expenseCategory: 'other',
    amount: '',
    frequency: 'monthly',
  })

  const queryClient = useQueryClient()

  const { data: householdList, isLoading } = useQuery({
    queryKey: ['households'],
    queryFn: () => households.list(),
  })

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
  })

  const { data: notificationData, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => settingsApi.getNotifications(),
  })

  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => settingsApi.sessions(),
  })

  const { data: incomeSourcesList, isLoading: isIncomeLoading } = useQuery({
    queryKey: ['income-sources'],
    queryFn: () => incomeSources.list(),
  })

  const { data: membersList, isLoading: isMembersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => members.list(),
  })

  const { data: accountsData, isLoading: isAccountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accounts.list(),
  })

  const { data: flowsList, isLoading: isFlowsLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flows.list(),
  })

  const household = householdList?.[0]
  const accountsList = accountsData?.results || []
  const expenseFlows = flowsList?.filter(f => f.flowType === 'expense' && !f.isSystemGenerated) || []

  useEffect(() => {
    if (household) {
      setHouseholdData({
        name: household.name,
        currency: household.currency || 'USD',
        taxFilingStatus: household.taxFilingStatus || 'single',
        stateOfResidence: household.stateOfResidence || '',
      })
    }
  }, [household])

  useEffect(() => {
    if (profile) {
      setProfileData(profile)
    }
  }, [profile])

  useEffect(() => {
    if (notificationData) {
      setNotificationSettings(notificationData)
    }
  }, [notificationData])

  useEffect(() => {
    if (sessionsData) {
      setSessions(sessionsData)
    }
  }, [sessionsData])

  const updateHouseholdMutation = useMutation({
    mutationFn: (data: Partial<Household>) => {
      if (!household?.id) {
        return Promise.reject(new Error('No household available'))
      }
      return households.update(household.id, {
        name: data.name,
        currency: data.currency,
        tax_filing_status: data.taxFilingStatus,
        state_of_residence: data.stateOfResidence,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    },
    onError: (error) => {
      console.error('Failed to update household:', error)
    },
  })

  const handleSave = () => {
    updateHouseholdMutation.mutate(householdData)
  }

  // Income source mutations
  const createIncomeMutation = useMutation({
    mutationFn: (data: Partial<IncomeSourceDetail>) => incomeSources.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setIncomeModalOpen(false)
      resetIncomeForm()
    },
  })

  const updateIncomeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IncomeSourceDetail> }) =>
      incomeSources.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setIncomeModalOpen(false)
      setEditingIncome(null)
      resetIncomeForm()
    },
  })

  const deleteIncomeMutation = useMutation({
    mutationFn: (id: string) => incomeSources.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  const resetIncomeForm = () => {
    setIncomeForm({
      name: '',
      incomeType: 'w2',
      grossAnnual: '',
      payFrequency: 'biweekly',
    })
  }

  const openIncomeModal = (income?: IncomeSourceDetail) => {
    if (income) {
      setEditingIncome(income)
      setIncomeForm({
        name: income.name || '',
        incomeType: income.incomeType || 'w2',
        grossAnnual: income.grossAnnual || '',
        payFrequency: income.payFrequency || 'biweekly',
      })
    } else {
      setEditingIncome(null)
      resetIncomeForm()
    }
    setIncomeModalOpen(true)
  }

  const handleIncomeSave = () => {
    const data = {
      name: incomeForm.name,
      incomeType: incomeForm.incomeType,
      grossAnnual: incomeForm.grossAnnual,
      payFrequency: incomeForm.payFrequency,
      isActive: true,
    }

    if (editingIncome) {
      updateIncomeMutation.mutate({ id: editingIncome.id, data })
    } else {
      createIncomeMutation.mutate(data)
    }
  }

  // Member mutations
  const createMemberMutation = useMutation({
    mutationFn: (data: Partial<HouseholdMember>) => members.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setMemberModalOpen(false)
      resetMemberForm()
    },
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HouseholdMember> }) =>
      members.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setMemberModalOpen(false)
      setEditingMember(null)
      resetMemberForm()
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => members.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const resetMemberForm = () => {
    setMemberForm({
      name: '',
      relationship: 'self',
      employmentStatus: 'employed',
      dateOfBirth: '',
    })
  }

  const openMemberModal = (member?: HouseholdMember) => {
    if (member) {
      setEditingMember(member)
      setMemberForm({
        name: member.name || '',
        relationship: member.relationship || 'self',
        employmentStatus: member.employmentStatus || 'employed',
        dateOfBirth: member.dateOfBirth || '',
      })
    } else {
      setEditingMember(null)
      resetMemberForm()
    }
    setMemberModalOpen(true)
  }

  const handleMemberSave = () => {
    const data = {
      name: memberForm.name,
      relationship: memberForm.relationship,
      employmentStatus: memberForm.employmentStatus,
      dateOfBirth: memberForm.dateOfBirth || undefined,
    }

    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, data })
    } else {
      createMemberMutation.mutate(data)
    }
  }

  // Account mutations
  const createAccountMutation = useMutation({
    mutationFn: (data: Partial<Account>) => accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setAccountModalOpen(false)
      resetAccountForm()
    },
  })

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) =>
      accounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setAccountModalOpen(false)
      setEditingAccount(null)
      resetAccountForm()
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => accounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  const resetAccountForm = () => {
    setAccountForm({
      name: '',
      accountType: 'checking',
      institution: '',
      currentBalance: '',
    })
  }

  const openAccountModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account)
      setAccountForm({
        name: account.name || '',
        accountType: account.accountType || 'checking',
        institution: account.institution || '',
        currentBalance: account.currentBalance || '',
      })
    } else {
      setEditingAccount(null)
      resetAccountForm()
    }
    setAccountModalOpen(true)
  }

  const handleAccountSave = () => {
    const data = {
      name: accountForm.name,
      accountType: accountForm.accountType,
      institution: accountForm.institution,
      currentBalance: accountForm.currentBalance,
      isActive: true,
    }

    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, data })
    } else {
      createAccountMutation.mutate(data)
    }
  }

  // Expense mutations
  const createExpenseMutation = useMutation({
    mutationFn: (data: Partial<RecurringFlow>) => flows.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setExpenseModalOpen(false)
      resetExpenseForm()
    },
  })

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringFlow> }) =>
      flows.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setExpenseModalOpen(false)
      setEditingExpense(null)
      resetExpenseForm()
    },
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => flows.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  const resetExpenseForm = () => {
    setExpenseForm({
      name: '',
      expenseCategory: 'other',
      amount: '',
      frequency: 'monthly',
    })
  }

  const openExpenseModal = (expense?: RecurringFlow) => {
    if (expense) {
      setEditingExpense(expense)
      setExpenseForm({
        name: expense.name || '',
        expenseCategory: expense.expenseCategory || 'other',
        amount: expense.amount || '',
        frequency: expense.frequency || 'monthly',
      })
    } else {
      setEditingExpense(null)
      resetExpenseForm()
    }
    setExpenseModalOpen(true)
  }

  const handleExpenseSave = () => {
    const today = new Date().toISOString().split('T')[0]
    const data = {
      name: expenseForm.name,
      flowType: 'expense' as const,
      expenseCategory: expenseForm.expenseCategory,
      amount: expenseForm.amount,
      frequency: expenseForm.frequency,
      startDate: editingExpense?.startDate || today,
      isActive: true,
    }

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data })
    } else {
      createExpenseMutation.mutate(data)
    }
  }

  const updateNotificationsMutation = useMutation({
    mutationFn: (data: Partial<UserSettings>) => settingsApi.updateNotifications(data),
    onSuccess: (data) => {
      setNotificationSettings(data)
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
    },
    onError: (error) => {
      console.error('Failed to update notifications:', error)
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: () => profileApi.changePassword(passwordForm.current, passwordForm.next),
    onSuccess: () => {
      setPasswordForm({ current: '', next: '' })
      setIsPasswordUpdated(true)
      setTimeout(() => setIsPasswordUpdated(false), 3000)
    },
    onError: (error) => {
      console.error('Failed to change password:', error)
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: () => profileApi.update({
      username: profileData.username,
      dateOfBirth: profileData.dateOfBirth,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsProfileSaved(true)
      setTimeout(() => setIsProfileSaved(false), 3000)
    },
    onError: (error) => {
      console.error('Failed to update profile:', error)
    },
  })

  const twoFactorMutation = useMutation({
    mutationFn: (enabled: boolean) => settingsApi.updateTwoFactor(enabled),
    onSuccess: (data) => {
      setNotificationSettings(data)
    },
    onError: (error) => {
      console.error('Failed to update two-factor settings:', error)
    },
  })

  const deleteAccountProfileMutation = useMutation({
    mutationFn: () => profileApi.delete(),
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('householdId')
        window.location.href = '/'
      }
    },
    onError: (error) => {
      console.error('Failed to delete account:', error)
    },
  })

  const handleNotificationToggle = (key: keyof UserSettings) => {
    const nextValue = !notificationSettings[key]
    const updated = { ...notificationSettings, [key]: nextValue }
    setNotificationSettings(updated)
    updateNotificationsMutation.mutate({ [key]: nextValue })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await settingsApi.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'effluent-export.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  // Helper function to check if account type is a liability
  const isLiabilityType = (type: string) => {
    return ['mortgage', 'credit_card', 'student_loan', 'auto_loan', 'personal_loan', 'heloc', 'other_liability'].includes(type)
  }

  if (isLoading || isProfileLoading || isNotificationsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your household and account settings
        </p>
      </div>

      <Tabs defaultValue="household" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="household" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Household
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Income
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="household" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Household Information</CardTitle>
              <CardDescription>
                Update your household details and tax information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Household Name</Label>
                <Input
                  id="householdName"
                  value={householdData.name || ''}
                  onChange={(e) => setHouseholdData({ ...householdData, name: e.target.value })}
                  placeholder="e.g., The Smith Family"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={householdData.currency || 'USD'}
                    onChange={(e) => setHouseholdData({ ...householdData, currency: e.target.value })}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxStatus">Tax Filing Status</Label>
                  <select
                    id="taxStatus"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={householdData.taxFilingStatus || 'single'}
                    onChange={(e) => setHouseholdData({ ...householdData, taxFilingStatus: e.target.value })}
                  >
                    {Object.entries(TAX_FILING_STATUS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State of Residence</Label>
                <select
                  id="state"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={householdData.stateOfResidence || ''}
                  onChange={(e) => setHouseholdData({ ...householdData, stateOfResidence: e.target.value })}
                >
                  <option value="">Select a state...</option>
                  {Object.entries(US_STATES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleSave} disabled={updateHouseholdMutation.isPending}>
                  {updateHouseholdMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                {isSaved && (
                  <span className="text-sm text-green-600">Changes saved successfully!</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Household Members</span>
                <Button onClick={() => openMemberModal()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </CardTitle>
              <CardDescription>
                Manage the members of your household
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMembersLoading ? (
                <p className="text-muted-foreground">Loading members...</p>
              ) : !membersList?.length ? (
                <p className="text-muted-foreground py-4 text-center">
                  No household members configured. Add your first member.
                </p>
              ) : (
                <div className="space-y-4">
                  {membersList.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          {member.isPrimary && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{RELATIONSHIPS[member.relationship] || member.relationship}</span>
                          <span>{EMPLOYMENT_STATUSES[member.employmentStatus] || member.employmentStatus}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMemberModal(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!member.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this household member?')) {
                                deleteMemberMutation.mutate(member.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Income Sources</span>
                <Button onClick={() => openIncomeModal()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Income
                </Button>
              </CardTitle>
              <CardDescription>
                Manage your income sources. Changes automatically update your tax withholding calculations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isIncomeLoading ? (
                <p className="text-muted-foreground">Loading income sources...</p>
              ) : !incomeSourcesList?.length ? (
                <p className="text-muted-foreground py-4 text-center">
                  No income sources configured. Add your first income source to see tax calculations.
                </p>
              ) : (
                <div className="space-y-4">
                  {incomeSourcesList.map((income) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{income.name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{INCOME_TYPES[income.incomeType] || income.incomeType}</span>
                          <span>{PAY_FREQUENCIES[income.payFrequency] || income.payFrequency}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(parseFloat(income.grossAnnual || '0'))}/year
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ~{formatCurrency(parseFloat(income.grossAnnual || '0') / 12)}/month
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openIncomeModal(income)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this income source?')) {
                                deleteIncomeMutation.mutate(income.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                Tax withholding flows are automatically calculated based on your income sources.
                Visit the Cash Flows page to see your tax expense breakdown.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Accounts</span>
                <Button onClick={() => openAccountModal()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </CardTitle>
              <CardDescription>
                Manage your bank accounts, investments, and liabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAccountsLoading ? (
                <p className="text-muted-foreground">Loading accounts...</p>
              ) : !accountsList?.length ? (
                <p className="text-muted-foreground py-4 text-center">
                  No accounts configured. Add your first account.
                </p>
              ) : (
                <div className="space-y-4">
                  {accountsList.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{account.name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{ACCOUNT_TYPES[account.accountType] || account.accountType}</span>
                          {account.institution && <span>{account.institution}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-semibold ${isLiabilityType(account.accountType) ? 'text-red-600' : 'text-green-600'}`}>
                            {isLiabilityType(account.accountType) ? '-' : ''}{formatCurrency(parseFloat(account.currentBalance || '0'))}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAccountModal(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this account?')) {
                                deleteAccountMutation.mutate(account.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recurring Expenses</span>
                <Button onClick={() => openExpenseModal()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardTitle>
              <CardDescription>
                Manage your recurring expenses (excludes system-generated flows like taxes)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFlowsLoading ? (
                <p className="text-muted-foreground">Loading expenses...</p>
              ) : !expenseFlows?.length ? (
                <p className="text-muted-foreground py-4 text-center">
                  No expenses configured. Add your first recurring expense.
                </p>
              ) : (
                <div className="space-y-4">
                  {expenseFlows.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{expense.name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{EXPENSE_CATEGORIES[expense.expenseCategory || ''] || expense.expenseCategory || 'Other'}</span>
                          <span>{FLOW_FREQUENCIES[expense.frequency] || expense.frequency}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            {formatCurrency(parseFloat(expense.amount || '0'))}/{expense.frequency === 'annual' ? 'year' : 'period'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ~{formatCurrency(parseFloat(expense.monthlyAmount || '0'))}/month
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openExpenseModal(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this expense?')) {
                                deleteExpenseMutation.mutate(expense.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profileData.username || ''}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  placeholder="e.g., alexsmith"
                />
                <p className="text-xs text-muted-foreground">
                  This name appears in shared household views.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  disabled
                  value={profileData.email || ''}
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={profileData.dateOfBirth || ''}
                  onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Onboarding Status</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    household?.onboardingCompleted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {household?.onboardingCompleted ? 'Complete' : 'In Progress'}
                  </span>
                  {!household?.onboardingCompleted && (
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <a href="/onboarding">Continue Onboarding</a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
                {isProfileSaved && (
                  <span className="text-sm text-green-600">Profile updated.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                      deleteAccountProfileMutation.mutate()
                    }
                  }}
                  disabled={deleteAccountProfileMutation.isPending}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary of your financial health
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.weeklySummary}
                  onChange={() => handleNotificationToggle('weeklySummary')}
                  className="h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Insight Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new insights are generated
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.insightAlerts}
                  onChange={() => handleNotificationToggle('insightAlerts')}
                  className="h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Balance Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Monthly reminders to update account balances
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.balanceReminders}
                  onChange={() => handleNotificationToggle('balanceReminders')}
                  className="h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Critical Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Important alerts about your financial health
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.criticalAlerts}
                  onChange={() => handleNotificationToggle('criticalAlerts')}
                  className="h-4 w-4 rounded"
                />
              </div>
              {updateNotificationsMutation.isPending && (
                <p className="text-sm text-muted-foreground">Updating preferences...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your account password
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="Current"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="h-9 w-36"
                  />
                  <Input
                    type="password"
                    placeholder="New"
                    value={passwordForm.next}
                    onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                    className="h-9 w-36"
                  />
                  <Button
                    variant="outline"
                    onClick={() => changePasswordMutation.mutate()}
                    disabled={changePasswordMutation.isPending || !passwordForm.current || passwordForm.next.length < 8}
                  >
                    {changePasswordMutation.isPending ? 'Saving...' : 'Change'}
                  </Button>
                </div>
              </div>
              {isPasswordUpdated && (
                <p className="text-sm text-green-600">Password updated successfully.</p>
              )}

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => twoFactorMutation.mutate(!notificationSettings.twoFactorEnabled)}
                >
                  {notificationSettings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    View and manage your active login sessions
                  </p>
                </div>
                <Button variant="outline" onClick={() => refetchSessions()}>
                  Refresh
                </Button>
              </div>
              {sessions.length > 0 && (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded border p-3 text-sm">
                      <div className="font-medium">
                        {session.isCurrent ? 'Current Session' : 'Session'}
                      </div>
                      <div className="text-muted-foreground">
                        {session.ipAddress || 'Unknown IP'} · {session.userAgent || 'Unknown device'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>
                Manage your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of all your data
                  </p>
                </div>
                <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Income Edit Modal */}
      <Dialog open={incomeModalOpen} onOpenChange={setIncomeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIncome ? 'Edit Income Source' : 'Add Income Source'}
            </DialogTitle>
            <DialogDescription>
              {editingIncome
                ? 'Update your income details. Tax flows will be recalculated automatically.'
                : 'Add a new income source. Tax withholding will be calculated automatically for W-2 income.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="incomeName">Name</Label>
              <Input
                id="incomeName"
                value={incomeForm.name}
                onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })}
                placeholder="e.g., Main Job, Freelance Work"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incomeType">Income Type</Label>
                <select
                  id="incomeType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={incomeForm.incomeType}
                  onChange={(e) => setIncomeForm({ ...incomeForm, incomeType: e.target.value })}
                >
                  {Object.entries(INCOME_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payFrequency">Pay Frequency</Label>
                <select
                  id="payFrequency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={incomeForm.payFrequency}
                  onChange={(e) => setIncomeForm({ ...incomeForm, payFrequency: e.target.value })}
                >
                  {Object.entries(PAY_FREQUENCIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grossAnnual">Annual Gross Income</Label>
              <Input
                id="grossAnnual"
                type="number"
                step="0.01"
                value={incomeForm.grossAnnual}
                onChange={(e) => setIncomeForm({ ...incomeForm, grossAnnual: e.target.value })}
                placeholder="e.g., 75000"
              />
              <p className="text-xs text-muted-foreground">
                Enter your total annual gross income before taxes and deductions
              </p>
            </div>

            {(incomeForm.incomeType === 'w2' || incomeForm.incomeType === 'w2_hourly') && (
              <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                Tax withholding will be calculated using federal tax brackets, FICA, and state taxes based on your W-4 settings.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIncomeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleIncomeSave}
                disabled={
                  createIncomeMutation.isPending ||
                  updateIncomeMutation.isPending ||
                  !incomeForm.name ||
                  !incomeForm.grossAnnual
                }
              >
                {(createIncomeMutation.isPending || updateIncomeMutation.isPending)
                  ? 'Saving...'
                  : editingIncome
                  ? 'Save Changes'
                  : 'Add Income'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Edit Modal */}
      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Household Member' : 'Add Household Member'}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update member details.'
                : 'Add a new member to your household.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Name</Label>
              <Input
                id="memberName"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <select
                  id="relationship"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={memberForm.relationship}
                  onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value })}
                >
                  {Object.entries(RELATIONSHIPS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <select
                  id="employmentStatus"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={memberForm.employmentStatus}
                  onChange={(e) => setMemberForm({ ...memberForm, employmentStatus: e.target.value })}
                >
                  {Object.entries(EMPLOYMENT_STATUSES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberDob">Date of Birth (optional)</Label>
              <Input
                id="memberDob"
                type="date"
                value={memberForm.dateOfBirth}
                onChange={(e) => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setMemberModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleMemberSave}
                disabled={
                  createMemberMutation.isPending ||
                  updateMemberMutation.isPending ||
                  !memberForm.name
                }
              >
                {(createMemberMutation.isPending || updateMemberMutation.isPending)
                  ? 'Saving...'
                  : editingMember
                  ? 'Save Changes'
                  : 'Add Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Edit Modal */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Account' : 'Add Account'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? 'Update account details.'
                : 'Add a new bank account, investment, or liability.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="e.g., Chase Checking, Fidelity 401k"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <select
                  id="accountType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={accountForm.accountType}
                  onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
                >
                  <optgroup label="Bank Accounts">
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="money_market">Money Market</option>
                    <option value="cd">Certificate of Deposit</option>
                  </optgroup>
                  <optgroup label="Investments">
                    <option value="brokerage">Brokerage</option>
                    <option value="crypto">Cryptocurrency</option>
                  </optgroup>
                  <optgroup label="Retirement">
                    <option value="401k">401(k)</option>
                    <option value="403b">403(b)</option>
                    <option value="ira">Traditional IRA</option>
                    <option value="roth_ira">Roth IRA</option>
                    <option value="hsa">HSA</option>
                    <option value="pension">Pension</option>
                  </optgroup>
                  <optgroup label="Other Assets">
                    <option value="real_estate">Real Estate</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="other_asset">Other Asset</option>
                  </optgroup>
                  <optgroup label="Liabilities">
                    <option value="mortgage">Mortgage</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="student_loan">Student Loan</option>
                    <option value="auto_loan">Auto Loan</option>
                    <option value="personal_loan">Personal Loan</option>
                    <option value="heloc">HELOC</option>
                    <option value="other_liability">Other Liability</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={accountForm.institution}
                  onChange={(e) => setAccountForm({ ...accountForm, institution: e.target.value })}
                  placeholder="e.g., Chase, Fidelity"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentBalance">
                {isLiabilityType(accountForm.accountType) ? 'Current Balance Owed' : 'Current Balance'}
              </Label>
              <Input
                id="currentBalance"
                type="number"
                step="0.01"
                value={accountForm.currentBalance}
                onChange={(e) => setAccountForm({ ...accountForm, currentBalance: e.target.value })}
                placeholder="e.g., 10000"
              />
              <p className="text-xs text-muted-foreground">
                {isLiabilityType(accountForm.accountType)
                  ? 'Enter the amount you currently owe'
                  : 'Enter the current account balance'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAccountModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAccountSave}
                disabled={
                  createAccountMutation.isPending ||
                  updateAccountMutation.isPending ||
                  !accountForm.name ||
                  !accountForm.currentBalance
                }
              >
                {(createAccountMutation.isPending || updateAccountMutation.isPending)
                  ? 'Saving...'
                  : editingAccount
                  ? 'Save Changes'
                  : 'Add Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Edit Modal */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? 'Update expense details.'
                : 'Add a new recurring expense.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expenseName">Expense Name</Label>
              <Input
                id="expenseName"
                value={expenseForm.name}
                onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                placeholder="e.g., Rent, Groceries, Netflix"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseCategory">Category</Label>
                <select
                  id="expenseCategory"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={expenseForm.expenseCategory}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expenseCategory: e.target.value })}
                >
                  {Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseFrequency">Frequency</Label>
                <select
                  id="expenseFrequency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={expenseForm.frequency}
                  onChange={(e) => setExpenseForm({ ...expenseForm, frequency: e.target.value })}
                >
                  {Object.entries(FLOW_FREQUENCIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Amount per Period</Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="e.g., 1500"
              />
              <p className="text-xs text-muted-foreground">
                Enter the amount you pay each {expenseForm.frequency === 'annual' ? 'year' : 'period'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExpenseSave}
                disabled={
                  createExpenseMutation.isPending ||
                  updateExpenseMutation.isPending ||
                  !expenseForm.name ||
                  !expenseForm.amount
                }
              >
                {(createExpenseMutation.isPending || updateExpenseMutation.isPending)
                  ? 'Saving...'
                  : editingExpense
                  ? 'Save Changes'
                  : 'Add Expense'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
