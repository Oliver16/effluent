'use client'

import { CheckCircle, ArrowRight } from 'lucide-react'
import type { StepProps } from './index'

export function CompleteStep({}: StepProps) {
  return (
    <div className="text-center py-8 space-y-6">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-green-500" />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
        <p className="text-lg text-muted-foreground">
          Your financial profile is set up.
        </p>
      </div>

      <div className="space-y-4 text-left max-w-md mx-auto">
        <h3 className="font-medium">What&apos;s next?</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">View your dashboard</p>
              <p className="text-sm text-muted-foreground">
                See your net worth, cash flow, and financial health metrics
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Create scenarios</p>
              <p className="text-sm text-muted-foreground">
                Model major life decisions like buying a house or changing jobs
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Refine your data</p>
              <p className="text-sm text-muted-foreground">
                Add more detail in Settings to improve projection accuracy
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}
