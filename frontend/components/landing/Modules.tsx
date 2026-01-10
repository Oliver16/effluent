import { Gauge, Activity, GitBranch, BookOpen } from 'lucide-react'

const modules = [
  {
    icon: Gauge,
    title: 'Cockpit',
    subtitle: 'High-signal state view + confidence.',
    bullets: ['Core gauges that matter', 'Drift & staleness warnings'],
  },
  {
    icon: Activity,
    title: 'Flows',
    subtitle: 'The engine beneath the instruments.',
    bullets: ['Recurring income/expense mechanics', 'Traceable assumptions'],
  },
  {
    icon: GitBranch,
    title: 'Scenarios',
    subtitle: 'Control surfaces for decisions.',
    bullets: ['Branch baseline safely', 'Compare deltas across outcomes'],
  },
  {
    icon: BookOpen,
    title: 'Explanations',
    subtitle: 'Interrogate every signal.',
    bullets: ['Definitions + drivers', 'What changed and why'],
  },
]

export function Modules() {
  return (
    <section className="px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
      <ul className="space-y-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  )
}
