# TASK-19 — Financial Chart System Overhaul (Lightweight Charts Migration)

> **Version 1.0 — January 2026**
>
> This task migrates the application's financial projection charts from Recharts to TradingView's Lightweight Charts library. The goal is to achieve financial-grade visualization quality, fix formatting bugs, improve performance, and enable professional chart interactions.
>
> **This document is written for AI agent implementation.** All specifications include exact file paths, complete code examples, and explicit acceptance criteria.

---

## Table of Contents

1. [Motivation & Goals](#1-motivation--goals)
2. [Library Overview](#2-library-overview)
3. [Installation & Setup](#3-installation--setup)
4. [Architecture](#4-architecture)
5. [Core Chart Components](#5-core-chart-components)
6. [Styling & Theming](#6-styling--theming)
7. [Interactions](#7-interactions)
8. [Data Formatting](#8-data-formatting)
9. [Chart Types & Implementations](#9-chart-types--implementations)
10. [Migration Strategy](#10-migration-strategy)
11. [Accessibility](#11-accessibility)
12. [Performance](#12-performance)
13. [Testing](#13-testing)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. Motivation & Goals

### 1.1 Current Problems with Recharts

Based on screenshots and observed behavior:

| Problem | Impact | Root Cause |
|---------|--------|------------|
| Y-axis shows "000.00" | Critical credibility issue | Tick formatter receives strings, not numbers; awkward API |
| No crosshair interaction | Users can't inspect specific points | Limited interaction model |
| Poor performance at 60+ months | Laggy rendering, slow updates | SVG-based rendering doesn't scale |
| Legend inside chart area | Wastes data space | Layout inflexibility |
| No zoom/pan | Can't focus on time ranges | Not supported without plugins |
| Thick/blurry lines | Doesn't look "financial grade" | SVG anti-aliasing issues |
| No price/goal lines | Can't show thresholds | Manual implementation required |

### 1.2 Why Lightweight Charts

Lightweight Charts is TradingView's open-source charting library, purpose-built for financial data:

- **Canvas-based rendering** — 60fps performance even with thousands of data points
- **Financial-first design** — Built for stocks, forex, crypto; perfect for financial projections
- **Professional interactions** — Crosshair, tooltips, zoom, pan out of the box
- **Price lines** — Native support for threshold/goal visualization
- **Small bundle** — ~45KB gzipped (Recharts is ~120KB+)
- **Time-series optimized** — Handles gaps, irregular data, timezone-aware

### 1.3 Goals for This Task

1. **Fix all chart formatting issues** — Y-axis shows proper currency ($400K, $600K)
2. **Enable professional interactions** — Crosshair with synced tooltip, zoom, pan
3. **Add goal/threshold lines** — Visualize retirement goals, warning levels
4. **Support multi-series** — Baseline vs scenario comparison on same chart
5. **Match HMI aesthetic** — Dark/light mode, consistent with design tokens
6. **Improve performance** — Smooth 60fps rendering for 360-month projections
7. **Maintain accessibility** — Keyboard navigation, screen reader support where possible

### 1.4 Scope

**In scope:**
- All time-series projection charts (Net Worth, Cash Flow, Account Balances)
- Comparison charts (Baseline vs Scenario)
- Goal/threshold visualization
- Chart controls (time range selector, series toggles)

**Out of scope:**
- Pie charts, bar charts (keep Recharts for these)
- Sparklines in tables (separate implementation)
- Dashboard mini-charts (may use simplified version)

---

## 2. Library Overview

### 2.1 Lightweight Charts Concepts

**Chart** — The container that holds all visual elements. One chart per component instance.

**Series** — A data visualization within the chart. Types include:
- `AreaSeries` — Filled area below line (primary for net worth)
- `LineSeries` — Simple line (for comparison overlays)
- `BaselineSeries` — Line with fill above/below a baseline value
- `HistogramSeries` — Bar chart (for cash flow positive/negative)

**Price Line** — Horizontal line at a specific value (for goals, thresholds)

**Time Scale** — X-axis handling time values

**Price Scale** — Y-axis handling value formatting

**Crosshair** — Vertical + horizontal lines following cursor with value display

### 2.2 Data Format

Lightweight Charts expects data in this format:

```typescript
interface SingleValueData {
  time: Time; // UTCTimestamp | BusinessDay | string (YYYY-MM-DD)
  value: number;
}

interface AreaData extends SingleValueData {
  // Optional per-point styling
  lineColor?: string;
  topColor?: string;
  bottomColor?: string;
}

// For baseline series (shows positive/negative from baseline)
interface BaselineData extends SingleValueData {
  // Uses topFillColor1/2 and bottomFillColor1/2 from series options
}
```

**Time formats supported:**
- Unix timestamp (seconds): `1704067200`
- ISO date string: `'2024-01-01'`
- Business day object: `{ year: 2024, month: 1, day: 1 }`

For financial projections, we'll use **ISO date strings** for clarity.

---

## 3. Installation & Setup

### 3.1 Install Dependencies

```bash
npm install lightweight-charts
```

### 3.2 TypeScript Configuration

Lightweight Charts is fully typed. No additional `@types` package needed.

Add to `tsconfig.json` if not present:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

### 3.3 Project Structure

Create the following directory structure:

```
components/
  charts/
    lightweight/
      LightweightChart.tsx        # Base chart component
      ProjectionChart.tsx         # Net worth projection
      ComparisonChart.tsx         # Baseline vs scenario
      CashFlowChart.tsx          # Income/expense/net
      ChartTooltip.tsx           # Custom tooltip overlay
      ChartControls.tsx          # Time range, series toggles
      ChartLegend.tsx            # External legend component
      useChartTheme.ts           # Theme hook for dark/light mode
      useChartData.ts            # Data transformation hook
      types.ts                   # Shared type definitions
    index.ts                     # Public exports
lib/
  chart-config.ts               # Update with LW Charts config
```

---

## 4. Architecture

### 4.1 Component Hierarchy

```
<ProjectionChart>
  ├── <ChartControls>           # Time range selector, series toggles
  │     ├── TimeRangeSelector
  │     └── SeriesToggles
  ├── <LightweightChart>        # Core chart wrapper
  │     ├── Canvas (internal)
  │     ├── Series[]
  │     └── PriceLines[]
  ├── <ChartTooltip>            # Custom tooltip (positioned absolutely)
  └── <ChartLegend>             # External legend below chart
```

### 4.2 State Management

```typescript
interface ChartState {
  // Visible time range
  visibleRange: {
    from: string; // ISO date
    to: string;
  };
  
  // Crosshair position (for tooltip)
  crosshairData: {
    time: string;
    values: Record<string, number>; // seriesId -> value
    position: { x: number; y: number };
  } | null;
  
  // Series visibility
  seriesVisibility: Record<string, boolean>;
  
  // Chart instance ref
  chartRef: IChartApi | null;
}
```

### 4.3 Data Flow

```
Raw Projection Data (from API)
    ↓
useChartData() hook — transforms to LW Charts format
    ↓
<ProjectionChart> — manages state, controls
    ↓
<LightweightChart> — renders chart, handles interactions
    ↓
Crosshair events → <ChartTooltip>
```

---

## 5. Core Chart Components

### 5.1 Type Definitions

**File:** `components/charts/lightweight/types.ts`

```typescript
import type {
  IChartApi,
  ISeriesApi,
  SeriesType,
  Time,
  SingleValueData,
  LineStyle,
  PriceLineOptions,
} from 'lightweight-charts';

// =============================================================================
// DATA TYPES
// =============================================================================

/**
 * Standard data point for time-series charts
 */
export interface ChartDataPoint {
  /** ISO date string: 'YYYY-MM-DD' */
  time: string;
  /** Numeric value */
  value: number;
}

/**
 * Multi-series data point (for comparison charts)
 */
export interface ComparisonDataPoint {
  time: string;
  baseline: number;
  scenario: number;
}

/**
 * Cash flow data point (positive/negative)
 */
export interface CashFlowDataPoint {
  time: string;
  income: number;
  expenses: number;
  net: number;
}

// =============================================================================
// SERIES CONFIGURATION
// =============================================================================

/**
 * Series configuration for chart
 */
export interface SeriesConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Series type */
  type: 'area' | 'line' | 'baseline' | 'histogram';
  /** Data key in data points */
  dataKey: string;
  /** Line/area color */
  color: string;
  /** Fill color (for area series) */
  fillColor?: string;
  /** Line width */
  lineWidth?: number;
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Initially visible */
  visible?: boolean;
  /** Price scale ID ('left' | 'right') */
  priceScaleId?: 'left' | 'right';
}

// =============================================================================
// PRICE LINE (GOALS/THRESHOLDS)
// =============================================================================

/**
 * Price line configuration for goals/thresholds
 */
export interface PriceLineConfig {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Value on Y-axis */
  value: number;
  /** Line color */
  color: string;
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Line width */
  lineWidth?: number;
  /** Show label on axis */
  axisLabelVisible?: boolean;
}

// =============================================================================
// CHART OPTIONS
// =============================================================================

/**
 * Time range preset
 */
export type TimeRangePreset = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y' | 'ALL';

/**
 * Chart interaction mode
 */
export type InteractionMode = 'crosshair' | 'zoom' | 'pan';

/**
 * Tooltip data passed to custom tooltip component
 */
export interface TooltipData {
  /** Time value */
  time: string;
  /** Formatted time for display */
  timeFormatted: string;
  /** Series values */
  values: Array<{
    seriesId: string;
    seriesName: string;
    value: number;
    valueFormatted: string;
    color: string;
  }>;
  /** Screen position */
  position: {
    x: number;
    y: number;
  };
}

/**
 * Chart theme (derived from app theme)
 */
export interface ChartTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  borderColor: string;
  crosshairColor: string;
  // Series defaults
  upColor: string;
  downColor: string;
  primaryColor: string;
  secondaryColor: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Base chart component props
 */
export interface LightweightChartProps {
  /** Chart data */
  data: ChartDataPoint[];
  /** Series configurations */
  series: SeriesConfig[];
  /** Price lines (goals/thresholds) */
  priceLines?: PriceLineConfig[];
  /** Chart height */
  height?: number;
  /** Show time scale (X-axis) */
  showTimeScale?: boolean;
  /** Show price scale (Y-axis) */
  showPriceScale?: boolean;
  /** Price scale position */
  priceScalePosition?: 'left' | 'right';
  /** Enable crosshair */
  enableCrosshair?: boolean;
  /** Enable zoom/pan */
  enableZoom?: boolean;
  /** Format function for Y-axis values */
  formatValue?: (value: number) => string;
  /** Format function for time values */
  formatTime?: (time: string) => string;
  /** Crosshair move callback */
  onCrosshairMove?: (data: TooltipData | null) => void;
  /** Time range change callback */
  onTimeRangeChange?: (range: { from: string; to: string }) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Projection chart props (extends base)
 */
export interface ProjectionChartProps {
  /** Projection data points */
  data: ChartDataPoint[];
  /** Baseline data (for comparison) */
  baselineData?: ChartDataPoint[];
  /** Scenario name */
  scenarioName: string;
  /** Baseline name */
  baselineName?: string;
  /** Goal lines */
  goals?: PriceLineConfig[];
  /** Chart height */
  height?: number;
  /** Initial time range */
  initialRange?: TimeRangePreset;
  /** Show controls */
  showControls?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Comparison chart props
 */
export interface ComparisonChartProps {
  /** Comparison data */
  data: ComparisonDataPoint[];
  /** Scenario name */
  scenarioName: string;
  /** Baseline name */
  baselineName: string;
  /** Goal lines */
  goals?: PriceLineConfig[];
  /** Show difference fill */
  showDifferenceFill?: boolean;
  /** Chart height */
  height?: number;
  /** Additional class name */
  className?: string;
}
```

### 5.2 Theme Hook

**File:** `components/charts/lightweight/useChartTheme.ts`

```typescript
import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { ChartTheme } from './types';
import type {
  DeepPartial,
  ChartOptions,
  LayoutOptions,
  GridOptions,
  CrosshairOptions,
  TimeScaleOptions,
  PriceScaleOptions,
} from 'lightweight-charts';

/**
 * Returns chart theme based on current app theme
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  return useMemo(() => ({
    backgroundColor: 'transparent',
    textColor: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)', // gray-400 / gray-500
    gridColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)', // gray-600/30 / gray-300/50
    borderColor: isDark ? 'rgb(55, 65, 81)' : 'rgb(229, 231, 235)', // gray-700 / gray-200
    crosshairColor: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
    upColor: 'rgb(16, 185, 129)', // emerald-500
    downColor: 'rgb(239, 68, 68)', // red-500
    primaryColor: isDark ? 'rgb(139, 92, 246)' : 'rgb(124, 58, 237)', // violet-500 / violet-600
    secondaryColor: isDark ? 'rgba(156, 163, 175, 0.5)' : 'rgba(107, 114, 128, 0.5)',
  }), [isDark]);
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
    formatValue?: (value: number) => string;
  }
): DeepPartial<ChartOptions> {
  const {
    height = 300,
    showTimeScale = true,
    showPriceScale = true,
    priceScalePosition = 'right',
    enableCrosshair = true,
    formatValue,
  } = options ?? {};
  
  return useMemo(() => ({
    height,
    layout: {
      background: { type: 'solid', color: theme.backgroundColor },
      textColor: theme.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 11,
    } as LayoutOptions,
    grid: {
      vertLines: { color: theme.gridColor, style: 1 },
      horzLines: { color: theme.gridColor, style: 1 },
    } as GridOptions,
    crosshair: enableCrosshair ? {
      mode: 0, // Normal crosshair
      vertLine: {
        color: theme.crosshairColor,
        width: 1,
        style: 2, // Dashed
        labelBackgroundColor: theme.primaryColor,
      },
      horzLine: {
        color: theme.crosshairColor,
        width: 1,
        style: 2,
        labelBackgroundColor: theme.primaryColor,
      },
    } as CrosshairOptions : {
      mode: 0,
      vertLine: { visible: false },
      horzLine: { visible: false },
    } as CrosshairOptions,
    timeScale: {
      visible: showTimeScale,
      borderColor: theme.borderColor,
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (time: any) => {
        const date = new Date(time * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      },
    } as TimeScaleOptions,
    rightPriceScale: {
      visible: showPriceScale && priceScalePosition === 'right',
      borderColor: theme.borderColor,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    } as PriceScaleOptions,
    leftPriceScale: {
      visible: showPriceScale && priceScalePosition === 'left',
      borderColor: theme.borderColor,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    } as PriceScaleOptions,
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { mouseWheel: true, pinch: true },
  }), [theme, height, showTimeScale, showPriceScale, priceScalePosition, enableCrosshair]);
}
```

### 5.3 Data Transformation Hook

**File:** `components/charts/lightweight/useChartData.ts`

```typescript
import { useMemo } from 'react';
import type { ChartDataPoint, ComparisonDataPoint } from './types';
import type { SingleValueData, Time } from 'lightweight-charts';

/**
 * Transform projection data to Lightweight Charts format
 */
export function useProjectionChartData(
  data: Array<{
    monthIndex: number;
    netWorth: number;
    income?: number;
    expenses?: number;
    cashFlow?: number;
  }>,
  startDate: Date
): ChartDataPoint[] {
  return useMemo(() => {
    return data.map((point) => {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + point.monthIndex - 1);
      
      return {
        time: date.toISOString().split('T')[0], // YYYY-MM-DD
        value: point.netWorth,
      };
    });
  }, [data, startDate]);
}

/**
 * Transform comparison data (baseline + scenario)
 */
export function useComparisonChartData(
  baselineData: Array<{ monthIndex: number; netWorth: number }>,
  scenarioData: Array<{ monthIndex: number; netWorth: number }>,
  startDate: Date
): ComparisonDataPoint[] {
  return useMemo(() => {
    // Assume both arrays have same length and monthIndex alignment
    return baselineData.map((baseline, i) => {
      const scenario = scenarioData[i];
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + baseline.monthIndex - 1);
      
      return {
        time: date.toISOString().split('T')[0],
        baseline: baseline.netWorth,
        scenario: scenario?.netWorth ?? baseline.netWorth,
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
  preset: '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y' | 'ALL',
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
    '1M': 1,
    '3M': 3,
    '6M': 6,
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
```

### 5.4 Base Chart Component

**File:** `components/charts/lightweight/LightweightChart.tsx`

```typescript
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  SeriesType,
  ColorType,
  LineStyle,
  CrosshairMode,
} from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { useChartTheme, useChartOptions } from './useChartTheme';
import { toLightweightData } from './useChartData';
import { formatCurrencyCompact } from '@/lib/format';
import type {
  LightweightChartProps,
  SeriesConfig,
  PriceLineConfig,
  TooltipData,
  ChartDataPoint,
} from './types';

// Map our line style to LW Charts LineStyle enum
const LINE_STYLE_MAP: Record<string, LineStyle> = {
  solid: LineStyle.Solid,
  dashed: LineStyle.Dashed,
  dotted: LineStyle.Dotted,
};

export function LightweightChart({
  data,
  series,
  priceLines = [],
  height = 300,
  showTimeScale = true,
  showPriceScale = true,
  priceScalePosition = 'right',
  enableCrosshair = true,
  enableZoom = true,
  formatValue = formatCurrencyCompact,
  formatTime,
  onCrosshairMove,
  onTimeRangeChange,
  className,
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  
  const theme = useChartTheme();
  const chartOptions = useChartOptions(theme, {
    height,
    showTimeScale,
    showPriceScale,
    priceScalePosition,
    enableCrosshair,
    formatValue,
  });
  
  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create chart
    const chart = createChart(containerRef.current, {
      ...chartOptions,
      width: containerRef.current.clientWidth,
    });
    
    chartRef.current = chart;
    
    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(containerRef.current);
    
    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRefs.current.clear();
    };
  }, []); // Only run once on mount
  
  // Update chart options when theme changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions(chartOptions);
  }, [chartOptions]);
  
  // Create/update series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    
    // Remove old series that are no longer in config
    const currentSeriesIds = new Set(series.map((s) => s.id));
    seriesRefs.current.forEach((seriesApi, id) => {
      if (!currentSeriesIds.has(id)) {
        chart.removeSeries(seriesApi);
        seriesRefs.current.delete(id);
      }
    });
    
    // Create or update series
    series.forEach((config) => {
      let seriesApi = seriesRefs.current.get(config.id);
      
      if (!seriesApi) {
        // Create new series
        switch (config.type) {
          case 'area':
            seriesApi = chart.addAreaSeries({
              lineColor: config.color,
              topColor: config.fillColor ?? `${config.color}40`,
              bottomColor: config.fillColor ? `${config.fillColor}00` : `${config.color}00`,
              lineWidth: config.lineWidth ?? 2,
              lineStyle: LINE_STYLE_MAP[config.lineStyle ?? 'solid'],
              priceScaleId: config.priceScaleId ?? 'right',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            break;
            
          case 'line':
            seriesApi = chart.addLineSeries({
              color: config.color,
              lineWidth: config.lineWidth ?? 2,
              lineStyle: LINE_STYLE_MAP[config.lineStyle ?? 'solid'],
              priceScaleId: config.priceScaleId ?? 'right',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            break;
            
          case 'baseline':
            seriesApi = chart.addBaselineSeries({
              baseValue: { type: 'price', price: 0 },
              topLineColor: theme.upColor,
              topFillColor1: `${theme.upColor}40`,
              topFillColor2: `${theme.upColor}00`,
              bottomLineColor: theme.downColor,
              bottomFillColor1: `${theme.downColor}00`,
              bottomFillColor2: `${theme.downColor}40`,
              lineWidth: config.lineWidth ?? 2,
              priceScaleId: config.priceScaleId ?? 'right',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            break;
            
          case 'histogram':
            seriesApi = chart.addHistogramSeries({
              color: config.color,
              priceScaleId: config.priceScaleId ?? 'right',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            break;
        }
        
        if (seriesApi) {
          seriesRefs.current.set(config.id, seriesApi);
        }
      }
      
      // Update series data
      if (seriesApi) {
        // Extract data for this series
        const seriesData = data.map((point: any) => ({
          time: point.time,
          value: point[config.dataKey] ?? point.value,
        }));
        
        seriesApi.setData(toLightweightData(seriesData));
        
        // Update visibility
        seriesApi.applyOptions({
          visible: config.visible !== false,
        });
      }
    });
    
    // Fit content after data update
    chart.timeScale().fitContent();
  }, [data, series, theme]);
  
  // Create/update price lines
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || series.length === 0) return;
    
    // Get the first series to attach price lines to
    const primarySeries = seriesRefs.current.get(series[0].id);
    if (!primarySeries) return;
    
    // Remove existing price lines and recreate
    // Note: LW Charts doesn't have a "remove all price lines" API,
    // so we track them separately if needed for updates
    
    priceLines.forEach((line) => {
      primarySeries.createPriceLine({
        price: line.value,
        color: line.color,
        lineWidth: line.lineWidth ?? 1,
        lineStyle: LINE_STYLE_MAP[line.lineStyle ?? 'dashed'],
        axisLabelVisible: line.axisLabelVisible ?? true,
        title: line.label,
      });
    });
  }, [priceLines, series]);
  
  // Subscribe to crosshair move
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onCrosshairMove) return;
    
    const handler = (param: any) => {
      if (!param.time || !param.point) {
        onCrosshairMove(null);
        return;
      }
      
      // Gather values from all series
      const values: TooltipData['values'] = [];
      
      series.forEach((config) => {
        const seriesApi = seriesRefs.current.get(config.id);
        if (!seriesApi) return;
        
        const seriesData = param.seriesData.get(seriesApi);
        if (seriesData?.value !== undefined) {
          values.push({
            seriesId: config.id,
            seriesName: config.name,
            value: seriesData.value,
            valueFormatted: formatValue(seriesData.value),
            color: config.color,
          });
        }
      });
      
      // Format time
      const timeStr = typeof param.time === 'string'
        ? param.time
        : new Date(param.time * 1000).toISOString().split('T')[0];
      
      const timeFormatted = formatTime
        ? formatTime(timeStr)
        : new Date(timeStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
      
      onCrosshairMove({
        time: timeStr,
        timeFormatted,
        values,
        position: {
          x: param.point.x,
          y: param.point.y,
        },
      });
    };
    
    chart.subscribeCrosshairMove(handler);
    
    return () => {
      chart.unsubscribeCrosshairMove(handler);
    };
  }, [onCrosshairMove, series, formatValue, formatTime]);
  
  // Subscribe to time range changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onTimeRangeChange) return;
    
    const handler = () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (range) {
        // Convert logical range to time range
        // This is approximate - for exact times, use getVisibleRange()
        const visibleRange = chart.timeScale().getVisibleRange();
        if (visibleRange) {
          const from = typeof visibleRange.from === 'string'
            ? visibleRange.from
            : new Date(visibleRange.from * 1000).toISOString().split('T')[0];
          const to = typeof visibleRange.to === 'string'
            ? visibleRange.to
            : new Date(visibleRange.to * 1000).toISOString().split('T')[0];
          
          onTimeRangeChange({ from, to });
        }
      }
    };
    
    chart.timeScale().subscribeVisibleTimeRangeChange(handler);
    
    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handler);
    };
  }, [onTimeRangeChange]);
  
  // Public methods exposed via ref
  const setVisibleRange = useCallback((from: string, to: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    
    chart.timeScale().setVisibleRange({
      from: from as any,
      to: to as any,
    });
  }, []);
  
  const fitContent = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    
    chart.timeScale().fitContent();
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={cn('w-full', className)}
      style={{ height }}
    />
  );
}
```

### 5.5 Custom Tooltip Component

**File:** `components/charts/lightweight/ChartTooltip.tsx`

```typescript
'use client';

import { cn } from '@/lib/utils';
import { SURFACE, TYPOGRAPHY } from '@/lib/design-tokens';
import type { TooltipData } from './types';

interface ChartTooltipProps {
  data: TooltipData | null;
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export function ChartTooltip({ data, containerRef, className }: ChartTooltipProps) {
  if (!data || !containerRef.current) return null;
  
  const containerRect = containerRef.current.getBoundingClientRect();
  
  // Position tooltip to avoid overflow
  const tooltipWidth = 200;
  const tooltipHeight = 100;
  
  let left = data.position.x + 16;
  let top = data.position.y - tooltipHeight / 2;
  
  // Flip to left side if would overflow right
  if (left + tooltipWidth > containerRect.width) {
    left = data.position.x - tooltipWidth - 16;
  }
  
  // Clamp vertical position
  if (top < 0) top = 0;
  if (top + tooltipHeight > containerRect.height) {
    top = containerRect.height - tooltipHeight;
  }
  
  return (
    <div
      className={cn(
        'absolute pointer-events-none z-50',
        'rounded-lg border bg-card shadow-lg',
        'px-3 py-2 min-w-[180px]',
        className
      )}
      style={{
        left,
        top,
        transform: 'translateY(-50%)',
      }}
    >
      {/* Time header */}
      <div className={cn(TYPOGRAPHY.labelText, 'mb-2 pb-1.5 border-b border-border/50')}>
        {data.timeFormatted}
      </div>
      
      {/* Series values */}
      <div className="space-y-1.5">
        {data.values.map((item) => (
          <div key={item.seriesId} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground truncate">
                {item.seriesName}
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {item.valueFormatted}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5.6 Chart Controls Component

**File:** `components/charts/lightweight/ChartControls.tsx`

```typescript
'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { TimeRangePreset, SeriesConfig } from './types';

interface ChartControlsProps {
  /** Current time range preset */
  timeRange: TimeRangePreset;
  /** Time range change handler */
  onTimeRangeChange: (range: TimeRangePreset) => void;
  /** Series configurations (for toggles) */
  series?: SeriesConfig[];
  /** Series visibility state */
  seriesVisibility?: Record<string, boolean>;
  /** Series visibility change handler */
  onSeriesVisibilityChange?: (seriesId: string, visible: boolean) => void;
  /** Zoom in handler */
  onZoomIn?: () => void;
  /** Zoom out handler */
  onZoomOut?: () => void;
  /** Reset zoom handler */
  onResetZoom?: () => void;
  /** Show zoom controls */
  showZoomControls?: boolean;
  /** Additional class name */
  className?: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRangePreset; label: string }[] = [
  { value: '1Y', label: '1Y' },
  { value: '2Y', label: '2Y' },
  { value: '5Y', label: '5Y' },
  { value: '10Y', label: '10Y' },
  { value: 'ALL', label: 'All' },
];

export function ChartControls({
  timeRange,
  onTimeRangeChange,
  series,
  seriesVisibility,
  onSeriesVisibilityChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  showZoomControls = false,
  className,
}: ChartControlsProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Left: Series toggles */}
      <div className="flex items-center gap-3">
        {series?.map((s) => {
          const isVisible = seriesVisibility?.[s.id] ?? s.visible ?? true;
          
          return (
            <button
              key={s.id}
              onClick={() => onSeriesVisibilityChange?.(s.id, !isVisible)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors',
                isVisible
                  ? 'bg-transparent hover:bg-muted'
                  : 'bg-muted/50 text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-sm',
                  !isVisible && 'opacity-40'
                )}
                style={{ backgroundColor: s.color }}
              />
              <span className={cn(!isVisible && 'line-through')}>{s.name}</span>
            </button>
          );
        })}
      </div>
      
      {/* Right: Time range + zoom */}
      <div className="flex items-center gap-2">
        {/* Time range selector */}
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={(v) => v && onTimeRangeChange(v as TimeRangePreset)}
          className="h-8"
        >
          {TIME_RANGE_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="h-8 px-2.5 text-xs"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        
        {/* Zoom controls */}
        {showZoomControls && (
          <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onZoomIn}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onZoomOut}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onResetZoom}
              title="Reset zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5.7 External Legend Component

**File:** `components/charts/lightweight/ChartLegend.tsx`

```typescript
'use client';

import { cn } from '@/lib/utils';
import type { PriceLineConfig, SeriesConfig } from './types';

interface ChartLegendProps {
  /** Series configurations */
  series?: SeriesConfig[];
  /** Price lines (goals) */
  priceLines?: PriceLineConfig[];
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Additional class name */
  className?: string;
}

export function ChartLegend({
  series = [],
  priceLines = [],
  orientation = 'horizontal',
  className,
}: ChartLegendProps) {
  const hasItems = series.length > 0 || priceLines.length > 0;
  
  if (!hasItems) return null;
  
  return (
    <div
      className={cn(
        'flex gap-4 text-xs text-muted-foreground',
        orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row flex-wrap',
        className
      )}
    >
      {/* Series */}
      {series.map((s) => (
        <div key={s.id} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          <span>{s.name}</span>
        </div>
      ))}
      
      {/* Price lines */}
      {priceLines.map((line) => (
        <div key={line.id} className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4"
            style={{
              backgroundColor: line.color,
              backgroundImage: line.lineStyle === 'dashed'
                ? `repeating-linear-gradient(90deg, ${line.color} 0, ${line.color} 4px, transparent 4px, transparent 8px)`
                : undefined,
            }}
          />
          <span>{line.label}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Styling & Theming

### 6.1 Color Palette

**File:** Update `lib/design-tokens.ts` with chart-specific tokens:

```typescript
// Add to existing design-tokens.ts

// -----------------------------------------------------------------------------
// Chart Colors (Lightweight Charts specific)
// -----------------------------------------------------------------------------
export const CHART_COLORS = {
  // Series colors
  primary: {
    line: 'rgb(139, 92, 246)', // violet-500
    fill: 'rgba(139, 92, 246, 0.15)',
    fillTop: 'rgba(139, 92, 246, 0.4)',
    fillBottom: 'rgba(139, 92, 246, 0)',
  },
  secondary: {
    line: 'rgb(156, 163, 175)', // gray-400
    fill: 'rgba(156, 163, 175, 0.1)',
    fillTop: 'rgba(156, 163, 175, 0.3)',
    fillBottom: 'rgba(156, 163, 175, 0)',
  },
  tertiary: {
    line: 'rgb(59, 130, 246)', // blue-500
    fill: 'rgba(59, 130, 246, 0.15)',
    fillTop: 'rgba(59, 130, 246, 0.4)',
    fillBottom: 'rgba(59, 130, 246, 0)',
  },
  
  // Status colors for price lines
  good: 'rgb(16, 185, 129)', // emerald-500
  warning: 'rgb(245, 158, 11)', // amber-500
  critical: 'rgb(239, 68, 68)', // red-500
  neutral: 'rgb(107, 114, 128)', // gray-500
  
  // Positive/Negative for cash flow
  positive: 'rgb(16, 185, 129)',
  negative: 'rgb(239, 68, 68)',
  
  // Chart chrome
  grid: {
    light: 'rgba(209, 213, 219, 0.5)', // gray-300/50
    dark: 'rgba(75, 85, 99, 0.3)', // gray-600/30
  },
  border: {
    light: 'rgb(229, 231, 235)', // gray-200
    dark: 'rgb(55, 65, 81)', // gray-700
  },
  text: {
    light: 'rgb(107, 114, 128)', // gray-500
    dark: 'rgb(156, 163, 175)', // gray-400
  },
  crosshair: {
    light: 'rgb(107, 114, 128)',
    dark: 'rgb(156, 163, 175)',
  },
} as const;

// Chart sizing constants
export const CHART_SIZES = {
  default: 300,
  compact: 200,
  large: 400,
  full: 500,
} as const;
```

### 6.2 Dark Mode Integration

The `useChartTheme()` hook automatically detects dark mode via `next-themes`. Ensure your chart components use this hook:

```typescript
// In any chart component
const theme = useChartTheme();
const chartOptions = useChartOptions(theme, { height: 300 });
```

### 6.3 CSS Integration

Add to your global CSS if needed:

```css
/* Lightweight Charts container styling */
.tv-lightweight-charts {
  /* Remove default focus outline */
  outline: none !important;
}

/* Ensure chart doesn't create scrollbars */
.tv-lightweight-charts canvas {
  display: block;
}
```

---

## 7. Interactions

### 7.1 Crosshair Behavior

The crosshair is enabled by default with these behaviors:
- **Vertical line** — Shows current time position
- **Horizontal line** — Shows current value
- **Axis labels** — Shows values on both axes
- **Snaps to data points** — Crosshair snaps to nearest actual data point

To customize crosshair mode:

```typescript
// In chart options
crosshair: {
  mode: CrosshairMode.Normal, // or Magnet for snap-to-point
  vertLine: {
    visible: true,
    labelVisible: true,
    style: LineStyle.Dashed,
    width: 1,
    color: theme.crosshairColor,
    labelBackgroundColor: theme.primaryColor,
  },
  horzLine: {
    visible: true,
    labelVisible: true,
    style: LineStyle.Dashed,
    width: 1,
    color: theme.crosshairColor,
    labelBackgroundColor: theme.primaryColor,
  },
}
```

### 7.2 Zoom and Pan

**Mouse wheel zoom** — Scroll to zoom in/out on time axis
**Click and drag** — Pan the chart
**Pinch zoom** — Touch gesture for zoom (mobile)

Configure zoom/pan behavior:

```typescript
// In chart options
handleScroll: {
  mouseWheel: true,
  pressedMouseMove: true, // Pan with mouse drag
  horzTouchDrag: true,
  vertTouchDrag: false, // Disable vertical touch pan to allow page scroll
},
handleScale: {
  mouseWheel: true,
  pinch: true,
  axisPressedMouseMove: {
    time: true, // Allow time axis drag to scale
    price: false, // Disable price axis drag
  },
},
```

### 7.3 Keyboard Navigation

Lightweight Charts has limited keyboard support. Add custom handlers:

```typescript
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    const chart = chartRef.current;
    if (!chart) return;
    
    const timeScale = chart.timeScale();
    const currentRange = timeScale.getVisibleLogicalRange();
    if (!currentRange) return;
    
    const rangeSize = currentRange.to - currentRange.from;
    const step = rangeSize * 0.1;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        timeScale.setVisibleLogicalRange({
          from: currentRange.from - step,
          to: currentRange.to - step,
        });
        break;
      case 'ArrowRight':
        e.preventDefault();
        timeScale.setVisibleLogicalRange({
          from: currentRange.from + step,
          to: currentRange.to + step,
        });
        break;
      case 'ArrowUp':
      case '+':
      case '=':
        e.preventDefault();
        // Zoom in
        timeScale.setVisibleLogicalRange({
          from: currentRange.from + step,
          to: currentRange.to - step,
        });
        break;
      case 'ArrowDown':
      case '-':
        e.preventDefault();
        // Zoom out
        timeScale.setVisibleLogicalRange({
          from: currentRange.from - step,
          to: currentRange.to + step,
        });
        break;
      case 'Home':
        e.preventDefault();
        timeScale.fitContent();
        break;
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  container.tabIndex = 0; // Make focusable
  
  return () => container.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 8. Data Formatting

### 8.1 Time Format Requirements

Lightweight Charts accepts several time formats. For consistency, use **ISO date strings**:

```typescript
// CORRECT: ISO date string
{ time: '2024-01-15', value: 100000 }

// ALSO CORRECT: Unix timestamp (seconds, not milliseconds)
{ time: 1705276800, value: 100000 }

// INCORRECT: Unix milliseconds
{ time: 1705276800000, value: 100000 } // ❌ Wrong!
```

### 8.2 Converting Projection Data

Your projection data likely looks like:

```typescript
// From API
interface ProjectionRow {
  monthIndex: number; // 1, 2, 3, ...
  netWorth: number;
  income: number;
  expenses: number;
  cashFlow: number;
}
```

Convert to chart format:

```typescript
function projectionsToChartData(
  projections: ProjectionRow[],
  startDate: Date
): ChartDataPoint[] {
  return projections.map((row) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + row.monthIndex - 1);
    
    return {
      time: date.toISOString().split('T')[0], // 'YYYY-MM-DD'
      value: row.netWorth,
    };
  });
}
```

### 8.3 Price Scale Formatting

Configure price scale to show formatted currency:

```typescript
// Custom price formatter
chart.applyOptions({
  localization: {
    priceFormatter: (price: number) => formatCurrencyCompact(price),
  },
});

// Or per-series
series.applyOptions({
  priceFormat: {
    type: 'custom',
    formatter: (price: number) => formatCurrencyCompact(price),
  },
});
```

### 8.4 Time Scale Formatting

Format time axis labels:

```typescript
chart.applyOptions({
  timeScale: {
    tickMarkFormatter: (time: UTCTimestamp | BusinessDay | string) => {
      const date = typeof time === 'string' 
        ? new Date(time)
        : new Date(time * 1000);
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
    },
  },
});
```

---

## 9. Chart Types & Implementations

### 9.1 Net Worth Projection Chart

**File:** `components/charts/lightweight/ProjectionChart.tsx`

This is the primary chart for scenario projection views.

```typescript
'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SURFACE, CHART_COLORS } from '@/lib/design-tokens';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';
import { LightweightChart } from './LightweightChart';
import { ChartTooltip } from './ChartTooltip';
import { ChartControls } from './ChartControls';
import { ChartLegend } from './ChartLegend';
import { getTimeRangeFromPreset } from './useChartData';
import type {
  ProjectionChartProps,
  ChartDataPoint,
  SeriesConfig,
  PriceLineConfig,
  TooltipData,
  TimeRangePreset,
} from './types';

export function ProjectionChart({
  data,
  baselineData,
  scenarioName,
  baselineName = 'Baseline',
  goals = [],
  height = 350,
  initialRange = '5Y',
  showControls = true,
  className,
}: ProjectionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>(initialRange);
  const [seriesVisibility, setSeriesVisibility] = useState<Record<string, boolean>>({
    scenario: true,
    baseline: true,
  });
  
  // Build series configuration
  const series = useMemo<SeriesConfig[]>(() => {
    const result: SeriesConfig[] = [
      {
        id: 'scenario',
        name: scenarioName,
        type: 'area',
        dataKey: 'value',
        color: CHART_COLORS.primary.line,
        fillColor: CHART_COLORS.primary.fill,
        lineWidth: 2,
        visible: seriesVisibility.scenario,
      },
    ];
    
    if (baselineData && baselineData.length > 0) {
      result.unshift({
        id: 'baseline',
        name: baselineName,
        type: 'area',
        dataKey: 'baseline',
        color: CHART_COLORS.secondary.line,
        fillColor: CHART_COLORS.secondary.fill,
        lineWidth: 1.5,
        lineStyle: 'dashed',
        visible: seriesVisibility.baseline,
      });
    }
    
    return result;
  }, [scenarioName, baselineName, baselineData, seriesVisibility]);
  
  // Merge data for multi-series
  const chartData = useMemo(() => {
    if (!baselineData || baselineData.length === 0) {
      return data;
    }
    
    // Merge baseline into each data point
    return data.map((point, i) => ({
      ...point,
      baseline: baselineData[i]?.value ?? point.value,
    }));
  }, [data, baselineData]);
  
  // Convert goals to price lines
  const priceLines = useMemo<PriceLineConfig[]>(() => {
    return goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      value: goal.value,
      color: goal.color ?? CHART_COLORS.good,
      lineStyle: 'dashed',
      lineWidth: 1,
      axisLabelVisible: true,
    }));
  }, [goals]);
  
  // Handle series visibility toggle
  const handleSeriesVisibilityChange = useCallback((seriesId: string, visible: boolean) => {
    setSeriesVisibility((prev) => ({
      ...prev,
      [seriesId]: visible,
    }));
  }, []);
  
  // Handle time range change
  const handleTimeRangeChange = useCallback((range: TimeRangePreset) => {
    setTimeRange(range);
    // Chart will automatically adjust via visible range
  }, []);
  
  // Format time for tooltip
  const formatTime = useCallback((time: string) => {
    return formatMonthYear(time);
  }, []);
  
  return (
    <div className={cn('relative', className)}>
      {/* Controls */}
      {showControls && (
        <div className="mb-3">
          <ChartControls
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            series={series}
            seriesVisibility={seriesVisibility}
            onSeriesVisibilityChange={handleSeriesVisibilityChange}
          />
        </div>
      )}
      
      {/* Chart container */}
      <div ref={containerRef} className="relative">
        <LightweightChart
          data={chartData}
          series={series}
          priceLines={priceLines}
          height={height}
          formatValue={formatCurrencyCompact}
          formatTime={formatTime}
          onCrosshairMove={setTooltipData}
          enableCrosshair
          enableZoom
        />
        
        {/* Custom tooltip */}
        <ChartTooltip
          data={tooltipData}
          containerRef={containerRef}
        />
      </div>
      
      {/* Legend */}
      {priceLines.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <ChartLegend priceLines={priceLines} />
        </div>
      )}
    </div>
  );
}
```

### 9.2 Baseline vs Scenario Comparison Chart

**File:** `components/charts/lightweight/ComparisonChart.tsx`

Shows both series with optional difference fill highlighting.

```typescript
'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/design-tokens';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';
import { LightweightChart } from './LightweightChart';
import { ChartTooltip } from './ChartTooltip';
import { ChartControls } from './ChartControls';
import type {
  ComparisonChartProps,
  SeriesConfig,
  TooltipData,
  TimeRangePreset,
} from './types';

export function ComparisonChart({
  data,
  scenarioName,
  baselineName,
  goals = [],
  showDifferenceFill = true,
  height = 350,
  className,
}: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('5Y');
  
  // Convert comparison data to chart format
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: point.time,
      value: point.scenario, // Primary series
      baseline: point.baseline,
      // For difference visualization
      difference: point.scenario - point.baseline,
    }));
  }, [data]);
  
  // Series configuration
  const series = useMemo<SeriesConfig[]>(() => [
    {
      id: 'baseline',
      name: baselineName,
      type: 'line',
      dataKey: 'baseline',
      color: CHART_COLORS.secondary.line,
      lineWidth: 2,
      lineStyle: 'dashed',
    },
    {
      id: 'scenario',
      name: scenarioName,
      type: 'area',
      dataKey: 'value',
      color: CHART_COLORS.primary.line,
      fillColor: CHART_COLORS.primary.fill,
      lineWidth: 2,
    },
  ], [scenarioName, baselineName]);
  
  // Price lines from goals
  const priceLines = useMemo(() => {
    return goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      value: goal.value,
      color: goal.color ?? CHART_COLORS.good,
      lineStyle: 'dashed' as const,
      lineWidth: 1,
      axisLabelVisible: true,
    }));
  }, [goals]);
  
  // Custom tooltip with difference
  const handleCrosshairMove = useCallback((data: TooltipData | null) => {
    if (data && data.values.length >= 2) {
      const baselineValue = data.values.find((v) => v.seriesId === 'baseline')?.value ?? 0;
      const scenarioValue = data.values.find((v) => v.seriesId === 'scenario')?.value ?? 0;
      const difference = scenarioValue - baselineValue;
      
      // Add difference to tooltip
      data.values.push({
        seriesId: 'difference',
        seriesName: 'Difference',
        value: difference,
        valueFormatted: formatCurrencyCompact(difference),
        color: difference >= 0 ? CHART_COLORS.good : CHART_COLORS.critical,
      });
    }
    setTooltipData(data);
  }, []);
  
  return (
    <div className={cn('relative', className)}>
      {/* Controls */}
      <div className="mb-3">
        <ChartControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          series={series}
        />
      </div>
      
      {/* Chart */}
      <div ref={containerRef} className="relative">
        <LightweightChart
          data={chartData}
          series={series}
          priceLines={priceLines}
          height={height}
          formatValue={formatCurrencyCompact}
          formatTime={formatMonthYear}
          onCrosshairMove={handleCrosshairMove}
          enableCrosshair
          enableZoom
        />
        
        <ChartTooltip
          data={tooltipData}
          containerRef={containerRef}
        />
      </div>
    </div>
  );
}
```

### 9.3 Cash Flow Chart (Positive/Negative)

**File:** `components/charts/lightweight/CashFlowChart.tsx`

Shows income, expenses, and net cash flow with positive/negative coloring.

```typescript
'use client';

import { useState, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/design-tokens';
import { formatCurrencyCompact, formatMonthYear } from '@/lib/format';
import { LightweightChart } from './LightweightChart';
import { ChartTooltip } from './ChartTooltip';
import { ChartControls } from './ChartControls';
import type {
  CashFlowDataPoint,
  SeriesConfig,
  TooltipData,
  TimeRangePreset,
} from './types';

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
  height?: number;
  showNet?: boolean;
  className?: string;
}

export function CashFlowChart({
  data,
  height = 300,
  showNet = true,
  className,
}: CashFlowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('1Y');
  const [seriesVisibility, setSeriesVisibility] = useState({
    income: true,
    expenses: true,
    net: true,
  });
  
  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: point.time,
      income: point.income,
      expenses: point.expenses,
      net: point.net,
    }));
  }, [data]);
  
  // Series configuration
  const series = useMemo<SeriesConfig[]>(() => {
    const result: SeriesConfig[] = [
      {
        id: 'income',
        name: 'Income',
        type: 'line',
        dataKey: 'income',
        color: CHART_COLORS.positive,
        lineWidth: 2,
        visible: seriesVisibility.income,
      },
      {
        id: 'expenses',
        name: 'Expenses',
        type: 'line',
        dataKey: 'expenses',
        color: CHART_COLORS.negative,
        lineWidth: 2,
        visible: seriesVisibility.expenses,
      },
    ];
    
    if (showNet) {
      result.push({
        id: 'net',
        name: 'Net Cash Flow',
        type: 'baseline', // Shows positive/negative fill
        dataKey: 'net',
        color: CHART_COLORS.primary.line,
        lineWidth: 2,
        visible: seriesVisibility.net,
      });
    }
    
    return result;
  }, [showNet, seriesVisibility]);
  
  return (
    <div className={cn('relative', className)}>
      <div className="mb-3">
        <ChartControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          series={series}
          seriesVisibility={seriesVisibility}
          onSeriesVisibilityChange={(id, visible) =>
            setSeriesVisibility((prev) => ({ ...prev, [id]: visible }))
          }
        />
      </div>
      
      <div ref={containerRef} className="relative">
        <LightweightChart
          data={chartData}
          series={series}
          height={height}
          formatValue={formatCurrencyCompact}
          formatTime={formatMonthYear}
          onCrosshairMove={setTooltipData}
          enableCrosshair
          enableZoom
        />
        
        <ChartTooltip
          data={tooltipData}
          containerRef={containerRef}
        />
      </div>
    </div>
  );
}
```

---

## 10. Migration Strategy

### 10.1 Parallel Implementation

Do NOT remove Recharts immediately. Implement Lightweight Charts components alongside existing ones:

```
components/
  charts/
    recharts/           # Keep existing (for now)
      ProjectionChart.tsx
      ...
    lightweight/        # New implementation
      ProjectionChart.tsx
      ...
    index.ts            # Export switcher
```

### 10.2 Feature Flag (Optional)

If needed, add a feature flag to gradually roll out:

```typescript
// lib/feature-flags.ts
export const FEATURES = {
  USE_LIGHTWEIGHT_CHARTS: true,
};

// Usage in component
import { FEATURES } from '@/lib/feature-flags';
import { ProjectionChart as LWProjectionChart } from './lightweight/ProjectionChart';
import { ProjectionChart as RechartsProjectionChart } from './recharts/ProjectionChart';

export const ProjectionChart = FEATURES.USE_LIGHTWEIGHT_CHARTS
  ? LWProjectionChart
  : RechartsProjectionChart;
```

### 10.3 Migration Order

1. **Phase 1: Core Infrastructure**
   - Create type definitions
   - Create hooks (theme, data transformation)
   - Create base `LightweightChart` component
   
2. **Phase 2: Primary Charts**
   - `ProjectionChart` — Net worth projection (most critical)
   - Test on Scenario detail page
   
3. **Phase 3: Secondary Charts**
   - `ComparisonChart` — Baseline vs scenario
   - `CashFlowChart` — Income/expense visualization
   
4. **Phase 4: Integration**
   - Replace all Recharts usage on Scenario pages
   - Replace Dashboard projection chart
   
5. **Phase 5: Cleanup**
   - Remove Recharts from scenario-related pages
   - Keep Recharts only if still needed for pie/bar charts
   - Update bundle analysis

### 10.4 Page-by-Page Migration Checklist

**Scenario Detail — Projection Tab**
- [ ] Replace net worth projection chart
- [ ] Add goal lines for financial targets
- [ ] Test crosshair tooltip
- [ ] Test zoom/pan interactions
- [ ] Verify Y-axis shows proper currency format

**Scenario Detail — Compare Tab**
- [ ] Replace comparison chart
- [ ] Show baseline + scenario series
- [ ] Show difference in tooltip

**Dashboard**
- [ ] Replace net worth trajectory chart
- [ ] Add goal line if user has retirement target

**Accounts Page** (if charts exist)
- [ ] Replace any account balance charts

---

## 11. Accessibility

### 11.1 Limitations

Lightweight Charts is canvas-based, which means:
- Screen readers cannot access individual data points
- Color alone conveys series differentiation

### 11.2 Mitigations

1. **External legend with labels** — Always render `ChartLegend` outside the chart
2. **Keyboard navigation** — Implement arrow key handlers for pan/zoom
3. **Alt text** — Add `aria-label` to chart container describing overall trend
4. **Data table toggle** — Offer option to view data as accessible table

```tsx
// Add to chart container
<div
  role="img"
  aria-label={`${scenarioName} net worth projection from ${formatMonthYear(data[0].time)} to ${formatMonthYear(data[data.length - 1].time)}. Starting value ${formatCurrency(data[0].value)}, ending value ${formatCurrency(data[data.length - 1].value)}.`}
  tabIndex={0}
>
  <LightweightChart ... />
</div>
```

### 11.3 Accessible Alternative

Add a toggle to show data as a table:

```tsx
const [showTable, setShowTable] = useState(false);

{showTable ? (
  <table className="sr-only">
    <caption>{scenarioName} Projection Data</caption>
    <thead>
      <tr>
        <th>Date</th>
        <th>Net Worth</th>
      </tr>
    </thead>
    <tbody>
      {data.map((point) => (
        <tr key={point.time}>
          <td>{formatMonthYear(point.time)}</td>
          <td>{formatCurrency(point.value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
) : (
  <LightweightChart ... />
)}

<button onClick={() => setShowTable(!showTable)}>
  {showTable ? 'Show Chart' : 'Show Data Table'}
</button>
```

---

## 12. Performance

### 12.1 Expected Performance

| Data Points | Recharts (SVG) | Lightweight Charts (Canvas) |
|-------------|----------------|----------------------------|
| 60 (5 years) | ~50ms render | ~5ms render |
| 120 (10 years) | ~100ms render | ~8ms render |
| 360 (30 years) | ~300ms render, laggy interaction | ~15ms render, smooth |

### 12.2 Optimization Tips

1. **Memoize data transformations**
   ```typescript
   const chartData = useMemo(() => transformData(rawData), [rawData]);
   ```

2. **Debounce crosshair callbacks**
   ```typescript
   const debouncedCrosshairMove = useMemo(
     () => debounce(onCrosshairMove, 16), // ~60fps
     [onCrosshairMove]
   );
   ```

3. **Avoid re-creating chart on every render**
   - Chart creation is in a `useEffect` with empty deps
   - Options updates use `chart.applyOptions()` not recreation

4. **Use `fitContent()` sparingly**
   - Only call when data changes, not on every render

### 12.3 Bundle Size

```
Before (Recharts):
  recharts: ~45KB gzipped
  d3 (dependency): ~30KB gzipped
  Total: ~75KB

After (Lightweight Charts):
  lightweight-charts: ~45KB gzipped
  Total: ~45KB

Savings: ~30KB (~40% reduction for chart code)
```

---

## 13. Testing

### 13.1 Unit Tests

**File:** `components/charts/lightweight/__tests__/useChartData.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { useProjectionChartData, getTimeRangeFromPreset } from '../useChartData';

describe('useProjectionChartData', () => {
  it('converts projection data to chart format', () => {
    const projections = [
      { monthIndex: 1, netWorth: 100000 },
      { monthIndex: 2, netWorth: 105000 },
      { monthIndex: 3, netWorth: 110000 },
    ];
    const startDate = new Date('2024-01-01');
    
    const result = useProjectionChartData(projections, startDate);
    
    expect(result).toEqual([
      { time: '2024-01-01', value: 100000 },
      { time: '2024-02-01', value: 105000 },
      { time: '2024-03-01', value: 110000 },
    ]);
  });
});

describe('getTimeRangeFromPreset', () => {
  const data = [
    { time: '2020-01-01', value: 100000 },
    { time: '2025-01-01', value: 200000 },
  ];
  
  it('returns full range for ALL', () => {
    const range = getTimeRangeFromPreset('ALL', data);
    expect(range).toEqual({ from: '2020-01-01', to: '2025-01-01' });
  });
  
  it('returns last year for 1Y', () => {
    const range = getTimeRangeFromPreset('1Y', data);
    expect(range.to).toBe('2025-01-01');
    expect(range.from).toBe('2024-01-01');
  });
});
```

### 13.2 Component Tests

**File:** `components/charts/lightweight/__tests__/ProjectionChart.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectionChart } from '../ProjectionChart';

// Mock lightweight-charts since it requires canvas
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    applyOptions: vi.fn(),
    addAreaSeries: vi.fn(() => ({
      setData: vi.fn(),
      applyOptions: vi.fn(),
      createPriceLine: vi.fn(),
    })),
    addLineSeries: vi.fn(() => ({
      setData: vi.fn(),
      applyOptions: vi.fn(),
    })),
    timeScale: vi.fn(() => ({
      fitContent: vi.fn(),
      setVisibleRange: vi.fn(),
      subscribeVisibleTimeRangeChange: vi.fn(),
      unsubscribeVisibleTimeRangeChange: vi.fn(),
    })),
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
    removeSeries: vi.fn(),
    remove: vi.fn(),
  })),
  ColorType: { Solid: 'solid' },
  LineStyle: { Solid: 0, Dashed: 1, Dotted: 2 },
  CrosshairMode: { Normal: 0, Magnet: 1 },
}));

describe('ProjectionChart', () => {
  const mockData = [
    { time: '2024-01-01', value: 100000 },
    { time: '2024-02-01', value: 105000 },
    { time: '2024-03-01', value: 110000 },
  ];
  
  it('renders without crashing', () => {
    render(
      <ProjectionChart
        data={mockData}
        scenarioName="Test Scenario"
      />
    );
    
    // Chart controls should be visible
    expect(screen.getByText('Test Scenario')).toBeInTheDocument();
  });
  
  it('renders with goals', () => {
    render(
      <ProjectionChart
        data={mockData}
        scenarioName="Test Scenario"
        goals={[
          { id: 'goal-1', label: 'Retirement', value: 500000, color: '#10b981' },
        ]}
      />
    );
    
    // Goal should appear in legend
    expect(screen.getByText('Retirement')).toBeInTheDocument();
  });
});
```

### 13.3 Visual Regression Tests

Use Playwright or Chromatic for visual testing:

```typescript
// e2e/charts.spec.ts
import { test, expect } from '@playwright/test';

test('projection chart renders correctly', async ({ page }) => {
  await page.goto('/scenarios/test-scenario');
  
  // Wait for chart to load
  await page.waitForSelector('.tv-lightweight-charts');
  
  // Take screenshot for visual comparison
  await expect(page.locator('.tv-lightweight-charts')).toHaveScreenshot('projection-chart.png');
});

test('chart Y-axis shows formatted currency', async ({ page }) => {
  await page.goto('/scenarios/test-scenario');
  
  // Wait for chart
  await page.waitForSelector('.tv-lightweight-charts');
  
  // Check Y-axis labels are formatted (not "000.00")
  const yAxisText = await page.textContent('.tv-lightweight-charts');
  
  // Should contain formatted values like "$400K" not "000.00"
  expect(yAxisText).not.toContain('000.00');
  expect(yAxisText).toMatch(/\$\d+K?/); // e.g., "$400K" or "$500K"
});
```

### 13.4 Manual Test Checklist

**Chart Rendering**
- [ ] Y-axis shows formatted currency ($100K, $500K, $1M)
- [ ] X-axis shows formatted dates (Jan '24, Feb '24)
- [ ] Area fill is visible and uses correct colors
- [ ] Baseline series (if present) uses dashed line
- [ ] Goal lines are visible with labels

**Interactions**
- [ ] Crosshair appears on hover
- [ ] Tooltip shows correct values
- [ ] Tooltip shows all visible series
- [ ] Mouse wheel zooms in/out
- [ ] Click and drag pans the chart
- [ ] Time range buttons work correctly
- [ ] Series toggle hides/shows series

**Responsiveness**
- [ ] Chart resizes on window resize
- [ ] Chart fits container width
- [ ] Controls wrap on narrow screens

**Dark Mode**
- [ ] Background is transparent (uses card background)
- [ ] Grid lines visible but subtle
- [ ] Text is readable
- [ ] Series colors have good contrast

---

## 14. Acceptance Criteria

### 14.1 Functional Requirements

- [ ] **Y-axis formatting** — All charts show properly formatted currency (e.g., "$400K", "$1.2M")
- [ ] **X-axis formatting** — All charts show formatted dates (e.g., "Jan '24")
- [ ] **Crosshair** — Moving mouse over chart shows crosshair with values
- [ ] **Tooltip** — Custom tooltip displays all series values at crosshair position
- [ ] **Goal lines** — Price lines render for goals with labels
- [ ] **Multi-series** — Baseline and scenario can be shown together
- [ ] **Series toggle** — User can show/hide individual series
- [ ] **Time range** — Preset buttons (1Y, 5Y, ALL) work correctly
- [ ] **Zoom** — Mouse wheel zooms in/out on time axis
- [ ] **Pan** — Click and drag pans the visible range

### 14.2 Visual Requirements

- [ ] **Theme integration** — Charts respect light/dark mode
- [ ] **Color consistency** — Series colors match design tokens
- [ ] **Professional appearance** — Charts look "financial grade"
- [ ] **No visual bugs** — No clipping, overflow, or rendering artifacts

### 14.3 Performance Requirements

- [ ] **Initial render** — Charts render in <100ms for 60 data points
- [ ] **Smooth interaction** — 60fps during pan/zoom
- [ ] **Large datasets** — 360 data points (30 years) renders without lag

### 14.4 Code Quality

- [ ] **TypeScript** — All components are fully typed
- [ ] **Tests** — Unit tests for data transformation, component tests for rendering
- [ ] **No Recharts on scenario pages** — Migration complete
- [ ] **Bundle size** — Chart bundle reduced by ~30KB

### 14.5 Accessibility

- [ ] **Keyboard navigation** — Arrow keys pan, +/- zoom
- [ ] **ARIA labels** — Chart container has descriptive label
- [ ] **External legend** — Legend readable outside canvas
- [ ] **Table alternative** — Option to view data as table

---

## Appendix A: File Checklist

Create these files in order:

```
[ ] components/charts/lightweight/types.ts
[ ] components/charts/lightweight/useChartTheme.ts
[ ] components/charts/lightweight/useChartData.ts
[ ] components/charts/lightweight/LightweightChart.tsx
[ ] components/charts/lightweight/ChartTooltip.tsx
[ ] components/charts/lightweight/ChartControls.tsx
[ ] components/charts/lightweight/ChartLegend.tsx
[ ] components/charts/lightweight/ProjectionChart.tsx
[ ] components/charts/lightweight/ComparisonChart.tsx
[ ] components/charts/lightweight/CashFlowChart.tsx
[ ] components/charts/lightweight/index.ts
[ ] lib/design-tokens.ts (update with CHART_COLORS)
```

---

## Appendix B: PR Description Template

```markdown
## TASK-19: Financial Chart System Overhaul (Lightweight Charts Migration)

This PR migrates financial projection charts from Recharts to TradingView's Lightweight Charts library.

### Why
- Fix Y-axis formatting bug ("000.00" display)
- Enable professional-grade chart interactions (crosshair, zoom, pan)
- Improve performance for long projections (30+ years)
- Add goal/threshold line visualization
- Reduce bundle size by ~30KB

### What Changed

#### New Components
- `LightweightChart` - Base chart wrapper
- `ProjectionChart` - Net worth projection
- `ComparisonChart` - Baseline vs scenario
- `CashFlowChart` - Income/expense/net
- `ChartTooltip` - Custom tooltip overlay
- `ChartControls` - Time range and series toggles
- `ChartLegend` - External legend

#### Supporting Code
- `types.ts` - Shared TypeScript definitions
- `useChartTheme.ts` - Dark/light mode theming
- `useChartData.ts` - Data transformation utilities
- Updated `lib/design-tokens.ts` with chart colors

### Testing
- [ ] Y-axis shows formatted currency on all charts
- [ ] Crosshair and tooltip work correctly
- [ ] Zoom/pan interactions are smooth
- [ ] Goal lines display with labels
- [ ] Dark mode renders correctly
- [ ] Performance verified with 360-month projections

### Screenshots
[Before/After comparison of chart rendering]
```

---

*End of TASK-19 Specification*
