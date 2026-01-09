'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { decisions } from '@/lib/api'
import { ControlListLayout } from '@/components/layout/ControlListLayout'
import { Card } from '@/components/ui/card'
import { SystemAlert } from '@/components/ui/SystemAlert'
import { TYPOGRAPHY, SURFACE } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  MinusCircle,
  CreditCard,
  CheckCircle,
  RefreshCw,
  PlusCircle,
  Wallet,
  HeartPulse,
  Calculator,
  AlertCircle,
} from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  income: <TrendingUp className="h-5 w-5" />,
  expenses: <MinusCircle className="h-5 w-5" />,
  debt: <CreditCard className="h-5 w-5" />,
  housing: <Wallet className="h-5 w-5" />,
  retirement: <Calculator className="h-5 w-5" />,
  savings: <Wallet className="h-5 w-5" />,
}

const templateIcons: Record<string, React.ReactNode> = {
  'trending-up': <TrendingUp className="h-5 w-5" />,
  'minus-circle': <MinusCircle className="h-5 w-5" />,
  'credit-card': <CreditCard className="h-5 w-5" />,
  'check-circle': <CheckCircle className="h-5 w-5" />,
  'refresh-cw': <RefreshCw className="h-5 w-5" />,
  'plus-circle': <PlusCircle className="h-5 w-5" />,
  'piggy-bank': <Wallet className="h-5 w-5" />,
  'heart-pulse': <HeartPulse className="h-5 w-5" />,
  wallet: <Wallet className="h-5 w-5" />,
  calculator: <Calculator className="h-5 w-5" />,
}

export default function DecisionsPage() {
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['decision-templates'],
    queryFn: () => decisions.listTemplates(),
  })

  const handleSelectTemplate = (templateKey: string) => {
    router.push(`/decisions/${templateKey}`)
  }

  if (isLoading) {
    return (
      <ControlListLayout
        title="Decisions"
        subtitle="Model financial decisions and see how they impact your future"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading templates...</div>
        </div>
      </ControlListLayout>
    )
  }

  if (isError) {
    return (
      <ControlListLayout
        title="Decisions"
        subtitle="Model financial decisions and see how they impact your future"
      >
        <SystemAlert
          tone="critical"
          title="Error loading templates"
          description="Unable to load decision templates. Please try again later."
        />
      </ControlListLayout>
    )
  }

  return (
    <ControlListLayout
      title="Decisions"
      subtitle="Model financial decisions and see how they impact your future"
    >
      <div className="space-y-8">
        {data?.results?.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-primary">
                {categoryIcons[group.category] || <Calculator className="h-5 w-5" />}
              </span>
              <h2 className={TYPOGRAPHY.sectionTitle}>{group.categoryDisplay}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.templates.map((template) => (
                <Card
                  key={template.key}
                  className={cn(
                    SURFACE.card,
                    'p-5 cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTemplate(template.key)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template.key)}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-primary p-2 bg-primary/10 rounded-lg shrink-0">
                      {templateIcons[template.icon] || <Calculator className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ControlListLayout>
  )
}
