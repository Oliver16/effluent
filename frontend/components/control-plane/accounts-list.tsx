'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SectionCard } from '@/components/layout/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/Skeletons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { accounts as api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, Wallet, CreditCard } from 'lucide-react';
import { Account } from '@/lib/types';

// Complete list of liability types - must match backend LIABILITY_TYPES
const LIABILITY_TYPES = new Set([
  // Revolving debt
  'credit_card', 'store_card', 'heloc', 'personal_loc', 'business_loc',
  // Mortgages
  'primary_mortgage', 'rental_mortgage', 'second_mortgage',
  // Installment loans
  'auto_loan', 'personal_loan', 'student_loan_federal', 'student_loan_private',
  'boat_loan', 'medical_debt', 'tax_debt', 'family_loan', 'other_liability'
]);

interface AccountsListProps {
  accounts: Account[];
  isLoading?: boolean;
}

function AccountRow({
  account,
  isLiability,
  onUpdate,
}: {
  account: Account;
  isLiability: boolean;
  onUpdate: (a: Account) => void;
}) {
  return (
    <div className="flex justify-between items-center py-3 px-1 border-b border-border/50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{account.name}</p>
        <p className="text-xs text-muted-foreground truncate">{account.institution}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-semibold tabular-nums ${isLiability ? 'text-red-600 dark:text-red-400' : ''}`}>
          {formatCurrency(account.currentBalance)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onUpdate(account)}
          aria-label={`Update ${account.name} balance`}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AccountsList({ accounts, isLoading }: AccountsListProps) {
  const [selected, setSelected] = useState<Account | null>(null);
  const [balance, setBalance] = useState('');
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: string }) =>
      api.updateBalance(id, balance, new Date().toISOString().split('T')[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
      setOpen(false);
    },
    onError: (error) => {
      console.error('Failed to update balance:', error);
    },
  });

  const openUpdate = (acct: Account) => {
    setSelected(acct);
    setBalance(acct.currentBalance);
    setOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Assets">
          <ListRowSkeleton count={3} />
        </SectionCard>
        <SectionCard title="Liabilities">
          <ListRowSkeleton count={3} />
        </SectionCard>
      </div>
    );
  }

  const assets = accounts.filter(a => !LIABILITY_TYPES.has(a.accountType));
  const liabilities = accounts.filter(a => LIABILITY_TYPES.has(a.accountType));

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Assets">
          {assets.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No assets"
              description="Add your first asset account to track your wealth"
            />
          ) : (
            <div className="divide-y divide-border/50">
              {assets.map(a => (
                <AccountRow
                  key={a.id}
                  account={a}
                  isLiability={false}
                  onUpdate={openUpdate}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Liabilities">
          {liabilities.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No liabilities"
              description="Add any debts or loans you have"
            />
          ) : (
            <div className="divide-y divide-border/50">
              {liabilities.map(a => (
                <AccountRow
                  key={a.id}
                  account={a}
                  isLiability={true}
                  onUpdate={openUpdate}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update: {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="balance">New Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button
              onClick={() => mutation.mutate({ id: selected!.id, balance })}
              disabled={mutation.isPending}
              className="w-full"
            >
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
