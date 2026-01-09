'use client'

import { useState, useEffect } from 'react'
import { taxes } from '@/lib/api'
import type { TaxSummaryResponse, TaxStrategy } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, DollarSign, Lightbulb, ChevronRight } from 'lucide-react'

interface TaxSummaryProps {
  className?: string
  showStrategies?: boolean
}

export function TaxSummary({ className, showStrategies = true }: TaxSummaryProps) {
  const [data, setData] = useState<TaxSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTaxSummary()
  }, [])

  const loadTaxSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await taxes.summary()
      setData(response)
    } catch (err) {
      console.error('Failed to load tax summary:', err)
      setError('Unable to load tax information')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tax Summary</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tax Summary</CardTitle>
          <CardDescription className="text-red-600">
            {error || 'No tax data available'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={loadTaxSummary}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { summary, incomeSources, taxStrategies, filingStatus, stateOfResidence } = data

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Summary</CardTitle>
              <CardDescription>
                {filingStatus} | {stateOfResidence}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg">
              {summary.effectiveTaxRate}% effective rate
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Gross Income</p>
              <p className="text-xl font-semibold text-foreground">
                {formatCurrency(summary.totalGrossAnnual)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Taxes</p>
              <p className="text-xl font-semibold text-red-600">
                {formatCurrency(summary.totalTaxes)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pre-tax Deductions</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(summary.totalPretaxDeductions)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Net Annual</p>
              <p className="text-xl font-semibold">
                {formatCurrency(summary.totalNetAnnual)}
              </p>
            </div>
          </div>

          {/* Tax breakdown */}
          <div className="mt-6 pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium mb-3">Tax Breakdown</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Federal:</span>
                <span>{formatCurrency(summary.totalFederalWithholding)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">State:</span>
                <span>{formatCurrency(summary.totalStateWithholding)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FICA:</span>
                <span>{formatCurrency(summary.totalFica)}</span>
              </div>
            </div>
          </div>

          {/* Income sources */}
          {incomeSources.length > 1 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">By Income Source</h4>
              <div className="space-y-3">
                {incomeSources.map((source) => (
                  <div
                    key={source.sourceId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{source.sourceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {source.incomeType} | {(parseFloat(source.effectiveRate) * 100).toFixed(1)}% effective
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(source.grossAnnual)}</p>
                      <p className="text-sm text-muted-foreground">
                        Net: {formatCurrency(source.netAnnual)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax strategies */}
      {showStrategies && taxStrategies.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <CardTitle>Tax Optimization Opportunities</CardTitle>
            </div>
            <CardDescription>
              Strategies to reduce your tax burden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {taxStrategies.map((strategy) => (
              <TaxStrategyCard key={strategy.id} strategy={strategy} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TaxStrategyCard({ strategy }: { strategy: TaxStrategy }) {
  // Check if potentialSavings is a numeric value to determine formatting
  const savings = strategy.potentialSavings
  const isNumeric = !isNaN(parseFloat(savings)) && isFinite(parseFloat(savings))
  const formattedSavings = isNumeric ? `$${parseFloat(savings).toLocaleString()}` : savings

  return (
    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-yellow-600" />
          <h4 className="font-medium">{strategy.title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{strategy.description}</p>
        <p className="text-sm">
          Potential savings: <strong className="text-green-600">{formattedSavings}</strong>
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
  )
}
