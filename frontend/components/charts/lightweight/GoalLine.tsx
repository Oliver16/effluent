'use client';

import { LW_CHART_COLORS, type StatusTone } from '@/lib/design-tokens';
import type { PriceLineConfig } from './types';

/**
 * Color mapping from status tone to LW Charts compatible RGB color
 */
const STATUS_COLOR_MAP: Record<StatusTone, string> = {
  good: LW_CHART_COLORS.good,
  warning: LW_CHART_COLORS.warning,
  critical: LW_CHART_COLORS.critical,
  neutral: LW_CHART_COLORS.neutral,
  info: 'rgb(59, 130, 246)', // blue-500
};

/**
 * Create a goal line configuration for Lightweight Charts.
 *
 * This replaces the Recharts-based GoalLine component with a configuration
 * object that can be passed to LightweightChart's priceLines prop.
 *
 * @example
 * ```tsx
 * const goalLines = [
 *   createGoalLine('retirement-goal', 'Retirement Target', 2000000, 'good'),
 *   createGoalLine('emergency-fund', 'Emergency Fund', 50000, 'warning'),
 * ];
 *
 * <LightweightChart priceLines={goalLines} ... />
 * ```
 */
export function createGoalLine(
  id: string,
  label: string,
  value: number,
  tone: StatusTone = 'good',
  options?: {
    showValue?: boolean;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    lineWidth?: number;
    axisLabelVisible?: boolean;
  }
): PriceLineConfig {
  const {
    lineStyle = 'dashed',
    lineWidth = 1.5,
    axisLabelVisible = true,
  } = options ?? {};

  return {
    id,
    label,
    value,
    color: STATUS_COLOR_MAP[tone],
    lineStyle,
    lineWidth,
    axisLabelVisible,
  };
}

/**
 * Create multiple goal lines from an array of goal definitions.
 *
 * @example
 * ```tsx
 * const goals = [
 *   { id: 'goal-1', label: 'Net Worth Goal', value: 1000000, tone: 'good' },
 *   { id: 'goal-2', label: 'Debt Target', value: 0, tone: 'warning' },
 * ];
 *
 * const goalLines = createGoalLines(goals);
 * <LightweightChart priceLines={goalLines} ... />
 * ```
 */
export function createGoalLines(
  goals: Array<{
    id: string;
    label: string;
    value: number;
    tone?: StatusTone;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    lineWidth?: number;
    axisLabelVisible?: boolean;
  }>
): PriceLineConfig[] {
  return goals.map((goal) =>
    createGoalLine(goal.id, goal.label, goal.value, goal.tone ?? 'good', {
      lineStyle: goal.lineStyle,
      lineWidth: goal.lineWidth,
      axisLabelVisible: goal.axisLabelVisible,
    })
  );
}

/**
 * Props for the GoalLineConfig component (declarative wrapper)
 */
export interface GoalLineProps {
  /** Unique identifier */
  id: string;
  /** Y-axis value for the line */
  value: number;
  /** Label to display */
  label: string;
  /** Line color based on status */
  tone?: StatusTone;
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Line width */
  lineWidth?: number;
  /** Show label on axis */
  axisLabelVisible?: boolean;
}

/**
 * Convert GoalLineProps to PriceLineConfig.
 * Use this when you have individual goal props and need a price line config.
 */
export function goalLinePropsToPriceLineConfig(props: GoalLineProps): PriceLineConfig {
  return createGoalLine(props.id, props.label, props.value, props.tone ?? 'good', {
    lineStyle: props.lineStyle,
    lineWidth: props.lineWidth,
    axisLabelVisible: props.axisLabelVisible,
  });
}
