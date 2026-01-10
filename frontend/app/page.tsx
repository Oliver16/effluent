import type { Metadata } from 'next'
import {
  Hero,
  Problem,
  Modules,
  HowItWorks,
  Security,
  FAQ,
  FinalCTA,
  Footer,
} from '@/components/landing'

export const metadata: Metadata = {
  title: 'Effluent — Financial Cockpit',
  description: 'Operational HMI for household finance: baseline model, confidence, scenario control.',
  openGraph: {
    title: 'Effluent — Financial Cockpit',
    description: 'Operational HMI for household finance: baseline model, confidence, scenario control.',
    type: 'website',
    url: 'https://app.effluent.io',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Effluent — Financial Cockpit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Effluent — Financial Cockpit',
    description: 'Operational HMI for household finance: baseline model, confidence, scenario control.',
    images: ['/og.png'],
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Problem />
      <Modules />
      <HowItWorks />
      <Security />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  )
}
