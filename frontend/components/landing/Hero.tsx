'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 sm:px-8 md:px-12 lg:px-20 py-24 overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Main headline - much larger, tighter tracking */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 tracking-[-0.04em] leading-[1.05]">
          A financial control plane for your household.
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Operational interface for your finances — a living model with instrumentation, confidence, and scenario control.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button
            asChild
            size="xl"
            className="min-w-[220px] bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 text-base"
            data-track="cta-launch-cockpit"
          >
            <Link href="/login">Launch the control plane</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="xl"
            className="min-w-[220px] border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white text-base"
            data-track="cta-watch-walkthrough"
          >
            <Link href="/demo">Watch walkthrough</Link>
          </Button>
        </div>

        {/* Instrument strip */}
        <InstrumentStrip />

        {/* Screenshot placeholder panel */}
        <div className="mt-16 relative">
          <div className="relative mx-auto max-w-4xl rounded-xl border border-slate-700/50 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-sm">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 aspect-[16/9] flex items-center justify-center">
              <Activity className="w-10 h-10 text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function InstrumentStrip() {
  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-3 px-5 py-3 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
      <Chip label="Confidence" value="82%" variant="success" />
      <Chip label="Drift" value="2 signals" variant="warning" />
      <Chip label="Scenario Δ" value="+$4.2k runway" variant="info" />
    </div>
  )
}

function Chip({ label, value, variant }: { label: string; value: string; variant: 'success' | 'warning' | 'info' }) {
  const variantStyles = {
    success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    warning: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    info: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${variantStyles[variant]}`}>
      <span className="text-slate-400">{label}:</span>
      <span>{value}</span>
    </div>
  )
}
