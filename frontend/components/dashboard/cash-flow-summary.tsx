import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { MetricSnapshot } from '@/lib/types';

interface CashFlowSummaryProps {
  metrics?: MetricSnapshot;
}

export function CashFlowSummary({ metrics }: CashFlowSummaryProps) {
  if (!metrics) return null;

  // Calculate income and expenses from surplus and savings rate
  // surplus = income - expenses
  // savings_rate = surplus / income
  // So: income = surplus / savings_rate
  // And: expenses = income - surplus
  const savingsRate = parseFloat(metrics.savingsRate);
  const surplus = parseFloat(metrics.monthlySurplus);

  let income = 0;
  let expenses = 0;

  if (savingsRate > 0 && savingsRate < 1) {
    income = surplus / savingsRate;
    expenses = income - surplus;
  } else if (savingsRate === 0) {
    // If savings rate is 0, surplus should be 0
    income = 0;
    expenses = 0;
  } else {
    // Fallback calculation
    income = surplus;
    expenses = 0;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-green-500" />
            <span>Income</span>
          </div>
          <span className="font-semibold text-green-600">{formatCurrency(income)}</span>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-red-500" />
            <span>Expenses</span>
          </div>
          <span className="font-semibold text-red-600">{formatCurrency(expenses)}</span>
        </div>
        <hr />
        <div className="flex justify-between">
          <span className="font-medium">Surplus</span>
          <span className={`font-bold text-lg ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(surplus)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Savings Rate: {formatPercent(metrics.savingsRate)} | DTI: {formatPercent(metrics.dtiRatio)}
        </div>
      </CardContent>
    </Card>
  );
}
