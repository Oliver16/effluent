'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity, GitBranch, Gauge, FileText } from 'lucide-react'

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
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          A financial cockpit for your household.
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Operational interface for your finances — a living model with instrumentation, confidence, and scenario control.
        </p>

        {/* Hero bullets */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <span>Baseline model + scenarios</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span>Confidence strip</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Explainable metrics</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button
            asChild
            size="xl"
            className="min-w-[200px] bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
            data-track="cta-launch-cockpit"
          >
            <Link href="/login">Launch the cockpit</Link>
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
        <div className="mt-16 relative animate-fade-in-delay">
          <div className="relative mx-auto max-w-3xl rounded-xl border border-slate-700/50 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-sm">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 aspect-[16/9] flex items-center justify-center">
              <div className="text-center text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Dashboard Preview</p>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-gradient-to-r from-primary via-transparent to-primary" />
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
