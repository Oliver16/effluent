'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { decisions } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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

interface DecisionPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DecisionPicker({ open, onOpenChange }: DecisionPickerProps) {
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['decision-templates'],
    queryFn: () => decisions.listTemplates(),
    enabled: open,
  })

  const handleSelectTemplate = (templateKey: string) => {
    onOpenChange(false)
    router.push(`/decisions/${templateKey}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Start a Decision</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading templates...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {data?.results?.map((group) => (
                <div key={group.category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-primary">
                      {categoryIcons[group.category] || <Calculator className="h-5 w-5" />}
                    </span>
                    <h3 className="font-semibold text-lg">{group.categoryDisplay}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.templates.map((template) => (
                      <Card
                        key={template.key}
                        className="p-4 cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
                        onClick={() => handleSelectTemplate(template.key)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-primary">
                            {templateIcons[template.icon] || <Calculator className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
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
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
