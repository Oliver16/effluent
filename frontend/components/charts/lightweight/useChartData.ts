'use client';

import { useMemo } from 'react';
import type { ChartDataPoint, ComparisonDataPoint, TimeRangePreset } from './types';
import type { SingleValueData, Time } from 'lightweight-charts';

/**
 * Transform projection data to Lightweight Charts format
 */
export function useProjectionChartData(
  data: Array<{
    monthNumber: number;
    netWorth: string | number;
    totalIncome?: string | number;
    totalExpenses?: string | number;
    netCashFlow?: string | number;
  }>,
  startDate: Date | string
): ChartDataPoint[] {
  return useMemo(() => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;

    return data.map((point) => {
      const date = new Date(start);
      date.setMonth(date.getMonth() + point.monthNumber);

      return {
        time: date.toISOString().split('T')[0], // YYYY-MM-DD
        value: typeof point.netWorth === 'string' ? parseFloat(point.netWorth) : point.netWorth,
      };
    });
  }, [data, startDate]);
}

/**
 * Transform comparison data (baseline + scenario)
 */
export function useComparisonChartData(
  baselineData: Array<{ monthNumber: number; netWorth: string | number }>,
  scenarioData: Array<{ monthNumber: number; netWorth: string | number }>,
  startDate: Date | string
): ComparisonDataPoint[] {
  return useMemo(() => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;

    // Assume both arrays have same length and monthNumber alignment
    return baselineData.map((baseline, i) => {
      const scenario = scenarioData[i];
      const date = new Date(start);
      date.setMonth(date.getMonth() + baseline.monthNumber);

      const baselineValue =
        typeof baseline.netWorth === 'string' ? parseFloat(baseline.netWorth) : baseline.netWorth;
      const scenarioValue = scenario
        ? typeof scenario.netWorth === 'string'
          ? parseFloat(scenario.netWorth)
          : scenario.netWorth
        : baselineValue;

      return {
        time: date.toISOString().split('T')[0],
        baseline: baselineValue,
        scenario: scenarioValue,
      };
    });
  }, [baselineData, scenarioData, startDate]);
}

/**
 * Convert ChartDataPoint[] to Lightweight Charts SingleValueData[]
 */
export function toLightweightData(data: ChartDataPoint[]): SingleValueData[] {
  return data.map((point) => ({
    time: point.time as Time,
    value: point.value,
  }));
}

/**
 * Filter data to time range
 */
export function filterDataToRange(
  data: ChartDataPoint[],
  from: string,
  to: string
): ChartDataPoint[] {
  return data.filter((point) => point.time >= from && point.time <= to);
}

/**
 * Calculate time range from preset
 */
export function getTimeRangeFromPreset(
  preset: TimeRangePreset,
  data: ChartDataPoint[]
): { from: string; to: string } {
  if (data.length === 0) {
    const now = new Date().toISOString().split('T')[0];
    return { from: now, to: now };
  }

  const lastPoint = data[data.length - 1];
  const to = lastPoint.time;
  const toDate = new Date(to);

  if (preset === 'ALL') {
    return { from: data[0].time, to };
  }

  const months: Record<string, number> = {
    '1Y': 12,
    '2Y': 24,
    '5Y': 60,
    '10Y': 120,
  };

  const fromDate = new Date(toDate);
  fromDate.setMonth(fromDate.getMonth() - months[preset]);

  // Clamp to data range
  const dataStart = new Date(data[0].time);
  if (fromDate < dataStart) {
    return { from: data[0].time, to };
  }

  return { from: fromDate.toISOString().split('T')[0], to };
}
