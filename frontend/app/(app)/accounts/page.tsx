'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accounts as accountsApi } from '@/lib/api'
import { Account } from '@/lib/types'
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
import { Plus, RefreshCw, Building2, Wallet, CreditCard, Home, Car, GraduationCap } from 'lucide-react'

const LIABILITY_TYPES = new Set([
  'credit_card', 'heloc', 'primary_mortgage', 'auto_loan',
  'student_loan_federal', 'student_loan_private', 'personal_loan'
])

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  money_market: 'Money Market',
  brokerage: 'Brokerage',
  ira_traditional: 'Traditional IRA',
  ira_roth: 'Roth IRA',
  '401k_traditional': '401(k)',
  '401k_roth': 'Roth 401(k)',
  '529_plan': '529 Plan',
  hsa: 'HSA',
  crypto: 'Crypto',
  real_estate: 'Real Estate',
  vehicle: 'Vehicle',
  credit_card: 'Credit Card',
  heloc: 'HELOC',
  primary_mortgage: 'Mortgage',
  auto_loan: 'Auto Loan',
  student_loan_federal: 'Federal Student Loan',
  student_loan_private: 'Private Student Loan',
  personal_loan: 'Personal Loan',
}

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  checking: Wallet,
  savings: Wallet,
  brokerage: Building2,
  credit_card: CreditCard,
  real_estate: Home,
  vehicle: Car,
  primary_mortgage: Home,
  auto_loan: Car,
  student_loan_federal: GraduationCap,
  student_loan_private: GraduationCap,
}

function getAccountIcon(accountType: string) {
  return ACCOUNT_TYPE_ICONS[accountType] || Wallet
}

export default function AccountsPage() {
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [newBalance, setNewBalance] = useState('')
  const [newAccount, setNewAccount] = useState({
    name: '',
    accountType: 'checking',
    institution: '',
    currentBalance: '0',
  })

  const queryClient = useQueryClient()

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: string }) =>
      accountsApi.updateBalance(id, balance, new Date().toISOString().split('T')[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setUpdateModalOpen(false)
      setSelectedAccount(null)
    },
  })

  const createAccountMutation = useMutation({
    mutationFn: (data: Partial<Account>) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setAddModalOpen(false)
      setNewAccount({
        name: '',
        accountType: 'checking',
        institution: '',
        currentBalance: '0',
      })
    },
  })

  const accounts = accountsData?.results || []
  const assets = accounts.filter(a => !LIABILITY_TYPES.has(a.accountType))
  const liabilities = accounts.filter(a => LIABILITY_TYPES.has(a.accountType))

  const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.currentBalance || '0'), 0)
  const totalLiabilities = liabilities.reduce((sum, a) => sum + parseFloat(a.currentBalance || '0'), 0)
  const netWorth = totalAssets - totalLiabilities

  const openUpdateModal = (account: Account) => {
    setSelectedAccount(account)
    setNewBalance(account.currentBalance)
    setUpdateModalOpen(true)
  }

  const handleUpdateBalance = () => {
    if (selectedAccount) {
      updateBalanceMutation.mutate({ id: selectedAccount.id, balance: newBalance })
    }
  }

  const handleCreateAccount = () => {
    createAccountMutation.mutate({
      name: newAccount.name,
      accountType: newAccount.accountType,
      institution: newAccount.institution,
      currentBalance: newAccount.currentBalance,
      isActive: true,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your assets and liabilities
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netWorth)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No assets added yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((account) => {
                  const Icon = getAccountIcon(account.accountType)
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{account.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}</TableCell>
                      <TableCell className="text-muted-foreground">{account.institution || '—'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(account.currentBalance)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openUpdateModal(account)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Liabilities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {liabilities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No liabilities added yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilities.map((account) => {
                  const Icon = getAccountIcon(account.accountType)
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{account.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}</TableCell>
                      <TableCell className="text-muted-foreground">{account.institution || '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(account.currentBalance)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openUpdateModal(account)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Balance Modal */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Balance</DialogTitle>
            <DialogDescription>
              Update the current balance for {selectedAccount?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="balance">New Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateBalance} disabled={updateBalanceMutation.isPending}>
                {updateBalanceMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>
              Add a new asset or liability account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="e.g., Chase Checking"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Account Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newAccount.accountType}
                onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value })}
              >
                <optgroup label="Bank Accounts">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="money_market">Money Market</option>
                </optgroup>
                <optgroup label="Investment Accounts">
                  <option value="brokerage">Brokerage</option>
                  <option value="ira_traditional">Traditional IRA</option>
                  <option value="ira_roth">Roth IRA</option>
                  <option value="401k_traditional">401(k)</option>
                  <option value="401k_roth">Roth 401(k)</option>
                  <option value="529_plan">529 Plan</option>
                  <option value="hsa">HSA</option>
                  <option value="crypto">Crypto</option>
                </optgroup>
                <optgroup label="Property">
                  <option value="real_estate">Real Estate</option>
                  <option value="vehicle">Vehicle</option>
                </optgroup>
                <optgroup label="Credit">
                  <option value="credit_card">Credit Card</option>
                  <option value="heloc">HELOC</option>
                </optgroup>
                <optgroup label="Loans">
                  <option value="primary_mortgage">Mortgage</option>
                  <option value="auto_loan">Auto Loan</option>
                  <option value="student_loan_federal">Federal Student Loan</option>
                  <option value="student_loan_private">Private Student Loan</option>
                  <option value="personal_loan">Personal Loan</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={newAccount.institution}
                onChange={(e) => setNewAccount({ ...newAccount, institution: e.target.value })}
                placeholder="e.g., Chase Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Current Balance</Label>
              <Input
                id="initialBalance"
                type="number"
                step="0.01"
                value={newAccount.currentBalance}
                onChange={(e) => setNewAccount({ ...newAccount, currentBalance: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAccount}
                disabled={createAccountMutation.isPending || !newAccount.name}
              >
                {createAccountMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
