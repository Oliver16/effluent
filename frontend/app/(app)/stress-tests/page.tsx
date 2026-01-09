'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { stressTests } from '@/lib/api'
import { StressTestCategory } from '@/lib/types'
import { ControlListLayout } from '@/components/layout/ControlListLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SystemAlert } from '@/components/ui/SystemAlert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TYPOGRAPHY, SURFACE } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import {
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  Zap,
  Play,
  FlaskConical,
} from 'lucide-react'

const categoryIcons: Record<StressTestCategory, React.ReactNode> = {
  income: <TrendingDown className="h-5 w-5" />,
  expense: <DollarSign className="h-5 w-5" />,
  interest_rate: <Percent className="h-5 w-5" />,
  market: <BarChart3 className="h-5 w-5" />,
  inflation: <Zap className="h-5 w-5" />,
}

const categoryLabels: Record<StressTestCategory, string> = {
  income: 'Income Shocks',
  expense: 'Expense Spikes',
  interest_rate: 'Interest Rate Changes',
  market: 'Market Downturns',
  inflation: 'Inflation Scenarios',
}

const categoryDescriptions: Record<StressTestCategory, string> = {
  income: 'Test how income reductions affect your financial health',
  expense: 'Simulate unexpected expense increases',
  interest_rate: 'Model the impact of rising interest rates',
  market: 'Evaluate resilience to investment portfolio drops',
  inflation: 'See how inflation spikes affect your projections',
}

export default function StressTestsPage() {
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stress-test-templates'],
    queryFn: () => stressTests.list(),
  })

  // Group tests by category
  const testsByCategory = data?.tests?.reduce(
    (acc, test) => {
      if (!acc[test.category]) {
        acc[test.category] = []
      }
      acc[test.category].push(test)
      return acc
    },
    {} as Record<StressTestCategory, typeof data.tests>
  )

  if (isLoading) {
    return (
      <ControlListLayout
        title="Stress Tests"
        subtitle="Evaluate your financial resilience under various scenarios"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading stress tests...</div>
        </div>
      </ControlListLayout>
    )
  }

  if (isError) {
    return (
      <ControlListLayout
        title="Stress Tests"
        subtitle="Evaluate your financial resilience under various scenarios"
      >
        <SystemAlert
          tone="critical"
          title="Error loading stress tests"
          description="Unable to load stress test templates. Please try again later."
        />
      </ControlListLayout>
    )
  }

  return (
    <ControlListLayout
      title="Stress Tests"
      subtitle="Evaluate your financial resilience under various scenarios"
      actions={
        <Button asChild>
          <Link href="/stress-tests/new">
            <Play className="h-4 w-4 mr-2" />
            Run Tests
          </Link>
        </Button>
      }
    >
      {/* Overview Card */}
      <Card className={cn(SURFACE.card, 'p-6 mb-6')}>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className={TYPOGRAPHY.sectionTitle}>Financial Flight Simulator</h2>
            <p className="text-muted-foreground mt-1">
              Stress tests help you understand how your finances would hold up under
              adverse conditions. Run tests individually or batch them together to get
              a comprehensive resilience score.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div className="text-sm">
                <span className="font-medium">{data?.count || 0}</span>{' '}
                <span className="text-muted-foreground">tests available</span>
              </div>
              <div className="text-sm text-muted-foreground">|</div>
              <div className="text-sm">
                <span className="font-medium">{Object.keys(testsByCategory || {}).length}</span>{' '}
                <span className="text-muted-foreground">categories</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tests by Category */}
      <div className="space-y-8">
        {testsByCategory &&
          Object.entries(testsByCategory).map(([category, tests]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-primary">
                  {categoryIcons[category as StressTestCategory]}
                </span>
                <h2 className={TYPOGRAPHY.sectionTitle}>
                  {categoryLabels[category as StressTestCategory]}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {categoryDescriptions[category as StressTestCategory]}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map((test) => (
                  <Card
                    key={test.key}
                    className={cn(
                      SURFACE.card,
                      'p-5 hover:border-primary hover:bg-accent/50 transition-colors'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{test.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {test.description}
                        </p>
                      </div>
                      <StatusBadge
                        status={test.severity === 'critical' ? 'critical' : 'warning'}
                        statusLabel={test.severity}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Empty State */}
      {(!data?.tests || data.tests.length === 0) && (
        <div className="text-center py-12">
          <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">No stress tests available</h3>
          <p className="text-muted-foreground">
            Stress tests will appear here once configured.
          </p>
        </div>
      )}
    </ControlListLayout>
  )
}
