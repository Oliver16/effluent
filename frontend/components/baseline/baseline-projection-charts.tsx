'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScenarioProjection } from '@/lib/types';
import { formatCurrency, formatDecimal } from '@/lib/utils';

interface BaselineProjectionChartsProps {
  projections: ScenarioProjection[];
  months?: number; // Number of months to show (default 12)
}

export function BaselineProjectionCharts({
  projections,
  months = 12,
}: BaselineProjectionChartsProps) {
  const chartData = useMemo(() => {
    // Take first N months of projections
    return projections.slice(0, months);
  }, [projections, months]);

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No projection data available. Refresh the baseline to generate projections.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate min/max for scaling
  const netWorthValues = chartData.map((p) => parseFloat(p.netWorth));
  const cashFlowValues = chartData.map((p) => parseFloat(p.netCashFlow));
  const liquidityValues = chartData.map((p) => parseFloat(p.liquidityMonths));

  const netWorthMin = Math.min(...netWorthValues);
  const netWorthMax = Math.max(...netWorthValues);
  const cashFlowMin = Math.min(...cashFlowValues);
  const cashFlowMax = Math.max(...cashFlowValues);
  const liquidityMin = Math.min(...liquidityValues);
  const liquidityMax = Math.max(...liquidityValues);

  // Simple bar chart rendering function
  const renderBar = (
    value: number,
    min: number,
    max: number,
    color: string,
    isNegativePossible = false
  ) => {
    const range = max - min || 1;
    let height: number;
    let offset = 0;

    if (isNegativePossible && min < 0 && max > 0) {
      // Handle positive/negative values
      const totalRange = max - min;
      const zeroPoint = (-min / totalRange) * 100;

      if (value >= 0) {
        height = (value / max) * (100 - zeroPoint);
        offset = zeroPoint;
      } else {
        height = (-value / -min) * zeroPoint;
        offset = zeroPoint - height;
      }
    } else {
      height = ((value - min) / range) * 100;
    }

    return (
      <div className="flex flex-col items-center justify-end h-16 w-full">
        <div
          className={`w-full rounded-t ${color}`}
          style={{
            height: `${Math.max(height, 2)}%`,
            minHeight: '2px',
            marginTop: `${offset}%`,
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Baseline Projection (Next {months} months)
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Net Worth Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-20 items-end">
              {chartData.map((p, i) => (
                <div key={i} className="flex-1 min-w-0">
                  {renderBar(
                    parseFloat(p.netWorth),
                    netWorthMin,
                    netWorthMax,
                    'bg-blue-500'
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatCurrency(String(netWorthMin))}</span>
              <span>{formatCurrency(String(netWorthMax))}</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-sm font-medium">
                End: {formatCurrency(chartData[chartData.length - 1]?.netWorth || '0')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-20 items-end">
              {chartData.map((p, i) => {
                const value = parseFloat(p.netCashFlow);
                return (
                  <div key={i} className="flex-1 min-w-0">
                    {renderBar(
                      value,
                      cashFlowMin,
                      cashFlowMax,
                      value >= 0 ? 'bg-green-500' : 'bg-red-500',
                      true
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatCurrency(String(cashFlowMin))}</span>
              <span>{formatCurrency(String(cashFlowMax))}</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-sm font-medium">
                Avg: {formatCurrency(String(cashFlowValues.reduce((a, b) => a + b, 0) / cashFlowValues.length))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Liquidity Months Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Liquidity Months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-20 items-end">
              {chartData.map((p, i) => (
                <div key={i} className="flex-1 min-w-0">
                  {renderBar(
                    parseFloat(p.liquidityMonths),
                    liquidityMin,
                    liquidityMax,
                    parseFloat(p.liquidityMonths) >= 3
                      ? 'bg-green-500'
                      : parseFloat(p.liquidityMonths) >= 1
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatDecimal(String(liquidityMin), 1)} mo</span>
              <span>{formatDecimal(String(liquidityMax), 1)} mo</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-sm font-medium">
                End: {formatDecimal(chartData[chartData.length - 1]?.liquidityMonths || '0', 1)} mo
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
