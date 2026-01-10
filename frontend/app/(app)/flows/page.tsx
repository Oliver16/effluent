'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flows as flowsApi, incomeSources as incomeSourcesApi, metrics as metricsApi, normalizeListResponse } from '@/lib/api'
import { RecurringFlow, IncomeSourceDetail, MetricSnapshot } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { ControlListLayout } from '@/components/layout/ControlListLayout'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Pencil, RefreshCw, Cpu, Trash2, Briefcase } from 'lucide-react'
import { deriveStatus } from '@/lib/status'
import { StatusTone } from '@/lib/design-tokens'

const INCOME_CATEGORIES: Record<string, string> = {
  // Employment
  salary: 'Salary/Wages',
  hourly_wages: 'Hourly Wages',
  overtime: 'Overtime Pay',
  bonus: 'Bonus',
  commission: 'Commission',
  tips: 'Tips',
  // Self-Employment
  self_employment: 'Self-Employment Income',
  freelance: 'Freelance/Contract',
  business_income: 'Business Income',
  // Investment
  dividends: 'Dividends',
  interest: 'Interest Income',
  capital_gains: 'Capital Gains',
  // Rental/Passive
  rental_income: 'Rental Income',
  royalties: 'Royalties',
  // Retirement/Government
  social_security: 'Social Security',
  pension: 'Pension',
  retirement_distribution: 'Retirement Distribution',
  disability: 'Disability Income',
  unemployment: 'Unemployment',
  // Other
  child_support_received: 'Child Support Received',
  alimony_received: 'Alimony Received',
  trust_income: 'Trust/Estate Income',
  other_income: 'Other Income',
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  // Housing - Mortgage
  mortgage_principal: 'Mortgage Principal',
  mortgage_interest: 'Mortgage Interest',
  rent: 'Rent',
  property_tax: 'Property Tax',
  homeowners_insurance: "Homeowner's Insurance",
  renters_insurance: "Renter's Insurance",
  hoa_fees: 'HOA/Condo Fees',
  home_maintenance: 'Home Maintenance & Repairs',
  home_improvement: 'Home Improvement',
  lawn_garden: 'Lawn & Garden',
  home_security: 'Home Security',
  // Utilities
  electricity: 'Electricity',
  natural_gas: 'Natural Gas',
  water_sewer: 'Water & Sewer',
  trash: 'Trash/Recycling',
  internet: 'Internet',
  phone: 'Phone/Mobile',
  cable_streaming: 'Cable/Streaming',
  // Transportation
  auto_loan: 'Auto Loan Payment',
  auto_lease: 'Auto Lease Payment',
  auto_insurance: 'Auto Insurance',
  gas_fuel: 'Gas/Fuel',
  auto_maintenance: 'Auto Maintenance',
  parking: 'Parking',
  tolls: 'Tolls',
  public_transit: 'Public Transit',
  rideshare: 'Rideshare/Taxi',
  // Insurance
  health_insurance: 'Health Insurance',
  dental_insurance: 'Dental Insurance',
  vision_insurance: 'Vision Insurance',
  life_insurance: 'Life Insurance',
  disability_insurance: 'Disability Insurance',
  umbrella_insurance: 'Umbrella Insurance',
  // Healthcare
  medical_expenses: 'Medical Expenses',
  dental_expenses: 'Dental Expenses',
  vision_expenses: 'Vision/Optical',
  prescriptions: 'Prescriptions',
  mental_health: 'Mental Health',
  gym_fitness: 'Gym/Fitness',
  // Food
  groceries: 'Groceries',
  dining_out: 'Dining Out',
  coffee_snacks: 'Coffee/Snacks',
  food_delivery: 'Food Delivery',
  // Debt Payments
  credit_card_payment: 'Credit Card Payment',
  student_loan: 'Student Loan Payment',
  personal_loan: 'Personal Loan Payment',
  heloc_payment: 'HELOC Payment',
  other_debt: 'Other Debt Payment',
  // Children
  childcare: 'Childcare/Daycare',
  child_activities: 'Children Activities',
  school_tuition: 'School Tuition (K-12)',
  child_support_paid: 'Child Support Paid',
  // Education
  college_tuition: 'College Tuition',
  books_supplies: 'Books & Supplies',
  professional_dev: 'Professional Development',
  // Personal
  clothing: 'Clothing',
  personal_care: 'Personal Care',
  // Entertainment
  entertainment: 'Entertainment',
  hobbies: 'Hobbies',
  subscriptions: 'Subscriptions',
  vacation_travel: 'Vacation/Travel',
  // Pets
  pet_food: 'Pet Food',
  pet_vet: 'Pet Veterinary',
  pet_supplies: 'Pet Supplies',
  // Giving
  charitable: 'Charitable Donations',
  religious: 'Religious Contributions',
  gifts: 'Gifts to Others',
  // Financial
  bank_fees: 'Bank Fees',
  investment_fees: 'Investment Fees',
  tax_prep: 'Tax Preparation',
  // Taxes
  estimated_tax: 'Estimated Tax Payments',
  // Business Expenses
  business_office: 'Office Expenses',
  business_supplies: 'Business Supplies',
  business_advertising: 'Advertising & Marketing',
  business_professional: 'Professional Services',
  business_travel: 'Business Travel',
  business_vehicle: 'Business Vehicle/Mileage',
  business_rent: 'Business Rent/Lease',
  business_utilities: 'Business Utilities',
  business_equipment: 'Equipment & Tools',
  business_insurance: 'Business Insurance',
  business_license: 'Licenses & Permits',
  business_software: 'Software & Subscriptions',
  business_contractor: 'Contract Labor',
  business_other: 'Other Business Expense',
  // Rental Property Expenses
  rental_mortgage: 'Rental Property Mortgage',
  rental_insurance: 'Rental Property Insurance',
  rental_repairs: 'Rental Repairs & Maintenance',
  rental_management: 'Property Management',
  rental_utilities: 'Rental Property Utilities',
  rental_tax: 'Rental Property Tax',
  rental_other: 'Other Rental Expense',
  // Other
  alimony_paid: 'Alimony Paid',
  household_supplies: 'Household Supplies',
  miscellaneous: 'Miscellaneous',
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semimonthly: 'Semi-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannually: 'Semi-annually',
  annually: 'Annually',
}

// Grouped categories for dropdown display
const INCOME_CATEGORY_GROUPS: Array<{ label: string; options: Array<{ value: string; label: string }> }> = [
  {
    label: 'Employment',
    options: [
      { value: 'salary', label: 'Salary/Wages' },
      { value: 'hourly_wages', label: 'Hourly Wages' },
      { value: 'overtime', label: 'Overtime Pay' },
      { value: 'bonus', label: 'Bonus' },
      { value: 'commission', label: 'Commission' },
      { value: 'tips', label: 'Tips' },
    ],
  },
  {
    label: 'Self-Employment',
    options: [
      { value: 'self_employment', label: 'Self-Employment Income' },
      { value: 'freelance', label: 'Freelance/Contract' },
      { value: 'business_income', label: 'Business Income' },
    ],
  },
  {
    label: 'Investment',
    options: [
      { value: 'dividends', label: 'Dividends' },
      { value: 'interest', label: 'Interest Income' },
      { value: 'capital_gains', label: 'Capital Gains' },
    ],
  },
  {
    label: 'Rental/Passive',
    options: [
      { value: 'rental_income', label: 'Rental Income' },
      { value: 'royalties', label: 'Royalties' },
    ],
  },
  {
    label: 'Retirement/Government',
    options: [
      { value: 'social_security', label: 'Social Security' },
      { value: 'pension', label: 'Pension' },
      { value: 'retirement_distribution', label: 'Retirement Distribution' },
      { value: 'disability', label: 'Disability Income' },
      { value: 'unemployment', label: 'Unemployment' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'child_support_received', label: 'Child Support Received' },
      { value: 'alimony_received', label: 'Alimony Received' },
      { value: 'trust_income', label: 'Trust/Estate Income' },
      { value: 'other_income', label: 'Other Income' },
    ],
  },
]

const EXPENSE_CATEGORY_GROUPS: Array<{ label: string; options: Array<{ value: string; label: string }> }> = [
  {
    label: 'Housing',
    options: [
      { value: 'mortgage_principal', label: 'Mortgage Principal' },
      { value: 'mortgage_interest', label: 'Mortgage Interest' },
      { value: 'rent', label: 'Rent' },
      { value: 'property_tax', label: 'Property Tax' },
      { value: 'homeowners_insurance', label: "Homeowner's Insurance" },
      { value: 'renters_insurance', label: "Renter's Insurance" },
      { value: 'hoa_fees', label: 'HOA/Condo Fees' },
      { value: 'home_maintenance', label: 'Home Maintenance & Repairs' },
      { value: 'home_improvement', label: 'Home Improvement' },
    ],
  },
  {
    label: 'Utilities',
    options: [
      { value: 'electricity', label: 'Electricity' },
      { value: 'natural_gas', label: 'Natural Gas' },
      { value: 'water_sewer', label: 'Water & Sewer' },
      { value: 'trash', label: 'Trash/Recycling' },
      { value: 'internet', label: 'Internet' },
      { value: 'phone', label: 'Phone/Mobile' },
      { value: 'cable_streaming', label: 'Cable/Streaming' },
    ],
  },
  {
    label: 'Transportation',
    options: [
      { value: 'auto_loan', label: 'Auto Loan Payment' },
      { value: 'auto_lease', label: 'Auto Lease Payment' },
      { value: 'auto_insurance', label: 'Auto Insurance' },
      { value: 'gas_fuel', label: 'Gas/Fuel' },
      { value: 'auto_maintenance', label: 'Auto Maintenance' },
      { value: 'parking', label: 'Parking' },
      { value: 'public_transit', label: 'Public Transit' },
    ],
  },
  {
    label: 'Insurance',
    options: [
      { value: 'health_insurance', label: 'Health Insurance' },
      { value: 'dental_insurance', label: 'Dental Insurance' },
      { value: 'vision_insurance', label: 'Vision Insurance' },
      { value: 'life_insurance', label: 'Life Insurance' },
      { value: 'disability_insurance', label: 'Disability Insurance' },
    ],
  },
  {
    label: 'Healthcare',
    options: [
      { value: 'medical_expenses', label: 'Medical Expenses' },
      { value: 'dental_expenses', label: 'Dental Expenses' },
      { value: 'vision_expenses', label: 'Vision/Optical' },
      { value: 'prescriptions', label: 'Prescriptions' },
      { value: 'gym_fitness', label: 'Gym/Fitness' },
    ],
  },
  {
    label: 'Food',
    options: [
      { value: 'groceries', label: 'Groceries' },
      { value: 'dining_out', label: 'Dining Out' },
      { value: 'coffee_snacks', label: 'Coffee/Snacks' },
      { value: 'food_delivery', label: 'Food Delivery' },
    ],
  },
  {
    label: 'Debt Payments',
    options: [
      { value: 'credit_card_payment', label: 'Credit Card Payment' },
      { value: 'student_loan', label: 'Student Loan Payment' },
      { value: 'personal_loan', label: 'Personal Loan Payment' },
      { value: 'heloc_payment', label: 'HELOC Payment' },
      { value: 'other_debt', label: 'Other Debt Payment' },
    ],
  },
  {
    label: 'Children & Education',
    options: [
      { value: 'childcare', label: 'Childcare/Daycare' },
      { value: 'child_activities', label: 'Children Activities' },
      { value: 'school_tuition', label: 'School Tuition (K-12)' },
      { value: 'college_tuition', label: 'College Tuition' },
      { value: 'books_supplies', label: 'Books & Supplies' },
      { value: 'child_support_paid', label: 'Child Support Paid' },
    ],
  },
  {
    label: 'Personal & Entertainment',
    options: [
      { value: 'clothing', label: 'Clothing' },
      { value: 'personal_care', label: 'Personal Care' },
      { value: 'entertainment', label: 'Entertainment' },
      { value: 'hobbies', label: 'Hobbies' },
      { value: 'subscriptions', label: 'Subscriptions' },
      { value: 'vacation_travel', label: 'Vacation/Travel' },
    ],
  },
  {
    label: 'Pets',
    options: [
      { value: 'pet_food', label: 'Pet Food' },
      { value: 'pet_vet', label: 'Pet Veterinary' },
      { value: 'pet_supplies', label: 'Pet Supplies' },
    ],
  },
  {
    label: 'Giving',
    options: [
      { value: 'charitable', label: 'Charitable Donations' },
      { value: 'religious', label: 'Religious Contributions' },
      { value: 'gifts', label: 'Gifts to Others' },
    ],
  },
  {
    label: 'Business Expenses',
    options: [
      { value: 'business_office', label: 'Office Expenses' },
      { value: 'business_supplies', label: 'Business Supplies' },
      { value: 'business_travel', label: 'Business Travel' },
      { value: 'business_vehicle', label: 'Business Vehicle/Mileage' },
      { value: 'business_rent', label: 'Business Rent/Lease' },
      { value: 'business_other', label: 'Other Business Expense' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'estimated_tax', label: 'Estimated Tax Payments' },
      { value: 'alimony_paid', label: 'Alimony Paid' },
      { value: 'household_supplies', label: 'Household Supplies' },
      { value: 'miscellaneous', label: 'Miscellaneous' },
    ],
  },
]

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

export default function FlowsPage() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<RecurringFlow | null>(null)
  const [newFlow, setNewFlow] = useState({
    name: '',
    flowType: 'income' as 'income' | 'expense' | 'transfer',
    incomeCategory: 'salary',
    expenseCategory: 'miscellaneous',
    amount: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isBaseline: true,
  })

  // Income source state
  const [incomeSourceModalOpen, setIncomeSourceModalOpen] = useState(false)
  const [editingIncomeSource, setEditingIncomeSource] = useState<IncomeSourceDetail | null>(null)
  const [incomeSourceForm, setIncomeSourceForm] = useState({
    name: '',
    incomeType: 'w2',
    grossAnnualSalary: '',
    payFrequency: 'biweekly',
  })

  const queryClient = useQueryClient()

  const { data: flowsData, isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.list().then(normalizeListResponse),
  })

  // Fetch metrics from API for accurate surplus (includes IncomeSource data)
  const { data: metricsData } = useQuery({
    queryKey: ['metrics', 'current'],
    queryFn: () => metricsApi.current(),
  })

  const createFlowMutation = useMutation({
    mutationFn: (data: Partial<RecurringFlow>) => flowsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setAddModalOpen(false)
      resetNewFlow()
    },
  })

  const updateFlowMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringFlow> }) =>
      flowsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setEditModalOpen(false)
      setSelectedFlow(null)
    },
  })

  const regenerateFlowsMutation = useMutation({
    mutationFn: () => flowsApi.regenerateSystemFlows(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  // Income sources query and mutations
  const { data: incomeSourcesData, isLoading: isIncomeSourcesLoading } = useQuery({
    queryKey: ['income-sources'],
    queryFn: () => incomeSourcesApi.list(),
  })

  const createIncomeSourceMutation = useMutation({
    mutationFn: (data: Partial<IncomeSourceDetail>) => incomeSourcesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      // Regenerate tax flows when income sources change
      regenerateFlowsMutation.mutate()
      setIncomeSourceModalOpen(false)
      resetIncomeSourceForm()
    },
  })

  const updateIncomeSourceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IncomeSourceDetail> }) =>
      incomeSourcesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      // Regenerate tax flows when income sources change
      regenerateFlowsMutation.mutate()
      setIncomeSourceModalOpen(false)
      setEditingIncomeSource(null)
      resetIncomeSourceForm()
    },
  })

  const deleteIncomeSourceMutation = useMutation({
    mutationFn: (id: string) => incomeSourcesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] })
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      // Regenerate tax flows when income sources change
      regenerateFlowsMutation.mutate()
    },
  })

  const incomeSources = incomeSourcesData?.results || incomeSourcesData || []

  const flows = flowsData || []
  const incomeFlows = flows.filter(f => f.flowType === 'income')
  const expenseFlows = flows.filter(f => f.flowType === 'expense')
  const transferFlows = flows.filter(f => f.flowType === 'transfer')
  const systemFlowCount = flows.filter(f => f.isSystemGenerated).length

  // Use API metrics for accurate totals (includes IncomeSource data, matches dashboard)
  const totalMonthlyIncome = metricsData
    ? parseFloat(metricsData.totalMonthlyIncome || '0')
    : incomeFlows.filter(f => f.isActive).reduce((sum, f) => sum + parseFloat(f.monthlyAmount || '0'), 0)
  const totalMonthlyExpenses = metricsData
    ? parseFloat(metricsData.totalMonthlyExpenses || '0')
    : expenseFlows.filter(f => f.isActive).reduce((sum, f) => sum + parseFloat(f.monthlyAmount || '0'), 0)
  const monthlySurplus = metricsData
    ? parseFloat(metricsData.monthlySurplus || '0')
    : totalMonthlyIncome - totalMonthlyExpenses

  const resetNewFlow = () => {
    setNewFlow({
      name: '',
      flowType: 'income',
      incomeCategory: 'salary',
      expenseCategory: 'miscellaneous',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isBaseline: true,
    })
  }

  const openAddModal = (type: 'income' | 'expense' | 'transfer') => {
    setNewFlow({ ...newFlow, flowType: type })
    setAddModalOpen(true)
  }

  const openEditModal = (flow: RecurringFlow) => {
    setSelectedFlow(flow)
    setEditModalOpen(true)
  }

  const handleCreateFlow = () => {
    createFlowMutation.mutate({
      name: newFlow.name,
      flowType: newFlow.flowType,
      incomeCategory: newFlow.flowType === 'income' ? newFlow.incomeCategory : undefined,
      expenseCategory: newFlow.flowType === 'expense' ? newFlow.expenseCategory : undefined,
      amount: newFlow.amount,
      frequency: newFlow.frequency,
      startDate: newFlow.startDate,
      endDate: newFlow.endDate || undefined,
      isActive: true,
      isBaseline: newFlow.isBaseline,
    })
  }

  const handleUpdateFlow = () => {
    if (!selectedFlow) return
    updateFlowMutation.mutate({
      id: selectedFlow.id,
      data: {
        name: selectedFlow.name,
        amount: selectedFlow.amount,
        frequency: selectedFlow.frequency,
        isActive: selectedFlow.isActive,
        isBaseline: selectedFlow.isBaseline,
        endDate: selectedFlow.endDate || undefined,
      },
    })
  }

  // Income source handlers
  const resetIncomeSourceForm = () => {
    setIncomeSourceForm({
      name: '',
      incomeType: 'w2',
      grossAnnualSalary: '',
      payFrequency: 'biweekly',
    })
  }

  const openIncomeSourceModal = (incomeSource?: IncomeSourceDetail) => {
    if (incomeSource) {
      setEditingIncomeSource(incomeSource)
      setIncomeSourceForm({
        name: incomeSource.name || '',
        incomeType: incomeSource.incomeType || 'w2',
        grossAnnualSalary: incomeSource.grossAnnualSalary || incomeSource.grossAnnual || '',
        payFrequency: incomeSource.payFrequency || 'biweekly',
      })
    } else {
      setEditingIncomeSource(null)
      resetIncomeSourceForm()
    }
    setIncomeSourceModalOpen(true)
  }

  const handleIncomeSourceSave = () => {
    const data = {
      name: incomeSourceForm.name,
      incomeType: incomeSourceForm.incomeType,
      grossAnnualSalary: incomeSourceForm.grossAnnualSalary,
      payFrequency: incomeSourceForm.payFrequency,
      isActive: true,
    }

    if (editingIncomeSource) {
      updateIncomeSourceMutation.mutate({ id: editingIncomeSource.id, data })
    } else {
      createIncomeSourceMutation.mutate(data)
    }
  }

  const handleDeleteIncomeSource = (incomeSource: IncomeSourceDetail) => {
    if (confirm(`Delete "${incomeSource.name}"? This will also remove associated tax flows.`)) {
      deleteIncomeSourceMutation.mutate(incomeSource.id)
    }
  }

  // Calculate total gross income from income sources
  const totalGrossIncome = Array.isArray(incomeSources)
    ? incomeSources.reduce((sum, s) => sum + parseFloat(s.grossAnnual || s.grossAnnualSalary || '0'), 0)
    : 0

  // Derive surplus status (positive surplus is good)
  const surplusStatus: StatusTone = monthlySurplus >= totalMonthlyIncome * 0.2
    ? 'good'
    : monthlySurplus >= 0
    ? 'warning'
    : 'critical'

  if (isLoading) {
    return (
      <ControlListLayout
        title="Cash Flows"
        subtitle="Manage your recurring income and expenses"
      >
        <p className="text-muted-foreground">Loading...</p>
      </ControlListLayout>
    )
  }

  return (
    <ControlListLayout
      title="Cash Flows"
      subtitle="Manage your recurring income and expenses"
      actions={
        <Button
          variant="outline"
          onClick={() => regenerateFlowsMutation.mutate()}
          disabled={regenerateFlowsMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${regenerateFlowsMutation.isPending ? 'animate-spin' : ''}`} />
          {regenerateFlowsMutation.isPending ? 'Regenerating...' : 'Sync Tax Flows'}
        </Button>
      }
      stats={
        <>
          <MetricCard
            label="Monthly Income"
            value={formatCurrency(totalMonthlyIncome)}
            icon={ArrowUpCircle}
            tone="neutral"
          />
          <MetricCard
            label="Monthly Expenses"
            value={formatCurrency(totalMonthlyExpenses)}
            icon={ArrowDownCircle}
            tone="neutral"
          />
          <MetricCard
            label="Monthly Surplus"
            value={formatCurrency(monthlySurplus)}
            tone={surplusStatus}
            statusLabel={
              surplusStatus === 'good' ? 'Healthy' :
              surplusStatus === 'warning' ? 'Tight' : 'Deficit'
            }
          />
        </>
      }
    >
      {/* Flows Tabs */}
      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources" className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            Income Sources ({Array.isArray(incomeSources) ? incomeSources.length : 0})
          </TabsTrigger>
          <TabsTrigger value="income">Income ({incomeFlows.length})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({expenseFlows.length})</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({transferFlows.length})</TabsTrigger>
        </TabsList>

        {/* Income Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Income sources drive tax calculations. Changes automatically update tax withholding flows.
              </p>
            </div>
            <Button onClick={() => openIncomeSourceModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Income Source
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {isIncomeSourcesLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading income sources...</p>
              ) : !Array.isArray(incomeSources) || incomeSources.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No income sources configured. Add your first income source to calculate taxes.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Pay Frequency</TableHead>
                      <TableHead className="text-right">Gross Annual</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeSources.map((source) => (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">{source.name}</TableCell>
                        <TableCell>{INCOME_TYPES[source.incomeType] || source.incomeType}</TableCell>
                        <TableCell>{PAY_FREQUENCIES[source.payFrequency] || source.payFrequency}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatCurrency(parseFloat(source.grossAnnual || source.grossAnnualSalary || '0'))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openIncomeSourceModal(source)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteIncomeSource(source)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {Array.isArray(incomeSources) && incomeSources.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Total Gross Annual Income
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(totalGrossIncome)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openAddModal('income')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Income
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {incomeFlows.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No income flows added yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeFlows.map((flow) => (
                      <TableRow key={flow.id} className={!flow.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {flow.name}
                            {flow.isSystemGenerated && (
                              <span title="Auto-generated from income source" className="text-muted-foreground">
                                <Cpu className="h-3 w-3" />
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>{INCOME_CATEGORIES[flow.incomeCategory || ''] || flow.incomeCategory}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(flow.amount))}</TableCell>
                        <TableCell>{FREQUENCY_LABELS[flow.frequency] || flow.frequency}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(parseFloat(flow.monthlyAmount))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={flow.isActive ? 'good' : 'neutral'}
                            label={flow.isActive ? 'Active' : 'Inactive'}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(flow)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openAddModal('expense')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {expenseFlows.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No expense flows added yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseFlows.map((flow) => (
                      <TableRow key={flow.id} className={!flow.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {flow.name}
                            {flow.isSystemGenerated && (
                              <span title="Auto-generated from income source" className="text-muted-foreground">
                                <Cpu className="h-3 w-3" />
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>{EXPENSE_CATEGORIES[flow.expenseCategory || ''] || flow.expenseCategory}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(flow.amount))}</TableCell>
                        <TableCell>{FREQUENCY_LABELS[flow.frequency] || flow.frequency}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(parseFloat(flow.monthlyAmount))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={flow.isActive ? 'good' : 'neutral'}
                            label={flow.isActive ? 'Active' : 'Inactive'}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(flow)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openAddModal('transfer')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transfer
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {transferFlows.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No transfer flows added yet. Transfers move money between accounts (e.g., savings contributions, debt payments).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferFlows.map((flow) => (
                      <TableRow key={flow.id} className={!flow.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{flow.name}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(flow.amount))}</TableCell>
                        <TableCell>{FREQUENCY_LABELS[flow.frequency] || flow.frequency}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(parseFloat(flow.monthlyAmount))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={flow.isActive ? 'good' : 'neutral'}
                            label={flow.isActive ? 'Active' : 'Inactive'}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(flow)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Flow Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {newFlow.flowType === 'income' ? 'Income' : newFlow.flowType === 'expense' ? 'Expense' : 'Transfer'}
            </DialogTitle>
            <DialogDescription>
              Add a new recurring {newFlow.flowType === 'income' ? 'income source' : newFlow.flowType === 'expense' ? 'expense' : 'transfer between accounts'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newFlow.name}
                onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                placeholder={newFlow.flowType === 'income' ? 'e.g., Main Job Salary' : 'e.g., Rent'}
              />
            </div>
            {newFlow.flowType !== 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newFlow.flowType === 'income' ? newFlow.incomeCategory : newFlow.expenseCategory}
                  onChange={(e) =>
                    newFlow.flowType === 'income'
                      ? setNewFlow({ ...newFlow, incomeCategory: e.target.value })
                      : setNewFlow({ ...newFlow, expenseCategory: e.target.value })
                  }
                >
                  {(newFlow.flowType === 'income' ? INCOME_CATEGORY_GROUPS : EXPENSE_CATEGORY_GROUPS).map(
                    (group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newFlow.amount}
                  onChange={(e) => setNewFlow({ ...newFlow, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <select
                  id="frequency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newFlow.frequency}
                  onChange={(e) => setNewFlow({ ...newFlow, frequency: e.target.value })}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newFlow.startDate}
                  onChange={(e) => setNewFlow({ ...newFlow, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newFlow.endDate}
                  onChange={(e) => setNewFlow({ ...newFlow, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBaseline"
                checked={newFlow.isBaseline}
                onChange={(e) => setNewFlow({ ...newFlow, isBaseline: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isBaseline">Include in baseline projections</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateFlow}
                disabled={createFlowMutation.isPending || !newFlow.name || !newFlow.amount}
              >
                {createFlowMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Flow Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {selectedFlow?.flowType === 'income' ? 'Income' : selectedFlow?.flowType === 'expense' ? 'Expense' : 'Transfer'}
            </DialogTitle>
          </DialogHeader>
          {selectedFlow && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  value={selectedFlow.name}
                  onChange={(e) => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editAmount">Amount</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    step="0.01"
                    value={selectedFlow.amount}
                    onChange={(e) => setSelectedFlow({ ...selectedFlow, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editFrequency">Frequency</Label>
                  <select
                    id="editFrequency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedFlow.frequency}
                    onChange={(e) => setSelectedFlow({ ...selectedFlow, frequency: e.target.value })}
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndDate">End Date (optional)</Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={selectedFlow.endDate || ''}
                  onChange={(e) => setSelectedFlow({ ...selectedFlow, endDate: e.target.value || undefined })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={selectedFlow.isActive}
                  onChange={(e) => setSelectedFlow({ ...selectedFlow, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="editActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editBaseline"
                  checked={selectedFlow.isBaseline}
                  onChange={(e) => setSelectedFlow({ ...selectedFlow, isBaseline: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="editBaseline">Include in baseline projections</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateFlow} disabled={updateFlowMutation.isPending}>
                  {updateFlowMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Income Source Modal */}
      <Dialog open={incomeSourceModalOpen} onOpenChange={setIncomeSourceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIncomeSource ? 'Edit Income Source' : 'Add Income Source'}
            </DialogTitle>
            <DialogDescription>
              {editingIncomeSource
                ? 'Update income source details. Tax flows will be automatically recalculated.'
                : 'Add a new income source. Tax withholding will be automatically calculated.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sourceName">Name</Label>
              <Input
                id="sourceName"
                value={incomeSourceForm.name}
                onChange={(e) => setIncomeSourceForm({ ...incomeSourceForm, name: e.target.value })}
                placeholder="e.g., Primary Job, Side Gig"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Income Type</Label>
                <select
                  id="sourceType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={incomeSourceForm.incomeType}
                  onChange={(e) => setIncomeSourceForm({ ...incomeSourceForm, incomeType: e.target.value })}
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
                  value={incomeSourceForm.payFrequency}
                  onChange={(e) => setIncomeSourceForm({ ...incomeSourceForm, payFrequency: e.target.value })}
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
              <Label htmlFor="grossAnnual">Gross Annual Salary</Label>
              <Input
                id="grossAnnual"
                type="number"
                step="0.01"
                value={incomeSourceForm.grossAnnualSalary}
                onChange={(e) => setIncomeSourceForm({ ...incomeSourceForm, grossAnnualSalary: e.target.value })}
                placeholder="e.g., 75000"
              />
              <p className="text-xs text-muted-foreground">
                Enter your gross annual income before taxes and deductions
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIncomeSourceModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleIncomeSourceSave}
                disabled={
                  createIncomeSourceMutation.isPending ||
                  updateIncomeSourceMutation.isPending ||
                  !incomeSourceForm.name ||
                  !incomeSourceForm.grossAnnualSalary
                }
              >
                {(createIncomeSourceMutation.isPending || updateIncomeSourceMutation.isPending)
                  ? 'Saving...'
                  : editingIncomeSource
                  ? 'Save Changes'
                  : 'Add Income Source'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ControlListLayout>
  )
}
