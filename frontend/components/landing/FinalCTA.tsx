import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function FinalCTA() {
  return (
    <section className="px-4 py-12">
      <div className="max-w-2xl mx-auto text-center animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-foreground">
          Stop managing finances like a ledger. Operate them like a system.
        </h2>
        <Button
          asChild
          size="xl"
          className="min-w-[200px]"
          data-track="cta-final-launch"
        >
          <Link href="/login">Launch the control plane</Link>
        </Button>
      </div>
    </section>
  )
}
