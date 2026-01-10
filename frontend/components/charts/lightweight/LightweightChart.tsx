'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  SeriesType,
  LineStyle,
  LineWidth,
  MouseEventParams,
  AreaSeries,
  LineSeries,
  BaselineSeries,
  HistogramSeries,
  Time,
} from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact } from '@/lib/format';
import { useChartTheme, useChartOptions } from './useChartTheme';
import { toLightweightData } from './useChartData';
import type { LightweightChartProps, TooltipData } from './types';

// Map our line style to LW Charts LineStyle enum
const LINE_STYLE_MAP: Record<string, LineStyle> = {
  solid: LineStyle.Solid,
  dashed: LineStyle.Dashed,
  dotted: LineStyle.Dotted,
};

/**
 * Make a color transparent (alpha = 0) for gradient bottom
 * Handles rgba(), rgb(), and hex colors
 */
function makeTransparent(color: string): string {
  // Handle rgba - replace alpha value with 0
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, ', 0)');
  }
  // Handle rgb - convert to rgba with 0 alpha
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', ', 0)');
  }
  // Handle hex - append 00 for transparency
  return `${color}00`;
}

/**
 * Make a color semi-transparent for gradient top (40% opacity)
 * Handles rgba(), rgb(), and hex colors
 */
function makeSemiTransparent(color: string): string {
  // Handle rgba - replace alpha value with 0.4
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, ', 0.4)');
  }
  // Handle rgb - convert to rgba with 0.4 alpha
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', ', 0.4)');
  }
  // Handle hex - append 40 for 25% opacity
  return `${color}40`;
}


export function LightweightChart({
  data,
  series,
  priceLines = [],
  height = 300,
  showTimeScale = true,
  showPriceScale = true,
  priceScalePosition = 'right',
  enableCrosshair = true,
  formatValue = formatCurrencyCompact,
  formatTime,
  onCrosshairMove,
  onTimeRangeChange,
  className,
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const priceLineRefs = useRef<
    Map<string, ReturnType<ISeriesApi<SeriesType>['createPriceLine']>>
  >(new Map());

  const theme = useChartTheme();
  const chartOptions = useChartOptions(theme, {
    height,
    showTimeScale,
    showPriceScale,
    priceScalePosition,
    enableCrosshair,
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
      priceLineRefs.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Create new series using the new v5 API
        switch (config.type) {
          case 'area':
            seriesApi = chart.addSeries(AreaSeries, {
              lineColor: config.color,
              topColor: config.fillColor ?? makeSemiTransparent(config.color),
              bottomColor: makeTransparent(config.fillColor ?? config.color),
              lineWidth: (config.lineWidth ?? 2) as LineWidth,
              lineStyle: LINE_STYLE_MAP[config.lineStyle ?? 'solid'],
              priceScaleId: config.priceScaleId ?? 'right',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            break;

          case 'line':
            seriesApi = chart.addSeries(LineSeries, {
              color: config.color,
              lineWidth: (config.lineWidth ?? 2) as LineWidth,
              lineStyle: LINE_STYLE_MAP[config.lineStyle ?? 'solid'],
              priceScaleId: config.priceScaleId ?? 'right',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            break;

          case 'baseline':
            seriesApi = chart.addSeries(BaselineSeries, {
              baseValue: { type: 'price', price: 0 },
              topLineColor: theme.upColor,
              topFillColor1: makeSemiTransparent(theme.upColor),
              topFillColor2: makeTransparent(theme.upColor),
              bottomLineColor: theme.downColor,
              bottomFillColor1: makeTransparent(theme.downColor),
              bottomFillColor2: makeSemiTransparent(theme.downColor),
              lineWidth: (config.lineWidth ?? 2) as LineWidth,
              priceScaleId: config.priceScaleId ?? 'right',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            break;

          case 'histogram':
            seriesApi = chart.addSeries(HistogramSeries, {
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
        // Data points may have additional fields beyond time/value for multi-series
        const seriesData = data.map((point) => {
          // Cast to allow dynamic key access for multi-series data
          const extendedPoint = point as unknown as Record<string, unknown>;
          const dataKeyValue = extendedPoint[config.dataKey];
          return {
            time: point.time,
            value:
              typeof dataKeyValue === 'number' ? dataKeyValue : point.value ?? 0,
          };
        });

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

    // Remove old price lines
    priceLineRefs.current.forEach((priceLine) => {
      primarySeries.removePriceLine(priceLine);
    });
    priceLineRefs.current.clear();

    // Create new price lines
    priceLines.forEach((line) => {
      const priceLine = primarySeries.createPriceLine({
        price: line.value,
        color: line.color,
        lineWidth: (line.lineWidth ?? 1) as LineWidth,
        lineStyle: LINE_STYLE_MAP[line.lineStyle ?? 'dashed'],
        axisLabelVisible: line.axisLabelVisible ?? true,
        title: line.label,
      });
      priceLineRefs.current.set(line.id, priceLine);
    });
  }, [priceLines, series]);

  // Subscribe to crosshair move
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onCrosshairMove) return;

    const handler = (param: MouseEventParams) => {
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
        if (seriesData && 'value' in seriesData && seriesData.value !== undefined) {
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
      const timeStr =
        typeof param.time === 'string'
          ? param.time
          : typeof param.time === 'number'
            ? new Date(param.time * 1000).toISOString().split('T')[0]
            : `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}`;

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
      const visibleRange = chart.timeScale().getVisibleRange();
      if (visibleRange) {
        const from =
          typeof visibleRange.from === 'string'
            ? visibleRange.from
            : typeof visibleRange.from === 'number'
              ? new Date(visibleRange.from * 1000).toISOString().split('T')[0]
              : `${visibleRange.from.year}-${String(visibleRange.from.month).padStart(2, '0')}-${String(visibleRange.from.day).padStart(2, '0')}`;
        const to =
          typeof visibleRange.to === 'string'
            ? visibleRange.to
            : typeof visibleRange.to === 'number'
              ? new Date(visibleRange.to * 1000).toISOString().split('T')[0]
              : `${visibleRange.to.year}-${String(visibleRange.to.month).padStart(2, '0')}-${String(visibleRange.to.day).padStart(2, '0')}`;

        onTimeRangeChange({ from, to });
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
      from: from as Time,
      to: to as Time,
    });
  }, []);

  const fitContent = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.timeScale().fitContent();
  }, []);

  return <div ref={containerRef} className={cn('w-full', className)} style={{ height }} />;
}
