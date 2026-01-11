import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, formatDecimal } from '@/lib/utils';
import { Wallet, Shield, PiggyBank, TrendingUp, Calendar } from 'lucide-react';
import { MetricSnapshot } from '@/lib/types';

interface MetricCardsProps {
  metrics?: MetricSnapshot;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  if (!metrics) return null;

  const cards = [
    {
      title: 'Net Worth',
      value: formatCurrency(metrics.netWorthMarket),
      subtitle: `Cost basis: ${formatCurrency(metrics.netWorthCost)}`,
      icon: Wallet,
    },
    {
      title: 'Monthly Surplus',
      value: formatCurrency(metrics.monthlySurplus),
      subtitle: `${formatPercent(metrics.savingsRate)} savings rate`,
      icon: TrendingUp,
    },
    {
      title: 'DSCR',
      value: formatDecimal(metrics.dscr, 2),
      subtitle: getDSCRLabel(parseFloat(metrics.dscr)),
      icon: Shield,
    },
    {
      title: 'Liquidity',
      value: `${formatDecimal(metrics.liquidityMonths, 1)} mo`,
      subtitle: 'Emergency fund',
      icon: PiggyBank,
    },
    {
      title: 'Cash on Hand',
      value: `${formatDecimal(metrics.daysCashOnHand, 0)} days`,
      subtitle: getDaysCashLabel(parseFloat(metrics.daysCashOnHand)),
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getDSCRLabel(dscr: number): string {
  if (dscr >= 2) return 'Excellent';
  if (dscr >= 1.5) return 'Good';
  if (dscr >= 1) return 'Adequate';
  return 'Critical';
}

function getDaysCashLabel(days: number): string {
  if (days >= 180) return 'Strong';
  if (days >= 90) return 'Adequate';
  return 'Low';
}
