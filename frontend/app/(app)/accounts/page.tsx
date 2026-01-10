'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accounts as accountsApi } from '@/lib/api';
import { Account } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { ControlListLayout } from '@/components/layout/ControlListLayout';
import { MetricCard } from '@/components/ui/MetricCard';
import { FreshnessIndicator } from '@/components/ui/FreshnessIndicator';
import { TableDensityToggle } from '@/components/ui/TableDensityToggle';
import { InstrumentPanel } from '@/components/ui/InstrumentPanel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DENSITY, DensityMode, DEFAULT_DENSITY, TYPOGRAPHY } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  Building2,
  Wallet,
  CreditCard,
  Home,
  Car,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Loader2,
  Landmark,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LIABILITY_TYPES = new Set([
  'credit_card',
  'store_card',
  'heloc',
  'personal_loc',
  'business_loc',
  'primary_mortgage',
  'rental_mortgage',
  'second_mortgage',
  'auto_loan',
  'personal_loan',
  'student_loan_federal',
  'student_loan_private',
  'boat_loan',
  'medical_debt',
  'tax_debt',
  'family_loan',
  'other_liability',
]);

// Financial accounts with actual balances at institutions
const ACCOUNT_ASSET_TYPES = new Set([
  // Cash & Equivalents
  'checking',
  'savings',
  'money_market',
  'cd',
  'cash',
  // Investment Accounts
  'brokerage',
  'crypto',
  // Retirement Accounts
  'traditional_401k',
  'roth_401k',
  'traditional_ira',
  'roth_ira',
  'sep_ira',
  'simple_ira',
  'tsp',
  'pension',
  'annuity',
  'hsa',
]);

// Physical/tangible assets (property, vehicles, etc.)
const FIXED_ASSET_TYPES = new Set([
  // Real Property
  'primary_residence',
  'rental_property',
  'vacation_property',
  'land',
  'commercial_property',
  // Personal Property
  'vehicle',
  'boat',
  'jewelry',
  'other_asset',
  // Business & Receivables
  'business_equity',
  'accounts_receivable',
  'loans_receivable',
  'tax_refund',
]);

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  money_market: 'Money Market',
  cd: 'Certificate of Deposit',
  cash: 'Cash on Hand',
  brokerage: 'Brokerage',
  crypto: 'Cryptocurrency',
  traditional_401k: '401(k) - Traditional',
  roth_401k: '401(k) - Roth',
  traditional_ira: 'IRA - Traditional',
  roth_ira: 'IRA - Roth',
  sep_ira: 'SEP IRA',
  simple_ira: 'SIMPLE IRA',
  tsp: 'TSP (Federal)',
  pension: 'Pension',
  annuity: 'Annuity',
  hsa: 'Health Savings Account',
  primary_residence: 'Primary Residence',
  rental_property: 'Rental Property',
  vacation_property: 'Vacation Property',
  land: 'Land',
  commercial_property: 'Commercial Property',
  vehicle: 'Vehicle',
  boat: 'Boat/RV',
  jewelry: 'Jewelry/Collectibles',
  other_asset: 'Other Asset',
  business_equity: 'Business Equity',
  accounts_receivable: 'Accounts Receivable',
  loans_receivable: 'Loans Receivable',
  tax_refund: 'Tax Refund',
  credit_card: 'Credit Card',
  store_card: 'Store Credit Card',
  heloc: 'HELOC',
  personal_loc: 'Personal LOC',
  business_loc: 'Business LOC',
  primary_mortgage: 'Primary Mortgage',
  rental_mortgage: 'Rental Mortgage',
  second_mortgage: 'Second Mortgage',
  auto_loan: 'Auto Loan',
  personal_loan: 'Personal Loan',
  student_loan_federal: 'Federal Student Loan',
  student_loan_private: 'Private Student Loan',
  boat_loan: 'Boat/RV Loan',
  medical_debt: 'Medical Debt',
  tax_debt: 'Tax Debt Owed',
  family_loan: 'Loan from Family',
  other_liability: 'Other Liability',
};

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  checking: Wallet,
  savings: Wallet,
  money_market: Wallet,
  cd: Wallet,
  cash: Wallet,
  brokerage: Building2,
  crypto: Building2,
  traditional_401k: Building2,
  roth_401k: Building2,
  traditional_ira: Building2,
  roth_ira: Building2,
  sep_ira: Building2,
  simple_ira: Building2,
  tsp: Building2,
  pension: Building2,
  annuity: Building2,
  hsa: Building2,
  primary_residence: Home,
  rental_property: Home,
  vacation_property: Home,
  land: Home,
  commercial_property: Home,
  vehicle: Car,
  boat: Car,
  jewelry: Landmark,
  other_asset: Landmark,
  business_equity: Building2,
  accounts_receivable: Wallet,
  loans_receivable: Wallet,
  tax_refund: Wallet,
  credit_card: CreditCard,
  store_card: CreditCard,
  heloc: Home,
  primary_mortgage: Home,
  rental_mortgage: Home,
  second_mortgage: Home,
  auto_loan: Car,
  student_loan_federal: GraduationCap,
  student_loan_private: GraduationCap,
};

function getAccountIcon(accountType: string) {
  return ACCOUNT_TYPE_ICONS[accountType] || Wallet;
}

export default function AccountsPage() {
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [density, setDensity] = useState<DensityMode>(DEFAULT_DENSITY);
  const [newAccount, setNewAccount] = useState({
    name: '',
    accountType: 'checking',
    institution: '',
    currentBalance: '0',
  });
  const [editAccount, setEditAccount] = useState({
    name: '',
    accountType: 'checking',
    institution: '',
    currentBalance: '',
  });

  const queryClient = useQueryClient();

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: string }) =>
      accountsApi.updateBalance(id, balance, new Date().toISOString().split('T')[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setUpdateModalOpen(false);
      setSelectedAccount(null);
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: Partial<Account>) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setAddModalOpen(false);
      setNewAccount({
        name: '',
        accountType: 'checking',
        institution: '',
        currentBalance: '0',
      });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data, balanceChanged, newBalance }: { id: string; data: Partial<Account>; balanceChanged: boolean; newBalance: string }) => {
      // Update account metadata
      await accountsApi.update(id, data);
      // If balance changed, update via balance endpoint (current_balance is read-only on PATCH)
      if (balanceChanged && newBalance) {
        const today = new Date().toISOString().split('T')[0];
        await accountsApi.updateBalance(id, newBalance, today);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setEditModalOpen(false);
      setSelectedAccount(null);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });

  const allAccounts = accountsData?.results || [];

  // Separate into accounts (financial), fixed assets (tangible property), and liabilities
  const accounts = allAccounts.filter((a) => ACCOUNT_ASSET_TYPES.has(a.accountType));
  const fixedAssets = allAccounts.filter((a) => FIXED_ASSET_TYPES.has(a.accountType));
  const liabilities = allAccounts.filter((a) => LIABILITY_TYPES.has(a.accountType));

  const totalAccounts = accounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || '0'), 0);
  const totalFixedAssets = fixedAssets.reduce(
    (sum, a) => sum + parseFloat(a.currentBalance || '0'),
    0
  );
  const totalAssets = totalAccounts + totalFixedAssets;
  const totalLiabilities = liabilities.reduce(
    (sum, a) => sum + Math.abs(parseFloat(a.currentBalance || '0')),
    0
  );
  const netWorth = totalAssets - totalLiabilities;

  const openUpdateModal = (account: Account) => {
    setSelectedAccount(account);
    setNewBalance(account.currentBalance);
    setUpdateModalOpen(true);
  };

  const handleUpdateBalance = () => {
    if (selectedAccount) {
      updateBalanceMutation.mutate({ id: selectedAccount.id, balance: newBalance });
    }
  };

  const handleCreateAccount = () => {
    createAccountMutation.mutate({
      name: newAccount.name,
      accountType: newAccount.accountType,
      institution: newAccount.institution,
      currentBalance: newAccount.currentBalance,
      isActive: true,
    });
  };

  const openEditModal = (account: Account) => {
    setSelectedAccount(account);
    setEditAccount({
      name: account.name || '',
      accountType: account.accountType || 'checking',
      institution: account.institution || '',
      currentBalance: account.currentBalance || '0',
    });
    setEditModalOpen(true);
  };

  const handleUpdateAccount = () => {
    if (!selectedAccount) return;
    const data = {
      name: editAccount.name,
      accountType: editAccount.accountType,
      institution: editAccount.institution,
      isActive: true,
    };
    const balanceChanged = editAccount.currentBalance !== selectedAccount.currentBalance;
    updateAccountMutation.mutate({
      id: selectedAccount.id,
      data,
      balanceChanged,
      newBalance: editAccount.currentBalance,
    });
  };

  const handleDeleteAccount = (account: Account) => {
    if (confirm(`Delete "${account.name}"? This action cannot be undone.`)) {
      deleteAccountMutation.mutate(account.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const densityStyles = DENSITY[density];

  return (
    <ControlListLayout
      title="Accounts"
      subtitle="Manage your accounts, assets, and liabilities"
      actions={
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      }
      stats={
        <>
          <MetricCard
            label="Total Assets"
            value={formatCurrency(totalAssets)}
            tone="neutral"
            icon={TrendingUp}
            statusLabel={`${accounts.length} accounts · ${fixedAssets.length} fixed`}
          />
          <MetricCard
            label="Total Liabilities"
            value={formatCurrency(totalLiabilities)}
            tone="neutral"
            icon={TrendingDown}
          />
          <MetricCard
            label="Net Worth"
            value={formatCurrency(netWorth)}
            tone={netWorth >= 0 ? 'good' : 'warning'}
            icon={Wallet}
          />
        </>
      }
      tableControls={
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {allAccounts.length} total
          </span>
          <TableDensityToggle value={density} onChange={setDensity} />
        </div>
      }
    >
      {/* Accounts Section - Financial accounts with balances */}
      <InstrumentPanel
        title="Accounts"
        subtitle={`${accounts.length} account${accounts.length !== 1 ? 's' : ''} · Cash, investment, and retirement`}
        controls={
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(totalAccounts)}
          </span>
        }
      >
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No accounts added yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TYPOGRAPHY.tableHeader}>Account</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Type</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Institution</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Last Updated</TableHead>
                <TableHead className={cn(TYPOGRAPHY.tableHeader, 'text-right')}>Balance</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const Icon = getAccountIcon(account.accountType);
                return (
                  <TableRow key={account.id} className={cn(densityStyles.row, 'group')}>
                    <TableCell className={cn(densityStyles.cell)}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{account.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, densityStyles.text)}>
                      {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, densityStyles.text, 'text-muted-foreground')}>
                      {account.institution || '—'}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell)}>
                      {account.balanceUpdatedAt ? (
                        <FreshnessIndicator lastUpdated={account.balanceUpdatedAt} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, 'text-right font-semibold tabular-nums')}>
                      {formatCurrency(parseFloat(account.currentBalance) || 0)}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell)}>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openUpdateModal(account)}
                          title="Update balance"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(account)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteAccount(account)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </InstrumentPanel>

      {/* Fixed Assets Section - Property, vehicles, etc. */}
      <InstrumentPanel
        title="Fixed Assets"
        subtitle={`${fixedAssets.length} asset${fixedAssets.length !== 1 ? 's' : ''} · Property, vehicles, and other tangible assets`}
        className="mt-6"
        controls={
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(totalFixedAssets)}
          </span>
        }
      >
        {fixedAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No fixed assets added yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TYPOGRAPHY.tableHeader}>Asset</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Type</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Description</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Last Updated</TableHead>
                <TableHead className={cn(TYPOGRAPHY.tableHeader, 'text-right')}>Value</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixedAssets.map((asset) => {
                const Icon = getAccountIcon(asset.accountType);
                return (
                  <TableRow key={asset.id} className={cn(densityStyles.row, 'group')}>
                    <TableCell className={cn(densityStyles.cell)}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{asset.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, densityStyles.text)}>
                      {ACCOUNT_TYPE_LABELS[asset.accountType] || asset.accountType}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, densityStyles.text, 'text-muted-foreground')}>
                      {asset.institution || '—'}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell)}>
                      {asset.balanceUpdatedAt ? (
                        <FreshnessIndicator lastUpdated={asset.balanceUpdatedAt} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, 'text-right font-semibold tabular-nums')}>
                      {formatCurrency(parseFloat(asset.currentBalance) || 0)}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell)}>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openUpdateModal(asset)}
                          title="Update value"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(asset)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteAccount(asset)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </InstrumentPanel>

      {/* Liabilities Section */}
      <InstrumentPanel
        title="Liabilities"
        subtitle={`${liabilities.length} account${liabilities.length !== 1 ? 's' : ''} · Loans, credit cards, and other debts`}
        className="mt-6"
        controls={
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(totalLiabilities)}
          </span>
        }
      >
        {liabilities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No liabilities added yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TYPOGRAPHY.tableHeader}>Account</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Type</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Institution</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>Last Updated</TableHead>
                <TableHead className={cn(TYPOGRAPHY.tableHeader, 'text-right')}>Balance</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liabilities.map((account) => {
                const Icon = getAccountIcon(account.accountType);
                return (
                  <TableRow key={account.id} className={cn(densityStyles.row, 'group')}>
                    <TableCell className={cn(densityStyles.cell)}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{account.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, densityStyles.text)}>
                      {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, densityStyles.text, 'text-muted-foreground')}>
                      {account.institution || '—'}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell)}>
                      {account.balanceUpdatedAt ? (
                        <FreshnessIndicator lastUpdated={account.balanceUpdatedAt} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell, 'text-right font-semibold tabular-nums')}>
                      {formatCurrency(Math.abs(parseFloat(account.currentBalance) || 0))}
                    </TableCell>
                    <TableCell className={cn(densityStyles.cell)}>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openUpdateModal(account)}
                          title="Update balance"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(account)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteAccount(account)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </InstrumentPanel>

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
        <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Add a new account, asset, or liability</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="e.g., Chase Checking"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newAccount.accountType}
                onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value })}
              >
                <optgroup label="Cash & Equivalents">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="money_market">Money Market</option>
                  <option value="cd">Certificate of Deposit</option>
                  <option value="cash">Cash on Hand</option>
                </optgroup>
                <optgroup label="Investment Accounts">
                  <option value="brokerage">Brokerage</option>
                  <option value="crypto">Cryptocurrency</option>
                </optgroup>
                <optgroup label="Retirement Accounts">
                  <option value="traditional_401k">401(k) - Traditional</option>
                  <option value="roth_401k">401(k) - Roth</option>
                  <option value="traditional_ira">IRA - Traditional</option>
                  <option value="roth_ira">IRA - Roth</option>
                  <option value="sep_ira">SEP IRA</option>
                  <option value="simple_ira">SIMPLE IRA</option>
                  <option value="tsp">TSP (Federal)</option>
                  <option value="pension">Pension</option>
                  <option value="annuity">Annuity</option>
                  <option value="hsa">Health Savings Account</option>
                </optgroup>
                <optgroup label="Real Property">
                  <option value="primary_residence">Primary Residence</option>
                  <option value="rental_property">Rental Property</option>
                  <option value="vacation_property">Vacation Property</option>
                  <option value="land">Land</option>
                  <option value="commercial_property">Commercial Property</option>
                </optgroup>
                <optgroup label="Personal Property">
                  <option value="vehicle">Vehicle</option>
                  <option value="boat">Boat/RV</option>
                  <option value="jewelry">Jewelry/Collectibles</option>
                  <option value="other_asset">Other Asset</option>
                </optgroup>
                <optgroup label="Credit Cards">
                  <option value="credit_card">Credit Card</option>
                  <option value="store_card">Store Credit Card</option>
                </optgroup>
                <optgroup label="Lines of Credit">
                  <option value="heloc">Home Equity Line of Credit</option>
                  <option value="personal_loc">Personal Line of Credit</option>
                  <option value="business_loc">Business Line of Credit</option>
                </optgroup>
                <optgroup label="Mortgages">
                  <option value="primary_mortgage">Primary Residence Mortgage</option>
                  <option value="rental_mortgage">Rental Property Mortgage</option>
                  <option value="second_mortgage">Second Mortgage</option>
                </optgroup>
                <optgroup label="Installment Loans">
                  <option value="auto_loan">Auto Loan</option>
                  <option value="personal_loan">Personal Loan</option>
                  <option value="student_loan_federal">Federal Student Loan</option>
                  <option value="student_loan_private">Private Student Loan</option>
                  <option value="boat_loan">Boat/RV Loan</option>
                </optgroup>
                <optgroup label="Other Liabilities">
                  <option value="medical_debt">Medical Debt</option>
                  <option value="tax_debt">Tax Debt Owed</option>
                  <option value="family_loan">Loan from Family/Friends</option>
                  <option value="other_liability">Other Liability</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Institution / Description</Label>
              <Input
                id="institution"
                value={newAccount.institution}
                onChange={(e) => setNewAccount({ ...newAccount, institution: e.target.value })}
                placeholder="e.g., Chase Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Current Balance / Value</Label>
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

      {/* Edit Account Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update account details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editAccount.name}
                onChange={(e) => setEditAccount({ ...editAccount, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editType">Type</Label>
              <select
                id="editType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editAccount.accountType}
                onChange={(e) => setEditAccount({ ...editAccount, accountType: e.target.value })}
              >
                <optgroup label="Cash & Equivalents">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="money_market">Money Market</option>
                  <option value="cd">Certificate of Deposit</option>
                  <option value="cash">Cash on Hand</option>
                </optgroup>
                <optgroup label="Investment Accounts">
                  <option value="brokerage">Brokerage</option>
                  <option value="crypto">Cryptocurrency</option>
                </optgroup>
                <optgroup label="Retirement Accounts">
                  <option value="traditional_401k">401(k) - Traditional</option>
                  <option value="roth_401k">401(k) - Roth</option>
                  <option value="traditional_ira">IRA - Traditional</option>
                  <option value="roth_ira">IRA - Roth</option>
                  <option value="sep_ira">SEP IRA</option>
                  <option value="simple_ira">SIMPLE IRA</option>
                  <option value="tsp">TSP (Federal)</option>
                  <option value="pension">Pension</option>
                  <option value="annuity">Annuity</option>
                  <option value="hsa">Health Savings Account</option>
                </optgroup>
                <optgroup label="Real Property">
                  <option value="primary_residence">Primary Residence</option>
                  <option value="rental_property">Rental Property</option>
                  <option value="vacation_property">Vacation Property</option>
                  <option value="land">Land</option>
                  <option value="commercial_property">Commercial Property</option>
                </optgroup>
                <optgroup label="Personal Property">
                  <option value="vehicle">Vehicle</option>
                  <option value="boat">Boat/RV</option>
                  <option value="jewelry">Jewelry/Collectibles</option>
                  <option value="other_asset">Other Asset</option>
                </optgroup>
                <optgroup label="Credit Cards">
                  <option value="credit_card">Credit Card</option>
                  <option value="store_card">Store Credit Card</option>
                </optgroup>
                <optgroup label="Lines of Credit">
                  <option value="heloc">Home Equity Line of Credit</option>
                  <option value="personal_loc">Personal Line of Credit</option>
                  <option value="business_loc">Business Line of Credit</option>
                </optgroup>
                <optgroup label="Mortgages">
                  <option value="primary_mortgage">Primary Residence Mortgage</option>
                  <option value="rental_mortgage">Rental Property Mortgage</option>
                  <option value="second_mortgage">Second Mortgage</option>
                </optgroup>
                <optgroup label="Installment Loans">
                  <option value="auto_loan">Auto Loan</option>
                  <option value="personal_loan">Personal Loan</option>
                  <option value="student_loan_federal">Federal Student Loan</option>
                  <option value="student_loan_private">Private Student Loan</option>
                  <option value="boat_loan">Boat/RV Loan</option>
                </optgroup>
                <optgroup label="Other Liabilities">
                  <option value="medical_debt">Medical Debt</option>
                  <option value="tax_debt">Tax Debt Owed</option>
                  <option value="family_loan">Loan from Family/Friends</option>
                  <option value="other_liability">Other Liability</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editInstitution">Institution / Description</Label>
              <Input
                id="editInstitution"
                value={editAccount.institution}
                onChange={(e) => setEditAccount({ ...editAccount, institution: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editBalance">Current Balance / Value</Label>
              <Input
                id="editBalance"
                type="number"
                step="0.01"
                value={editAccount.currentBalance}
                onChange={(e) => setEditAccount({ ...editAccount, currentBalance: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateAccount}
                disabled={updateAccountMutation.isPending || !editAccount.name}
              >
                {updateAccountMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ControlListLayout>
  );
}
