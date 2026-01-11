'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Dark gradient background for cockpit feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in">
        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight">
          A financial control plane for your household.
        </h1>

        {/* Subheadline - tighter, less jargon */}
        <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
          Most finance apps show you the past. This one helps you see what's coming—and decide what to do about it.
        </p>

        {/* Hero bullets - simplified */}
        <div className="flex items-center justify-center gap-6 mb-8 text-sm text-slate-500">
          <span>Model your baseline</span>
          <span className="hidden sm:inline text-slate-700">·</span>
          <span>Run scenarios</span>
          <span className="hidden sm:inline text-slate-700">·</span>
          <span>Track confidence</span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Button
            asChild
            size="xl"
            className="min-w-[200px] bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
            data-track="cta-launch-cockpit"
          >
            <Link href="/login">Launch the control plane</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="xl"
            className="min-w-[200px] border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white"
            data-track="cta-watch-walkthrough"
          >
            <Link href="/demo">Watch walkthrough</Link>
          </Button>
        </div>

        {/* Instrument strip */}
        <InstrumentStrip />

        {/* Screenshot placeholder panel */}
        <div className="mt-12 relative animate-fade-in-delay">
          <div className="relative mx-auto max-w-2xl rounded-lg border border-slate-700/50 bg-slate-900/80 p-1.5 shadow-xl backdrop-blur-sm">
            <div className="rounded bg-slate-800/50 border border-slate-700/30 aspect-[16/9] flex items-center justify-center">
              <Activity className="w-8 h-8 text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function InstrumentStrip() {
  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
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
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${variantStyles[variant]}`}>
      <span className="text-slate-400">{label}:</span>
      <span>{value}</span>
    </div>
  )
}
