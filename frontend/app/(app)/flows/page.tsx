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
import { Plus, ArrowUpCircle, ArrowDownCircle, Pencil } from 'lucide-react'

const INCOME_CATEGORIES: Record<string, string> = {
  salary: 'Salary',
  bonus: 'Bonus',
  freelance: 'Freelance',
  rental: 'Rental Income',
  dividends: 'Dividends',
  interest: 'Interest',
  social_security: 'Social Security',
  pension: 'Pension',
  other_income: 'Other Income',
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  insurance: 'Insurance',
  transportation: 'Transportation',
  food: 'Food & Groceries',
  healthcare: 'Healthcare',
  childcare: 'Childcare',
  education: 'Education',
  entertainment: 'Entertainment',
  subscriptions: 'Subscriptions',
  debt_payment: 'Debt Payment',
  savings: 'Savings',
  other_expense: 'Other Expense',
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

export default function FlowsPage() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<RecurringFlow | null>(null)
  const [newFlow, setNewFlow] = useState({
    name: '',
    flowType: 'income' as 'income' | 'expense',
    incomeCategory: 'salary',
    expenseCategory: 'housing',
    amount: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
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

  const flows = flowsData || []
  const incomeFlows = flows.filter(f => f.flowType === 'income')
  const expenseFlows = flows.filter(f => f.flowType === 'expense')

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
      expenseCategory: 'housing',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    })
  }

  const openAddModal = (type: 'income' | 'expense') => {
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
                        <TableCell className="font-medium">{flow.name}</TableCell>
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
                        <TableCell className="font-medium">{flow.name}</TableCell>
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
      </Tabs>

      {/* Add Flow Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {newFlow.flowType === 'income' ? 'Income' : 'Expense'}
            </DialogTitle>
            <DialogDescription>
              Add a new recurring {newFlow.flowType === 'income' ? 'income source' : 'expense'}
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
                {Object.entries(newFlow.flowType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
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
            <DialogTitle>Edit {selectedFlow?.flowType === 'income' ? 'Income' : 'Expense'}</DialogTitle>
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
