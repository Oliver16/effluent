import { Gauge, Activity, GitBranch, BookOpen } from 'lucide-react'

const modules = [
  {
    icon: Gauge,
    title: 'Cockpit',
    subtitle: 'See where you stand at a glance.',
    bullets: ['Net worth, runway, burn rate', 'Alerts when data gets stale'],
  },
  {
    icon: Activity,
    title: 'Flows',
    subtitle: 'Model recurring income and expenses.',
    bullets: ['Paycheck, rent, subscriptions', 'See how they compound over time'],
  },
  {
    icon: GitBranch,
    title: 'Scenarios',
    subtitle: 'Ask "what if" without breaking anything.',
    bullets: ['Fork your baseline', 'Compare different futures side-by-side'],
  },
  {
    icon: BookOpen,
    title: 'Explanations',
    subtitle: 'Understand why numbers changed.',
    bullets: ['Click any metric for details', 'Trace changes back to their source'],
  },
]

export function Modules() {
  return (
    <section className="px-4 py-16 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-center text-foreground mb-10">
          What's inside
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modules.map((module, i) => (
            <ModuleCard key={module.title} {...module} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ModuleCard({
  icon: Icon,
  title,
  subtitle,
  bullets,
  delay
}: {
  icon: typeof Gauge
  title: string
  subtitle: string
  bullets: string[]
  delay: number
}) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 inline-flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="font-semibold mb-1 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{subtitle}</p>
      <ul className="space-y-1.5">
        {bullets.map((bullet) => (
          <li key={bullet} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  )
}
