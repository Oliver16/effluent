'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'
import type { StepProps } from './index'

export function ReviewStep({ formData }: StepProps) {
  const members = (formData.members as Array<{ name: string }>) || []
  const sources = (formData.sources as Array<{ name: string; salary: string }>) || []
  const accounts = (formData.accounts as Array<{ name: string; balance: string }>) || []

  // Calculate totals
  const totalIncome = sources.reduce((sum, s) => sum + Number(s.salary || 0), 0)
  const totalBankBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0)

  const sections = [
    {
      title: 'Household',
      items: [
        { label: 'Name', value: formData.name as string || 'Not set' },
        { label: 'Members', value: `${members.length} member(s)` },
        { label: 'Filing Status', value: formData.filing_status as string || 'Not set' },
        { label: 'State', value: formData.state as string || 'Not set' },
      ],
    },
    {
      title: 'Income',
      items: [
        { label: 'Income Sources', value: `${sources.length} source(s)` },
        { label: 'Total Annual Income', value: `$${totalIncome.toLocaleString()}` },
      ],
    },
    {
      title: 'Assets',
      items: [
        { label: 'Bank Accounts', value: `${accounts.length} account(s)` },
        { label: 'Total Cash', value: `$${totalBankBalance.toLocaleString()}` },
      ],
    },
  ]

  const hasMinimumData = formData.name && members.length > 0

  return (
    <div className="space-y-6">
      <div className={`flex items-start gap-3 p-4 rounded-lg ${hasMinimumData ? 'bg-green-50 dark:bg-green-950' : 'bg-yellow-50 dark:bg-yellow-950'}`}>
        {hasMinimumData ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-800 dark:text-green-200">Ready to complete!</p>
              <p className="text-green-700 dark:text-green-300 mt-1">
                Review your information below. You can always update it later in Settings.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Some information missing</p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                You can continue, but adding more data will improve your projections.
              </p>
            </div>
          </>
        )}
      </div>

      {sections.map((section) => (
        <div key={section.title} className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">{section.title}</h3>
          <div className="space-y-2">
            {section.items.map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-sm text-muted-foreground text-center">
        Click Continue to finish onboarding and go to your dashboard.
      </p>
    </div>
  )
}
