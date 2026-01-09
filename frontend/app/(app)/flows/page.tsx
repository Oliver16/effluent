'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flows as flowsApi, normalizeListResponse } from '@/lib/api'
import { RecurringFlow } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Pencil, RefreshCw, Cpu } from 'lucide-react'

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

  const queryClient = useQueryClient()

  const { data: flowsData, isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.list().then(normalizeListResponse),
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

  const flows = flowsData || []
  const incomeFlows = flows.filter(f => f.flowType === 'income')
  const expenseFlows = flows.filter(f => f.flowType === 'expense')
  const transferFlows = flows.filter(f => f.flowType === 'transfer')
  const systemFlowCount = flows.filter(f => f.isSystemGenerated).length

  const totalMonthlyIncome = incomeFlows
    .filter(f => f.isActive)
    .reduce((sum, f) => sum + parseFloat(f.monthlyAmount || '0'), 0)
  const totalMonthlyExpenses = expenseFlows
    .filter(f => f.isActive)
    .reduce((sum, f) => sum + parseFloat(f.monthlyAmount || '0'), 0)
  const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Cash Flows</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Flows</h1>
          <p className="text-sm text-muted-foreground">
            Manage your recurring income and expenses
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => regenerateFlowsMutation.mutate()}
          disabled={regenerateFlowsMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${regenerateFlowsMutation.isPending ? 'animate-spin' : ''}`} />
          {regenerateFlowsMutation.isPending ? 'Regenerating...' : 'Sync Tax Flows'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalMonthlyIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalMonthlyExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Surplus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${monthlySurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlySurplus)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flows Tabs */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">Income ({incomeFlows.length})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({expenseFlows.length})</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({transferFlows.length})</TabsTrigger>
        </TabsList>

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
                        <TableCell>{formatCurrency(flow.amount)}</TableCell>
                        <TableCell>{FREQUENCY_LABELS[flow.frequency] || flow.frequency}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(flow.monthlyAmount)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            flow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {flow.isActive ? 'Active' : 'Inactive'}
                          </span>
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
                        <TableCell>{formatCurrency(flow.amount)}</TableCell>
                        <TableCell>{FREQUENCY_LABELS[flow.frequency] || flow.frequency}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(flow.monthlyAmount)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            flow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {flow.isActive ? 'Active' : 'Inactive'}
                          </span>
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
                        <TableCell>{formatCurrency(flow.amount)}</TableCell>
                        <TableCell>{FREQUENCY_LABELS[flow.frequency] || flow.frequency}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(flow.monthlyAmount)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            flow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {flow.isActive ? 'Active' : 'Inactive'}
                          </span>
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
    </div>
  )
}
