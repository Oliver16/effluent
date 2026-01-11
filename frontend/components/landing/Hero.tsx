'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 sm:px-8 md:px-12 lg:px-20 py-24 overflow-hidden">
      {/* Dark base */}
      <div className="absolute inset-0 bg-slate-950" />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-r from-violet-600/20 to-indigo-600/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-cyan-600/15 to-blue-600/15 blur-[120px] animate-pulse-slow animation-delay-2000" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-primary/10 to-violet-600/10 blur-[100px] animate-pulse-slow animation-delay-4000" />
      </div>

      {/* Grid pattern with fade */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      {/* Radial gradient spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.15)_0%,_transparent_50%)]" />

      {/* Geometric accents */}
      <svg className="absolute top-20 left-10 w-20 h-20 text-slate-800/50 animate-float" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="absolute bottom-32 right-16 w-16 h-16 text-slate-800/50 animate-float animation-delay-2000" viewBox="0 0 100 100">
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(45 50 50)" />
      </svg>
      <svg className="absolute top-1/3 right-20 w-12 h-12 text-primary/20 animate-float animation-delay-4000" viewBox="0 0 100 100">
        <polygon points="50,10 90,90 10,90" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Main headline */}
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

        {/* Dashboard mockup */}
        <div className="mt-16 relative">
          {/* Glow behind the mockup */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent blur-2xl -z-10 translate-y-8" />

          <div className="relative mx-auto max-w-4xl rounded-xl border border-slate-700/50 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-sm">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <div className="w-3 h-3 rounded-full bg-slate-700" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 bg-slate-800 rounded-md max-w-xs mx-auto" />
              </div>
            </div>

            {/* App content mockup */}
            <div className="rounded-b-lg bg-slate-800/50 p-6 aspect-[16/9]">
              <div className="h-full grid grid-cols-4 gap-4">
                {/* Sidebar */}
                <div className="col-span-1 space-y-3">
                  <div className="h-8 bg-slate-700/50 rounded-md" />
                  <div className="h-6 bg-slate-700/30 rounded-md w-3/4" />
                  <div className="h-6 bg-slate-700/30 rounded-md w-2/3" />
                  <div className="h-6 bg-primary/30 rounded-md" />
                  <div className="h-6 bg-slate-700/30 rounded-md w-4/5" />
                </div>
                {/* Main content */}
                <div className="col-span-3 space-y-4">
                  {/* Top metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-20 bg-slate-700/30 rounded-lg p-3">
                      <div className="h-3 bg-slate-600/50 rounded w-1/2 mb-2" />
                      <div className="h-6 bg-emerald-500/30 rounded w-3/4" />
                    </div>
                    <div className="h-20 bg-slate-700/30 rounded-lg p-3">
                      <div className="h-3 bg-slate-600/50 rounded w-1/2 mb-2" />
                      <div className="h-6 bg-amber-500/30 rounded w-2/3" />
                    </div>
                    <div className="h-20 bg-slate-700/30 rounded-lg p-3">
                      <div className="h-3 bg-slate-600/50 rounded w-1/2 mb-2" />
                      <div className="h-6 bg-sky-500/30 rounded w-4/5" />
                    </div>
                  </div>
                  {/* Chart area */}
                  <div className="flex-1 bg-slate-700/20 rounded-lg p-4 h-32">
                    <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,80 Q50,70 100,60 T200,40 T300,50 T400,20"
                        fill="none"
                        stroke="rgb(99, 102, 241)"
                        strokeWidth="2"
                        className="animate-draw"
                      />
                      <path
                        d="M0,80 Q50,70 100,60 T200,40 T300,50 T400,20 V100 H0 Z"
                        fill="url(#chartGradient)"
                      />
                    </svg>
                  </div>
                </div>
              </div>
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
