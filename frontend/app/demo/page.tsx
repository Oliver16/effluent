import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Demo — Effluent',
  description: 'Watch a walkthrough of Effluent, the financial cockpit for your household.',
}

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center">
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Watch the walkthrough
        </h1>
        <p className="text-muted-foreground mb-8">
          See how Effluent transforms household finances into an operational system.
        </p>

        {/* Video placeholder */}
        <div className="relative aspect-video rounded-xl border border-border bg-muted/50 overflow-hidden mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary/20 transition-colors">
              <Play className="w-6 h-6 ml-1" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
            Video coming soon
          </div>
        </div>

        <Button asChild>
          <Link href="/login">
            Launch the cockpit
          </Link>
        </Button>
      </div>
    </main>
  )
}
