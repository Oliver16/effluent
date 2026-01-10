'use client';

/**
 * @deprecated This Recharts-based GoalLine is deprecated.
 * Use the Lightweight Charts compatible version instead:
 *
 * ```tsx
 * import { createGoalLine } from '@/components/charts/lightweight/GoalLine';
 *
 * const goalLines = [
 *   createGoalLine('goal-id', 'Goal Label', 100000, 'good'),
 * ];
 *
 * <LightweightChart priceLines={goalLines} ... />
 * ```
 */

import { ReferenceLine, Label } from 'recharts';
import { formatCurrencyCompact } from '@/lib/format';
import { StatusTone } from '@/lib/design-tokens';

/**
 * @deprecated Use createGoalLine from '@/components/charts/lightweight/GoalLine' instead.
 */
interface GoalLineProps {
  /** Y-axis value for the line */
  value: number;
  /** Label to display */
  label: string;
  /** Line color based on status */
  tone?: StatusTone;
  /** Show value in label */
  showValue?: boolean;
}

/**
 * @deprecated Use createGoalLine from '@/components/charts/lightweight/GoalLine' instead.
 */
export function GoalLine({
  value,
  label,
  tone = 'neutral',
  showValue = true,
}: GoalLineProps) {
  // Map tone to actual color
  const colorMap: Record<StatusTone, string> = {
    good: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    critical: '#ef4444', // red-500
    neutral: '#6b7280', // gray-500
    info: '#3b82f6', // blue-500
  };

  const color = colorMap[tone];
  const displayLabel = showValue ? `${label}: ${formatCurrencyCompact(value)}` : label;

  return (
    <ReferenceLine
      y={value}
      stroke={color}
      strokeDasharray="6 4"
      strokeWidth={1.5}
    >
      <Label
        value={displayLabel}
        position="insideTopRight"
        fill={color}
        fontSize={11}
        fontWeight={500}
      />
    </ReferenceLine>
  );
}
