'use client'

import { Shield, Lock, TrendingUp } from 'lucide-react'
import type { StepProps } from './index'

export function WelcomeStep({}: StepProps) {
  return (
    <div className="text-center py-6 space-y-6">
      <p className="text-lg">
        Follow this guided workflow to design your model input parameters to
        supercharge your new financial planning engine.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 rounded-lg bg-muted/50">
          <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
          <h3 className="font-medium">Secure</h3>
          <p className="text-sm text-muted-foreground">
            AES-256 encryption at rest
          </p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <Lock className="h-8 w-8 mx-auto mb-2 text-primary" />
          <h3 className="font-medium">Private</h3>
          <p className="text-sm text-muted-foreground">
            TLS 1.3 in transit
          </p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
          <h3 className="font-medium">Powerful</h3>
          <p className="text-sm text-muted-foreground">
            Multi-year projections
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-4">
        This wizard will guide you through setting up your accounts, income,
        and expenses. You can skip optional sections and come back later.
      </p>
    </div>
  )
}
