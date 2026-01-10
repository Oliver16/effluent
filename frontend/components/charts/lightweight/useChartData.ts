'use client';

import { useMemo } from 'react';
import type { ChartDataPoint, ComparisonDataPoint, TimeRangePreset } from './types';
import type { SingleValueData, Time } from 'lightweight-charts';

/**
 * Transform projection data to Lightweight Charts format.
 * Prefers projectionDate from backend when available, falls back to startDate + monthNumber.
 */
export function useProjectionChartData(
  data: Array<{
    monthNumber: number;
    netWorth: string | number;
    projectionDate?: string; // Prefer this when available (from backend)
    totalIncome?: string | number;
    totalExpenses?: string | number;
    netCashFlow?: string | number;
  }>,
  startDate?: Date | string // Optional fallback when projectionDate not available
): ChartDataPoint[] {
  return useMemo(() => {
    // Use fallback startDate only if projectionDate is not available
    const fallbackStart = startDate
      ? typeof startDate === 'string' ? new Date(startDate) : startDate
      : new Date();

    return data.map((point) => {
      // Prefer backend's projectionDate when available
      let time: string;
      if (point.projectionDate) {
        time = point.projectionDate;
      } else {
        const date = new Date(fallbackStart);
        date.setMonth(date.getMonth() + point.monthNumber);
        time = date.toISOString().split('T')[0];
      }

      return {
        time,
        value: typeof point.netWorth === 'string' ? parseFloat(point.netWorth) : point.netWorth,
      };
    });
  }, [data, startDate]);
}

/**
 * Transform comparison data (baseline + scenario).
 * Merges by monthNumber (not index) to handle different array lengths.
 * Prefers projectionDate from backend when available.
 */
export function useComparisonChartData(
  baselineData: Array<{ monthNumber: number; netWorth: string | number; projectionDate?: string }>,
  scenarioData: Array<{ monthNumber: number; netWorth: string | number; projectionDate?: string }>,
  startDate?: Date | string // Optional fallback when projectionDate not available
): ComparisonDataPoint[] {
  return useMemo(() => {
    // Use fallback startDate only if projectionDate is not available
    const fallbackStart = startDate
      ? typeof startDate === 'string' ? new Date(startDate) : startDate
      : new Date();

    // Create a map of scenario data by monthNumber for proper alignment
    const scenarioMap = new Map<number, { netWorth: string | number; projectionDate?: string }>();
    scenarioData.forEach((point) => {
      scenarioMap.set(point.monthNumber, { netWorth: point.netWorth, projectionDate: point.projectionDate });
    });

    // Merge by monthNumber (not index) to handle different array lengths
    return baselineData.map((baseline) => {
      const scenario = scenarioMap.get(baseline.monthNumber);

      // Prefer backend's projectionDate when available
      let time: string;
      if (baseline.projectionDate) {
        time = baseline.projectionDate;
      } else if (scenario?.projectionDate) {
        time = scenario.projectionDate;
      } else {
        const date = new Date(fallbackStart);
        date.setMonth(date.getMonth() + baseline.monthNumber);
        time = date.toISOString().split('T')[0];
      }

      const baselineValue =
        typeof baseline.netWorth === 'string' ? parseFloat(baseline.netWorth) : baseline.netWorth;
      const scenarioValue = scenario
        ? typeof scenario.netWorth === 'string'
          ? parseFloat(scenario.netWorth)
          : scenario.netWorth
        : baselineValue;

      return {
        time,
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
