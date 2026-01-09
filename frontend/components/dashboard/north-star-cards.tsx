'use client';

import { MetricCard } from '@/components/ui/MetricCard';
import { StatusAnnunciator } from '@/components/ui/StatusAnnunciator';
import { StatCardSkeleton } from '@/components/ui/Skeletons';
import { MetricSnapshot, GoalStatusResult, GoalType, GoalStatus } from '@/lib/types';
import { goalStatusToStatus, statusToTone, deriveDeltaStatus, deriveDeltaDirection } from '@/lib/status';
import { formatCurrency, formatPercent, formatRatio, formatMonths, formatCurrencySigned } from '@/lib/format';
import type { Status } from '@/components/ui/StatusBadge';
import type { StatusTone } from '@/lib/design-tokens';
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  ShieldCheck,
  Percent,
  CreditCard,
} from 'lucide-react';

interface NorthStarCardsProps {
  metrics: MetricSnapshot | null;
  goalStatus: GoalStatusResult[] | null;
  isLoading?: boolean;
}

interface MetricCardConfig {
  key: string;
  title: string;
  code: string; // For StatusAnnunciator
  goalType: GoalType | null;
  icon: typeof TrendingUp;
  getValue: (m: MetricSnapshot) => string;
  formatValue: (value: string) => string;
  getDefaultStatus: (value: number) => StatusTone;
  getDefaultStatusLabel: (value: number) => string;
  goodDirection: 'up' | 'down';
}

const METRIC_CARDS: MetricCardConfig[] = [
  {
    key: 'netWorth',
    title: 'Net Worth',
    code: 'NW',
    goalType: 'net_worth_target',
    icon: TrendingUp,
    getValue: (m) => m.netWorthMarket,
    formatValue: (v) => formatCurrency(parseFloat(v) || 0),
    getDefaultStatus: (v) => (v >= 0 ? 'good' : 'warning'),
    getDefaultStatusLabel: (v) => (v >= 0 ? 'Positive' : 'Negative'),
    goodDirection: 'up',
  },
  {
    key: 'monthlySurplus',
    title: 'Monthly Surplus',
    code: 'CF',
    goalType: null,
    icon: Wallet,
    getValue: (m) => m.monthlySurplus,
    formatValue: (v) => formatCurrency(parseFloat(v) || 0),
    getDefaultStatus: (v) =>
      v >= 0 ? 'good' : v >= -500 ? 'warning' : 'critical',
    getDefaultStatusLabel: (v) =>
      v >= 0 ? 'Positive' : v >= -500 ? 'Tight' : 'Deficit',
    goodDirection: 'up',
  },
  {
    key: 'liquidityMonths',
    title: 'Liquidity',
    code: 'LQ',
    goalType: 'emergency_fund_months',
    icon: PiggyBank,
    getValue: (m) => m.liquidityMonths,
    formatValue: (v) => formatMonths(parseFloat(v) || 0, true),
    getDefaultStatus: (v) => (v >= 6 ? 'good' : v >= 3 ? 'warning' : 'critical'),
    getDefaultStatusLabel: (v) =>
      v >= 6 ? 'Good' : v >= 3 ? 'Low' : 'Critical',
    goodDirection: 'up',
  },
  {
    key: 'dscr',
    title: 'DSCR',
    code: 'DS',
    goalType: 'min_dscr',
    icon: ShieldCheck,
    getValue: (m) => m.dscr,
    formatValue: (v) => formatRatio(parseFloat(v) || 0),
    getDefaultStatus: (v) =>
      v >= 1.25 ? 'good' : v >= 1.0 ? 'warning' : 'critical',
    getDefaultStatusLabel: (v) =>
      v >= 1.25 ? 'Strong' : v >= 1.0 ? 'Adequate' : 'Weak',
    goodDirection: 'up',
  },
  {
    key: 'savingsRate',
    title: 'Savings Rate',
    code: 'SR',
    goalType: 'min_savings_rate',
    icon: Percent,
    getValue: (m) => m.savingsRate,
    formatValue: (v) => formatPercent(parseFloat(v) || 0),
    getDefaultStatus: (v) =>
      v >= 0.2 ? 'good' : v >= 0.1 ? 'warning' : 'critical',
    getDefaultStatusLabel: (v) =>
      v >= 0.2 ? 'Strong' : v >= 0.1 ? 'Moderate' : 'Low',
    goodDirection: 'up',
  },
  {
    key: 'totalDebt',
    title: 'Total Debt',
    code: 'DT',
    goalType: 'debt_free_date',
    icon: CreditCard,
    getValue: (m) => m.totalLiabilities,
    formatValue: (v) => formatCurrency(Math.abs(parseFloat(v) || 0)),
    getDefaultStatus: (v) => (v <= 0 ? 'good' : 'neutral'),
    getDefaultStatusLabel: (v) => (v <= 0 ? 'Debt-free' : 'Active'),
    goodDirection: 'down',
  },
];

function getGoalData(
  goalStatus: GoalStatusResult[] | null,
  goalType: GoalType | null
) {
  if (!goalStatus || !goalType) return null;
  return goalStatus.find((g) => g.goalType === goalType);
}

function convertGoalStatusToTone(status: GoalStatus): StatusTone {
  const legacyStatus = goalStatusToStatus(status);
  return statusToTone(legacyStatus);
}

function getStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'good':
    case 'achieved':
      return 'On Track';
    case 'warning':
      return 'At Risk';
    case 'critical':
      return 'Critical';
    default:
      return '—';
  }
}

export function NorthStarCards({
  metrics,
  goalStatus,
  isLoading,
}: NorthStarCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {METRIC_CARDS.map((card) => (
          <StatCardSkeleton key={card.key} />
        ))}
      </div>
    );
  }

  // Build data for both the primary cards and the annunciator
  const cardData = METRIC_CARDS.map((card) => {
    const rawValue = metrics ? card.getValue(metrics) : '0';
    const numValue = parseFloat(rawValue) || 0;
    const formattedValue = card.formatValue(rawValue);

    // Get goal data if available
    const goal = getGoalData(goalStatus, card.goalType);

    // Determine status - use goal status if available, else compute default
    const tone: StatusTone = goal
      ? convertGoalStatusToTone(goal.status)
      : card.getDefaultStatus(numValue);

    const statusLabel = goal
      ? getStatusLabel(goal.status)
      : card.getDefaultStatusLabel(numValue);

    // Delta calculation
    const delta = goal?.deltaToTarget
      ? parseFloat(goal.deltaToTarget) || 0
      : null;

    return {
      ...card,
      rawValue,
      numValue,
      formattedValue,
      tone,
      statusLabel,
      delta,
      goal,
    };
  });

  // Build annunciator items
  const annunciatorItems = cardData.map((data) => ({
    code: data.code,
    label: data.title,
    tone: data.tone,
    value: data.formattedValue,
  }));

  // Get the primary metrics for prominent display
  const [netWorth, surplus, ...otherCards] = cardData;

  return (
    <div className="space-y-4">
      {/* Top row: Primary metrics + Status Annunciator */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-2 gap-4 flex-1">
          {/* Net Worth - Primary metric */}
          <MetricCard
            label={netWorth.title}
            value={netWorth.formattedValue}
            tone={netWorth.tone}
            statusLabel={netWorth.statusLabel}
            icon={netWorth.icon}
            delta={
              netWorth.delta
                ? {
                    value: formatCurrencySigned(netWorth.delta),
                    direction: deriveDeltaDirection(netWorth.delta),
                    tone: deriveDeltaStatus(netWorth.delta, netWorth.goodDirection),
                  }
                : undefined
            }
          />

          {/* Monthly Surplus - Secondary primary metric */}
          <MetricCard
            label={surplus.title}
            value={surplus.formattedValue}
            tone={surplus.tone}
            statusLabel={surplus.statusLabel}
            icon={surplus.icon}
            delta={
              surplus.delta
                ? {
                    value: formatCurrencySigned(surplus.delta),
                    direction: deriveDeltaDirection(surplus.delta),
                    tone: deriveDeltaStatus(surplus.delta, surplus.goodDirection),
                  }
                : undefined
            }
          />
        </div>

        {/* Status Annunciator - Compact status overview */}
        <div className="shrink-0">
          <StatusAnnunciator items={annunciatorItems} direction="row" />
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {otherCards.map((data) => (
          <MetricCard
            key={data.key}
            label={data.title}
            value={data.formattedValue}
            tone={data.tone}
            statusLabel={data.statusLabel}
            icon={data.icon}
          />
        ))}
      </div>
    </div>
  );
}
