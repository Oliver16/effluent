import type { Metadata } from 'next'
import {
  Hero,
  Modules,
  Security,
  FAQ,
  Footer,
} from '@/components/landing'

export const metadata: Metadata = {
  title: 'Effluent — Financial Control Plane',
  description: 'Operational HMI for household finance: baseline model, confidence, scenario control.',
  openGraph: {
    title: 'Effluent — Financial Control Plane',
    description: 'Operational HMI for household finance: baseline model, confidence, scenario control.',
    type: 'website',
    url: 'https://app.effluent.io',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Effluent — Financial Control Plane',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Effluent — Financial Control Plane',
    description: 'Operational HMI for household finance: baseline model, confidence, scenario control.',
    images: ['/og.png'],
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Modules />
      <Security />
      <FAQ />
      <Footer />
    </main>
  )
}
