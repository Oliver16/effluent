import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, formatDecimal } from '@/lib/utils';
import { Wallet, Shield, PiggyBank, TrendingUp, Calendar, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ScenarioProjection } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScenarioMetricsComparisonProps {
  scenarioProjection: ScenarioProjection;
  baselineProjection: ScenarioProjection;
  monthNumber: number;
}

interface MetricCard {
  title: string;
  scenarioValue: string;
  baselineValue: string;
  delta: number;
  deltaFormatted: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'good' | 'warning' | 'critical' | 'neutral';
}

export function ScenarioMetricsComparison({
  scenarioProjection,
  baselineProjection,
  monthNumber,
}: ScenarioMetricsComparisonProps) {
  // Calculate Net Worth
  const scenarioNetWorth = parseFloat(scenarioProjection.netWorth);
  const baselineNetWorth = parseFloat(baselineProjection.netWorth);
  const netWorthDelta = scenarioNetWorth - baselineNetWorth;

  // Calculate Monthly Surplus (using net cash flow as proxy)
  const scenarioSurplus = parseFloat(scenarioProjection.netCashFlow);
  const baselineSurplus = parseFloat(baselineProjection.netCashFlow);
  const surplusDelta = scenarioSurplus - baselineSurplus;

  // Calculate DSCR
  const scenarioDscr = parseFloat(scenarioProjection.dscr);
  const baselineDscr = parseFloat(baselineProjection.dscr);
  const dscrDelta = scenarioDscr - baselineDscr;

  // Calculate Liquidity
  const scenarioLiquidity = parseFloat(scenarioProjection.liquidityMonths);
  const baselineLiquidity = parseFloat(baselineProjection.liquidityMonths);
  const liquidityDelta = scenarioLiquidity - baselineLiquidity;

  // Calculate Days Cash on Hand
  const scenarioDaysCash = parseFloat(scenarioProjection.daysCashOnHand);
  const baselineDaysCash = parseFloat(baselineProjection.daysCashOnHand);
  const daysCashDelta = scenarioDaysCash - baselineDaysCash;

  // Calculate Savings Rate
  const scenarioSavingsRate = parseFloat(scenarioProjection.savingsRate);
  const baselineSavingsRate = parseFloat(baselineProjection.savingsRate);
  const savingsRateDelta = scenarioSavingsRate - baselineSavingsRate;

  const getTone = (delta: number, higherIsBetter: boolean): 'good' | 'critical' | 'neutral' => {
    if (Math.abs(delta) < 0.01) return 'neutral';
    if (higherIsBetter) {
      return delta > 0 ? 'good' : 'critical';
    } else {
      return delta < 0 ? 'good' : 'critical';
    }
  };

  const cards: MetricCard[] = [
    {
      title: 'Net Worth',
      scenarioValue: formatCurrency(scenarioNetWorth),
      baselineValue: formatCurrency(baselineNetWorth),
      delta: netWorthDelta,
      deltaFormatted: formatCurrency(netWorthDelta),
      icon: Wallet,
      tone: getTone(netWorthDelta, true),
    },
    {
      title: 'Monthly Surplus',
      scenarioValue: formatCurrency(scenarioSurplus),
      baselineValue: formatCurrency(baselineSurplus),
      delta: surplusDelta,
      deltaFormatted: formatCurrency(surplusDelta),
      icon: TrendingUp,
      tone: getTone(surplusDelta, true),
    },
    {
      title: 'DSCR',
      scenarioValue: formatDecimal(scenarioDscr, 2),
      baselineValue: formatDecimal(baselineDscr, 2),
      delta: dscrDelta,
      deltaFormatted: formatDecimal(dscrDelta, 2),
      icon: Shield,
      tone: getTone(dscrDelta, true),
    },
    {
      title: 'Liquidity',
      scenarioValue: `${formatDecimal(scenarioLiquidity, 1)} mo`,
      baselineValue: `${formatDecimal(baselineLiquidity, 1)} mo`,
      delta: liquidityDelta,
      deltaFormatted: `${formatDecimal(liquidityDelta, 1)} mo`,
      icon: PiggyBank,
      tone: getTone(liquidityDelta, true),
    },
    {
      title: 'Cash on Hand',
      scenarioValue: `${formatDecimal(scenarioDaysCash, 0)} days`,
      baselineValue: `${formatDecimal(baselineDaysCash, 0)} days`,
      delta: daysCashDelta,
      deltaFormatted: `${formatDecimal(daysCashDelta, 0)} days`,
      icon: Calendar,
      tone: getTone(daysCashDelta, true),
    },
  ];

  const getDeltaIcon = (delta: number) => {
    if (Math.abs(delta) < 0.01) return Minus;
    return delta > 0 ? ArrowUp : ArrowDown;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h3 className="text-lg font-semibold">Key Metrics Comparison</h3>
        <span className="text-sm text-muted-foreground">Month {monthNumber}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const DeltaIcon = getDeltaIcon(card.delta);
          const toneColors = {
            good: 'text-green-600 dark:text-green-400',
            critical: 'text-red-600 dark:text-red-400',
            neutral: 'text-gray-600 dark:text-gray-400',
            warning: 'text-yellow-600 dark:text-yellow-400',
          };

          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.scenarioValue}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <span>Baseline: {card.baselineValue}</span>
                </div>
                <div className={cn('flex items-center gap-1 mt-2 text-sm font-medium', toneColors[card.tone])}>
                  <DeltaIcon className="h-3 w-3" />
                  <span>{card.delta >= 0 ? '+' : ''}{card.deltaFormatted}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
