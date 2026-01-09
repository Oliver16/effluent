'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { ChartTheme } from './types';
import type { DeepPartial, ChartOptions } from 'lightweight-charts';
import { ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { formatCurrencyCompact } from '@/lib/format';

/**
 * Returns chart theme based on current app theme
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return useMemo(
    () => ({
      backgroundColor: 'transparent',
      textColor: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)', // gray-400 / gray-500
      gridColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)', // gray-600/30 / gray-300/50
      borderColor: isDark ? 'rgb(55, 65, 81)' : 'rgb(229, 231, 235)', // gray-700 / gray-200
      crosshairColor: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
      upColor: 'rgb(16, 185, 129)', // emerald-500
      downColor: 'rgb(239, 68, 68)', // red-500
      primaryColor: isDark ? 'rgb(139, 92, 246)' : 'rgb(124, 58, 237)', // violet-500 / violet-600
      secondaryColor: isDark ? 'rgba(156, 163, 175, 0.5)' : 'rgba(107, 114, 128, 0.5)',
    }),
    [isDark]
  );
}

/**
 * Returns full chart options configured for theme
 */
export function useChartOptions(
  theme: ChartTheme,
  options?: {
    height?: number;
    showTimeScale?: boolean;
    showPriceScale?: boolean;
    priceScalePosition?: 'left' | 'right';
    enableCrosshair?: boolean;
  }
): DeepPartial<ChartOptions> {
  const {
    height = 300,
    showTimeScale = true,
    showPriceScale = true,
    priceScalePosition = 'right',
    enableCrosshair = true,
  } = options ?? {};

  return useMemo(
    () => ({
      height,
      layout: {
        background: { type: ColorType.Solid, color: theme.backgroundColor },
        textColor: theme.textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      localization: {
        priceFormatter: (price: number) => formatCurrencyCompact(price),
      },
      grid: {
        vertLines: { color: theme.gridColor, style: LineStyle.Solid },
        horzLines: { color: theme.gridColor, style: LineStyle.Solid },
      },
      crosshair: enableCrosshair
        ? {
            mode: CrosshairMode.Normal,
            vertLine: {
              color: theme.crosshairColor,
              width: 1,
              style: LineStyle.Dashed,
              labelBackgroundColor: theme.primaryColor,
            },
            horzLine: {
              color: theme.crosshairColor,
              width: 1,
              style: LineStyle.Dashed,
              labelBackgroundColor: theme.primaryColor,
            },
          }
        : {
            mode: CrosshairMode.Normal,
            vertLine: { visible: false },
            horzLine: { visible: false },
          },
      timeScale: {
        visible: showTimeScale,
        borderColor: theme.borderColor,
        timeVisible: false,
        secondsVisible: false,
      },
      rightPriceScale: {
        visible: showPriceScale && priceScalePosition === 'right',
        borderColor: theme.borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      leftPriceScale: {
        visible: showPriceScale && priceScalePosition === 'left',
        borderColor: theme.borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    }),
    [theme, height, showTimeScale, showPriceScale, priceScalePosition, enableCrosshair]
  );
}
