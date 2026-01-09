'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { ChartTheme } from './types';
import type { DeepPartial, ChartOptions } from 'lightweight-charts';
import { ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { LW_CHART_COLORS, StatusTone } from '@/lib/design-tokens';
import { formatCurrencyCompact } from '@/lib/format';

// =============================================================================
// CHART THEME HOOK — Uses Design Tokens for Consistency
// =============================================================================
//
// All chart colors are derived from lib/design-tokens.ts to ensure visual
// consistency across the application. This prevents "charts feel like a
// different product" syndrome.
//
// =============================================================================

/**
 * Status colors for chart elements (RGB format for canvas)
 */
export const CHART_STATUS_COLORS: Record<StatusTone, string> = {
  good: LW_CHART_COLORS.good,
  warning: LW_CHART_COLORS.warning,
  critical: LW_CHART_COLORS.critical,
  neutral: LW_CHART_COLORS.neutral,
  info: 'rgb(59, 130, 246)', // blue-500
};

/**
 * Returns chart theme based on current app theme
 * All colors are sourced from design-tokens.ts for consistency
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return useMemo(
    () => ({
      backgroundColor: 'transparent',
      // Text/grid colors from design tokens
      textColor: isDark ? LW_CHART_COLORS.text.dark : LW_CHART_COLORS.text.light,
      gridColor: isDark ? LW_CHART_COLORS.grid.dark : LW_CHART_COLORS.grid.light,
      borderColor: isDark ? LW_CHART_COLORS.border.dark : LW_CHART_COLORS.border.light,
      crosshairColor: isDark ? LW_CHART_COLORS.crosshair.dark : LW_CHART_COLORS.crosshair.light,
      // Status colors from design tokens
      upColor: LW_CHART_COLORS.positive,
      downColor: LW_CHART_COLORS.negative,
      // Series colors from design tokens
      primaryColor: LW_CHART_COLORS.primary.line,
      secondaryColor: isDark
        ? LW_CHART_COLORS.secondary.fillTop
        : `${LW_CHART_COLORS.secondary.line.replace('rgb', 'rgba').replace(')', ', 0.5)')}`,
    }),
    [isDark]
  );
}

/**
 * Extended chart theme with all series colors
 */
export interface ExtendedChartTheme extends ChartTheme {
  series: {
    primary: typeof LW_CHART_COLORS.primary;
    secondary: typeof LW_CHART_COLORS.secondary;
    tertiary: typeof LW_CHART_COLORS.tertiary;
  };
  status: typeof CHART_STATUS_COLORS;
}

/**
 * Returns extended chart theme with series and status colors
 */
export function useExtendedChartTheme(): ExtendedChartTheme {
  const baseTheme = useChartTheme();

  return useMemo(
    () => ({
      ...baseTheme,
      series: {
        primary: LW_CHART_COLORS.primary,
        secondary: LW_CHART_COLORS.secondary,
        tertiary: LW_CHART_COLORS.tertiary,
      },
      status: CHART_STATUS_COLORS,
    }),
    [baseTheme]
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
