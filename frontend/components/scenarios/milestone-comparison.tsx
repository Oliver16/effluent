'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScenarioProjection } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, DollarSign, Briefcase, Car, Heart, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneComparisonProps {
  scenarioProjections: ScenarioProjection[];
  baselineProjections: ScenarioProjection[];
  scenarioName: string;
  baselineName: string;
}

interface MilestoneData {
  year: number;
  month: number;
  label: string;
  scenario: ScenarioProjection | null;
  baseline: ScenarioProjection | null;
}

interface MetricComparison {
  label: string;
  icon: React.ReactNode;
  scenarioValue: number;
  baselineValue: number;
  difference: number;
  percentChange: number;
  isPositiveGood: boolean;
  category: 'income' | 'expense' | 'asset' | 'metric';
}

const MILESTONES = [
  { year: 1, month: 12, label: '1 Year' },
  { year: 5, month: 60, label: '5 Years' },
  { year: 10, month: 120, label: '10 Years' },
];

function getProjectionAtMonth(projections: ScenarioProjection[], targetMonth: number): ScenarioProjection | null {
  // Find exact match or closest month that doesn't exceed target
  let best: ScenarioProjection | null = null;
  for (const p of projections) {
    if (p.monthNumber === targetMonth - 1) { // monthNumber is 0-indexed
      return p;
    }
    if (p.monthNumber < targetMonth && (!best || p.monthNumber > best.monthNumber)) {
      best = p;
    }
  }
  return best;
}

function DifferenceIndicator({ value, isPositiveGood }: { value: number; isPositiveGood: boolean }) {
  if (Math.abs(value) < 0.01) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  const isPositive = value > 0;
  const isGood = isPositiveGood ? isPositive : !isPositive;

  return isPositive ? (
    <ArrowUp className={cn('h-4 w-4', isGood ? 'text-green-600' : 'text-red-600')} />
  ) : (
    <ArrowDown className={cn('h-4 w-4', isGood ? 'text-green-600' : 'text-red-600')} />
  );
}

function MetricRow({ metric }: { metric: MetricComparison }) {
  const isGood = metric.isPositiveGood ? metric.difference > 0 : metric.difference < 0;
  const isNeutral = Math.abs(metric.difference) < 0.01;

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-md">
          {metric.icon}
        </div>
        <span className="font-medium">{metric.label}</span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right w-28">
          <div className="text-muted-foreground text-xs">Baseline</div>
          <div>{formatCurrency(metric.baselineValue)}</div>
        </div>
        <div className="text-right w-28">
          <div className="text-muted-foreground text-xs">Scenario</div>
          <div className="font-medium">{formatCurrency(metric.scenarioValue)}</div>
        </div>
        <div className={cn(
          'flex items-center gap-1 w-32 justify-end font-medium',
          isNeutral ? 'text-muted-foreground' : isGood ? 'text-green-600' : 'text-red-600'
        )}>
          <DifferenceIndicator value={metric.difference} isPositiveGood={metric.isPositiveGood} />
          <span>{formatCurrency(Math.abs(metric.difference))}</span>
          {!isNeutral && (
            <span className="text-xs">
              ({metric.percentChange > 0 ? '+' : ''}{metric.percentChange.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function extractMetricFromBreakdown(breakdown: Record<string, string>, keys: string[]): number {
  let total = 0;
  for (const key of keys) {
    const value = breakdown[key];
    if (value) {
      total += parseFloat(value);
    }
  }
  return total;
}

export function MilestoneComparison({
  scenarioProjections,
  baselineProjections,
  scenarioName,
  baselineName,
}: MilestoneComparisonProps) {
  const milestoneData: MilestoneData[] = useMemo(() => {
    return MILESTONES.map(({ year, month, label }) => ({
      year,
      month,
      label,
      scenario: getProjectionAtMonth(scenarioProjections, month),
      baseline: getProjectionAtMonth(baselineProjections, month),
    }));
  }, [scenarioProjections, baselineProjections]);

  const getMetrics = (scenario: ScenarioProjection | null, baseline: ScenarioProjection | null): MetricComparison[] => {
    if (!scenario || !baseline) return [];

    const scenarioIncome = scenario.incomeBreakdown || {};
    const baselineIncome = baseline.incomeBreakdown || {};
    const scenarioExpense = scenario.expenseBreakdown || {};
    const baselineExpense = baseline.expenseBreakdown || {};

    // Helper to calculate percent change safely
    const pctChange = (newVal: number, oldVal: number) => {
      if (oldVal === 0) return newVal === 0 ? 0 : 100;
      return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
    };

    // Extract specific metrics relevant to job changes
    const scenarioSalary = extractMetricFromBreakdown(scenarioIncome, ['salary', 'SALARY', 'Salary']);
    const baselineSalary = extractMetricFromBreakdown(baselineIncome, ['salary', 'SALARY', 'Salary']);

    const scenario401k = extractMetricFromBreakdown(scenarioExpense, ['401k', 'retirement_contribution', 'RETIREMENT', '401K']);
    const baseline401k = extractMetricFromBreakdown(baselineExpense, ['401k', 'retirement_contribution', 'RETIREMENT', '401K']);

    const scenarioCommute = extractMetricFromBreakdown(scenarioExpense, ['transportation', 'TRANSPORTATION', 'commute', 'COMMUTE', 'gas', 'GAS']);
    const baselineCommute = extractMetricFromBreakdown(baselineExpense, ['transportation', 'TRANSPORTATION', 'commute', 'COMMUTE', 'gas', 'GAS']);

    const scenarioHealthcare = extractMetricFromBreakdown(scenarioExpense, ['healthcare', 'HEALTHCARE', 'health', 'HEALTH', 'insurance_health']);
    const baselineHealthcare = extractMetricFromBreakdown(baselineExpense, ['healthcare', 'HEALTHCARE', 'health', 'HEALTH', 'insurance_health']);

    const metrics: MetricComparison[] = [
      {
        label: 'Net Worth',
        icon: <TrendingUp className="h-4 w-4" />,
        scenarioValue: parseFloat(scenario.netWorth),
        baselineValue: parseFloat(baseline.netWorth),
        difference: parseFloat(scenario.netWorth) - parseFloat(baseline.netWorth),
        percentChange: pctChange(parseFloat(scenario.netWorth), parseFloat(baseline.netWorth)),
        isPositiveGood: true,
        category: 'asset',
      },
      {
        label: 'Monthly Income',
        icon: <DollarSign className="h-4 w-4" />,
        scenarioValue: parseFloat(scenario.totalIncome),
        baselineValue: parseFloat(baseline.totalIncome),
        difference: parseFloat(scenario.totalIncome) - parseFloat(baseline.totalIncome),
        percentChange: pctChange(parseFloat(scenario.totalIncome), parseFloat(baseline.totalIncome)),
        isPositiveGood: true,
        category: 'income',
      },
      {
        label: 'Monthly Expenses',
        icon: <TrendingDown className="h-4 w-4" />,
        scenarioValue: parseFloat(scenario.totalExpenses),
        baselineValue: parseFloat(baseline.totalExpenses),
        difference: parseFloat(scenario.totalExpenses) - parseFloat(baseline.totalExpenses),
        percentChange: pctChange(parseFloat(scenario.totalExpenses), parseFloat(baseline.totalExpenses)),
        isPositiveGood: false,
        category: 'expense',
      },
      {
        label: 'Net Cash Flow',
        icon: <PiggyBank className="h-4 w-4" />,
        scenarioValue: parseFloat(scenario.netCashFlow),
        baselineValue: parseFloat(baseline.netCashFlow),
        difference: parseFloat(scenario.netCashFlow) - parseFloat(baseline.netCashFlow),
        percentChange: pctChange(parseFloat(scenario.netCashFlow), parseFloat(baseline.netCashFlow)),
        isPositiveGood: true,
        category: 'metric',
      },
      {
        label: 'Retirement Assets',
        icon: <Briefcase className="h-4 w-4" />,
        scenarioValue: parseFloat(scenario.retirementAssets),
        baselineValue: parseFloat(baseline.retirementAssets),
        difference: parseFloat(scenario.retirementAssets) - parseFloat(baseline.retirementAssets),
        percentChange: pctChange(parseFloat(scenario.retirementAssets), parseFloat(baseline.retirementAssets)),
        isPositiveGood: true,
        category: 'asset',
      },
      {
        label: 'Liquid Assets',
        icon: <DollarSign className="h-4 w-4" />,
        scenarioValue: parseFloat(scenario.liquidAssets),
        baselineValue: parseFloat(baseline.liquidAssets),
        difference: parseFloat(scenario.liquidAssets) - parseFloat(baseline.liquidAssets),
        percentChange: pctChange(parseFloat(scenario.liquidAssets), parseFloat(baseline.liquidAssets)),
        isPositiveGood: true,
        category: 'asset',
      },
    ];

    // Add breakdown metrics only if they exist in the data
    if (scenarioSalary > 0 || baselineSalary > 0) {
      metrics.push({
        label: 'Monthly Salary',
        icon: <Briefcase className="h-4 w-4" />,
        scenarioValue: scenarioSalary,
        baselineValue: baselineSalary,
        difference: scenarioSalary - baselineSalary,
        percentChange: pctChange(scenarioSalary, baselineSalary),
        isPositiveGood: true,
        category: 'income',
      });
    }

    if (scenario401k > 0 || baseline401k > 0) {
      metrics.push({
        label: '401(k) Contribution',
        icon: <PiggyBank className="h-4 w-4" />,
        scenarioValue: scenario401k,
        baselineValue: baseline401k,
        difference: scenario401k - baseline401k,
        percentChange: pctChange(scenario401k, baseline401k),
        isPositiveGood: true, // Higher contributions are good
        category: 'expense',
      });
    }

    if (scenarioCommute > 0 || baselineCommute > 0) {
      metrics.push({
        label: 'Transportation/Commute',
        icon: <Car className="h-4 w-4" />,
        scenarioValue: scenarioCommute,
        baselineValue: baselineCommute,
        difference: scenarioCommute - baselineCommute,
        percentChange: pctChange(scenarioCommute, baselineCommute),
        isPositiveGood: false,
        category: 'expense',
      });
    }

    if (scenarioHealthcare > 0 || baselineHealthcare > 0) {
      metrics.push({
        label: 'Healthcare Costs',
        icon: <Heart className="h-4 w-4" />,
        scenarioValue: scenarioHealthcare,
        baselineValue: baselineHealthcare,
        difference: scenarioHealthcare - baselineHealthcare,
        percentChange: pctChange(scenarioHealthcare, baselineHealthcare),
        isPositiveGood: false,
        category: 'expense',
      });
    }

    return metrics;
  };

  const availableMilestones = milestoneData.filter(m => m.scenario && m.baseline);

  if (availableMilestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Milestone Comparison</CardTitle>
          <CardDescription>
            Run projections for both scenarios to see milestone comparisons.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Milestone Comparison</h2>
          <p className="text-sm text-muted-foreground">
            Comparing <span className="font-medium">{scenarioName}</span> vs{' '}
            <span className="font-medium">{baselineName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {scenarioName}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            {baselineName}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        {availableMilestones.map((milestone) => {
          const metrics = getMetrics(milestone.scenario, milestone.baseline);
          const netWorthDiff = milestone.scenario && milestone.baseline
            ? parseFloat(milestone.scenario.netWorth) - parseFloat(milestone.baseline.netWorth)
            : 0;

          return (
            <Card key={milestone.year}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{milestone.label}</CardTitle>
                    <CardDescription>
                      Month {milestone.month} projection comparison
                    </CardDescription>
                  </div>
                  <div className={cn(
                    'text-right',
                    netWorthDiff >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    <div className="text-xs text-muted-foreground">Net Worth Difference</div>
                    <div className="text-xl font-bold">
                      {netWorthDiff >= 0 ? '+' : ''}{formatCurrency(netWorthDiff)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {metrics.map((metric, idx) => (
                    <MetricRow key={idx} metric={metric} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
