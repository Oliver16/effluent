'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/Skeletons';
import { formatCurrency } from '@/lib/utils';
import { Wallet, CreditCard } from 'lucide-react';
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

// Asset category mappings
const ASSET_CATEGORIES: Record<string, string> = {
  // Cash & Equivalents
  checking: 'Cash & Equivalents',
  savings: 'Cash & Equivalents',
  money_market: 'Cash & Equivalents',
  cd: 'Cash & Equivalents',
  cash: 'Cash & Equivalents',
  // Investments
  brokerage: 'Investments',
  crypto: 'Investments',
  // Retirement
  traditional_401k: 'Retirement',
  roth_401k: 'Retirement',
  traditional_ira: 'Retirement',
  roth_ira: 'Retirement',
  sep_ira: 'Retirement',
  simple_ira: 'Retirement',
  tsp: 'Retirement',
  pension: 'Retirement',
  annuity: 'Retirement',
  hsa: 'Retirement',
  // Real Estate
  primary_residence: 'Real Estate',
  rental_property: 'Real Estate',
  vacation_property: 'Real Estate',
  land: 'Real Estate',
  commercial_property: 'Real Estate',
  // Personal Property
  vehicle: 'Personal Property',
  boat: 'Personal Property',
  jewelry: 'Personal Property',
  other_asset: 'Personal Property',
  // Business
  business_equity: 'Business',
  llc: 'Business',
  // Other
  accounts_receivable: 'Other Assets',
  loans_receivable: 'Other Assets',
  tax_refund: 'Other Assets',
};

// Liability category mappings
const LIABILITY_CATEGORIES: Record<string, string> = {
  // Revolving Debt
  credit_card: 'Revolving Debt',
  store_card: 'Revolving Debt',
  heloc: 'Revolving Debt',
  personal_loc: 'Revolving Debt',
  business_loc: 'Revolving Debt',
  // Mortgages
  primary_mortgage: 'Mortgages',
  rental_mortgage: 'Mortgages',
  second_mortgage: 'Mortgages',
  // Loans
  auto_loan: 'Loans',
  personal_loan: 'Loans',
  student_loan_federal: 'Student Loans',
  student_loan_private: 'Student Loans',
  boat_loan: 'Loans',
  medical_debt: 'Other Debt',
  tax_debt: 'Other Debt',
  family_loan: 'Other Debt',
  other_liability: 'Other Debt',
};

// Display order for categories
const ASSET_CATEGORY_ORDER = [
  'Cash & Equivalents',
  'Investments',
  'Retirement',
  'Real Estate',
  'Personal Property',
  'Business',
  'Other Assets',
];

const LIABILITY_CATEGORY_ORDER = [
  'Mortgages',
  'Student Loans',
  'Loans',
  'Revolving Debt',
  'Other Debt',
];

interface CategoryTotal {
  category: string;
  total: number;
}

function groupByCategory(
  accounts: Account[],
  categoryMap: Record<string, string>,
  categoryOrder: string[]
): CategoryTotal[] {
  const totals: Record<string, number> = {};

  for (const account of accounts) {
    const category = categoryMap[account.accountType] || 'Other';
    const balance = parseFloat(account.currentBalance) || 0;
    totals[category] = (totals[category] || 0) + balance;
  }

  return categoryOrder
    .filter(cat => totals[cat] !== undefined && totals[cat] !== 0)
    .map(cat => ({ category: cat, total: totals[cat] }));
}

interface AccountsListProps {
  accounts: Account[];
  isLoading?: boolean;
}

function CategoryRow({
  category,
  total,
  isLiability,
}: {
  category: string;
  total: number;
  isLiability: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-3 px-1 border-b border-border/50 last:border-0">
      <p className="font-medium text-sm">{category}</p>
      <span className={`font-semibold tabular-nums ${isLiability ? 'text-red-600 dark:text-red-400' : ''}`}>
        {formatCurrency(total.toString())}
      </span>
    </div>
  );
}

export function AccountsList({ accounts, isLoading }: AccountsListProps) {
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

  const assetTotals = groupByCategory(assets, ASSET_CATEGORIES, ASSET_CATEGORY_ORDER);
  const liabilityTotals = groupByCategory(liabilities, LIABILITY_CATEGORIES, LIABILITY_CATEGORY_ORDER);

  const totalAssets = assetTotals.reduce((sum, cat) => sum + cat.total, 0);
  const totalLiabilities = liabilityTotals.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SectionCard title="Assets">
        {assetTotals.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No assets"
            description="Add your first asset account to track your wealth"
          />
        ) : (
          <div className="divide-y divide-border/50">
            {assetTotals.map(({ category, total }) => (
              <CategoryRow
                key={category}
                category={category}
                total={total}
                isLiability={false}
              />
            ))}
            <div className="flex justify-between items-center py-3 px-1 pt-4">
              <p className="font-semibold text-sm">Total</p>
              <span className="font-bold tabular-nums">
                {formatCurrency(totalAssets.toString())}
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Liabilities">
        {liabilityTotals.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No liabilities"
            description="Add any debts or loans you have"
          />
        ) : (
          <div className="divide-y divide-border/50">
            {liabilityTotals.map(({ category, total }) => (
              <CategoryRow
                key={category}
                category={category}
                total={total}
                isLiability={true}
              />
            ))}
            <div className="flex justify-between items-center py-3 px-1 pt-4">
              <p className="font-semibold text-sm">Total</p>
              <span className="font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatCurrency(totalLiabilities.toString())}
              </span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
