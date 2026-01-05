import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Decimal from 'decimal.js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: string | number | Decimal, currency = 'USD'): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : value.toNumber()
  if (isNaN(num)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(0)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num)
}

export function formatPercent(value: string | number | Decimal, decimals = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : value.toNumber()
  if (isNaN(num)) {
    return '0.0%'
  }
  return `${(num * 100).toFixed(decimals)}%`
}

export function formatNumber(value: string | number, decimals = 0): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '0'
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatDecimal(value: string | number | Decimal, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : value.toNumber()
  if (isNaN(num)) {
    return '0.00'
  }
  return num.toFixed(decimals)
}

export function getMetricStatus(
  value: number,
  warningThreshold: number,
  criticalThreshold: number,
  comparison: 'lt' | 'gt'
): 'good' | 'warning' | 'critical' {
  if (comparison === 'lt') {
    if (value < criticalThreshold) return 'critical'
    if (value < warningThreshold) return 'warning'
    return 'good'
  } else {
    if (value > criticalThreshold) return 'critical'
    if (value > warningThreshold) return 'warning'
    return 'good'
  }
}

export const metricStatusColors = {
  good: 'text-green-600 bg-green-50',
  warning: 'text-amber-600 bg-amber-50',
  critical: 'text-red-600 bg-red-50',
}
