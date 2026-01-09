import Link from 'next/link'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline">
            &larr; Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: January 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Effluent.io, you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms,
              you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Use License</h2>
            <p>
              Permission is granted to temporarily use Effluent.io for personal, non-commercial
              financial planning purposes. This is the grant of a license, not a transfer of title.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Disclaimer</h2>
            <p>
              Effluent.io is a financial modeling tool and does not provide financial, tax, or
              investment advice. The information provided is for educational and planning purposes
              only. You should consult with qualified professionals before making financial decisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Limitations</h2>
            <p>
              In no event shall Effluent.io or its suppliers be liable for any damages arising out
              of the use or inability to use the materials on Effluent.io, even if we have been
              notified of the possibility of such damage.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Accuracy of Information</h2>
            <p>
              The materials appearing on Effluent.io could include technical, typographical, or
              photographic errors. We do not warrant that any of the materials are accurate,
              complete, or current. Tax calculations and financial projections are estimates only.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
