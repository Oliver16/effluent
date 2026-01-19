'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { stressTests } from '@/lib/api'
import {
  StressTestTemplate,
  StressTestBatchResponse,
  StressTestCategory,
} from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { StatusBadge, Status } from '@/components/ui/StatusBadge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

const categoryIcons: Record<StressTestCategory, React.ReactNode> = {
  income: <TrendingDown className="h-5 w-5" />,
  expense: <DollarSign className="h-5 w-5" />,
  interest_rate: <Percent className="h-5 w-5" />,
  market: <BarChart3 className="h-5 w-5" />,
  inflation: <Zap className="h-5 w-5" />,
}

const categoryLabels: Record<StressTestCategory, string> = {
  income: 'Income',
  expense: 'Expense',
  interest_rate: 'Interest Rate',
  market: 'Market',
  inflation: 'Inflation',
}

function getStatusFromResult(status: 'passed' | 'warning' | 'failed'): Status {
  switch (status) {
    case 'passed':
      return 'good'
    case 'warning':
      return 'warning'
    case 'failed':
      return 'critical'
    default:
      return 'neutral'
  }
}

function getStatusLabel(status: 'passed' | 'warning' | 'failed'): string {
  switch (status) {
    case 'passed':
      return 'Passed'
    case 'warning':
      return 'Warning'
    case 'failed':
      return 'Failed'
    default:
      return 'Unknown'
  }
}

function getStatusIcon(status: 'passed' | 'warning' | 'failed') {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />
  }
}

export default function StressTestsNewPage() {
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<StressTestBatchResponse | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stress-test-templates'],
    queryFn: () => stressTests.list(),
  })

  const runMutation = useMutation({
    mutationFn: (testKeys: string[]) => stressTests.batch(testKeys),
    onSuccess: (data) => {
      setResults(data)
    },
  })

  const handleToggleTest = (testKey: string) => {
    const newSelected = new Set(selectedTests)
    if (newSelected.has(testKey)) {
      newSelected.delete(testKey)
    } else {
      newSelected.add(testKey)
    }
    setSelectedTests(newSelected)
  }

  const handleSelectAll = () => {
    if (!data?.tests) return
    if (selectedTests.size === data.tests.length) {
      setSelectedTests(new Set())
    } else {
      setSelectedTests(new Set(data.tests.map((t) => t.key)))
    }
  }

  const handleRunTests = () => {
    const testKeys = Array.from(selectedTests)
    runMutation.mutate(testKeys.length > 0 ? testKeys : [])
  }

  const handleReset = () => {
    setResults(null)
    setSelectedTests(new Set())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading stress tests...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Run Stress Tests</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading stress tests</AlertTitle>
          <AlertDescription>
            Unable to load stress test templates. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Group tests by category
  const testsByCategory = data?.tests?.reduce(
    (acc, test) => {
      if (!acc[test.category]) {
        acc[test.category] = []
      }
      acc[test.category].push(test)
      return acc
    },
    {} as Record<StressTestCategory, StressTestTemplate[]>
  )

  // Show results if we have them
  if (results) {
    const { summary } = results
    const resilienceColor =
      summary.resilienceScore >= 80
        ? 'text-emerald-500'
        : summary.resilienceScore >= 50
          ? 'text-amber-500'
          : 'text-red-500'

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stress Test Results</h1>
            <p className="text-muted-foreground mt-1">
              {summary.totalTests} tests completed
            </p>
          </div>
          <Button onClick={handleReset} variant="outline">
            Run New Tests
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resilience Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${resilienceColor}`}>
                {summary.resilienceScore}%
              </div>
              <Progress
                value={summary.resilienceScore}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Passed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-500">
                {summary.passed}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">
                {summary.warning}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">
                {summary.failed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.results.map((result) => (
                <div
                  key={result.testKey}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.summary.status)}
                    <div>
                      <div className="font-medium">{result.testName}</div>
                      <div className="text-sm text-muted-foreground">
                        Min liquidity: {result.summary.minLiquidityMonths.toFixed(1)} months
                        {result.summary.firstNegativeCashFlowMonth && (
                          <span className="ml-2">
                            | First negative cash flow: Month {result.summary.firstNegativeCashFlowMonth}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge
                    status={getStatusFromResult(result.summary.status)}
                    statusLabel={getStatusLabel(result.summary.status)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Errors if any */}
        {results.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Some tests failed to run</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc list-inside">
                {results.errors.map((err) => (
                  <li key={err.testKey}>
                    {err.testKey}: {err.error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Run Stress Tests</h1>
        <p className="text-muted-foreground mt-1">
          Select stress tests to evaluate your financial resilience under various scenarios.
        </p>
      </div>

      {/* Select All / Run Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={data?.tests && selectedTests.size === data.tests.length}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="text-sm cursor-pointer">
            Select All ({data?.tests?.length || 0} tests)
          </Label>
        </div>
        <Button
          onClick={handleRunTests}
          disabled={runMutation.isPending}
        >
          {runMutation.isPending ? (
            'Running...'
          ) : selectedTests.size === 0 ? (
            `Run All Tests (${data?.tests?.length || 0})`
          ) : (
            `Run ${selectedTests.size} Selected Test${selectedTests.size === 1 ? '' : 's'}`
          )}
        </Button>
      </div>

      {runMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error running stress tests</AlertTitle>
          <AlertDescription>
            {runMutation.error instanceof Error
              ? runMutation.error.message
              : 'Unable to run stress tests. Please try again or contact support.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Tests by Category */}
      <div className="space-y-8">
        {testsByCategory &&
          Object.entries(testsByCategory).map(([category, tests]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary">
                  {categoryIcons[category as StressTestCategory]}
                </span>
                <h2 className="font-semibold text-lg">
                  {categoryLabels[category as StressTestCategory]}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map((test) => (
                  <Card
                    key={test.key}
                    className={`p-5 cursor-pointer transition-colors ${
                      selectedTests.has(test.key)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleToggleTest(test.key)}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedTests.has(test.key)}
                        onCheckedChange={() => handleToggleTest(test.key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{test.name}</h3>
                          <StatusBadge
                            status={test.severity === 'critical' ? 'critical' : 'warning'}
                            statusLabel={test.severity}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {test.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
