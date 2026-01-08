'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { accounts as api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
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
}

export function AccountsList({ accounts }: AccountsListProps) {
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

  const assets = accounts.filter(a => !LIABILITY_TYPES.has(a.accountType));
  const liabilities = accounts.filter(a => LIABILITY_TYPES.has(a.accountType));

  const openUpdate = (acct: Account) => {
    setSelected(acct);
    setBalance(acct.currentBalance);
    setOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {assets.map(a => (
              <div key={a.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{a.institution}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(a.currentBalance)}</span>
                  <Button variant="ghost" size="sm" onClick={() => openUpdate(a)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {liabilities.map(a => (
              <div key={a.id} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{a.institution}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-600">{formatCurrency(a.currentBalance)}</span>
                  <Button variant="ghost" size="sm" onClick={() => openUpdate(a)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update: {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>New Balance</Label>
              <Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} />
            </div>
            <Button onClick={() => mutation.mutate({ id: selected!.id, balance })} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
