import { Gauge, Activity, GitBranch, BookOpen } from 'lucide-react'

const modules = [
  {
    icon: Gauge,
    title: 'Cockpit',
    subtitle: 'High-signal state view + confidence.',
    bullets: ['Stress tests with resilience scoring', 'Goal tracking + solver'],
  },
  {
    icon: Activity,
    title: 'Flows',
    subtitle: 'The engine beneath the instruments.',
    bullets: ['Context-aware cash flow mechanics', 'Tax-integrated paycheck modeling'],
  },
  {
    icon: GitBranch,
    title: 'Scenarios',
    subtitle: 'Life-event driven what-if modeling.',
    bullets: ['28 templates: job, baby, home...', 'Branch, merge, compare outcomes'],
  },
  {
    icon: BookOpen,
    title: 'Explanations',
    subtitle: 'Interrogate every signal.',
    bullets: ['Driver decomposition across scenarios', 'What changed and why'],
  },
]

export function Modules() {
  return (
    <section className="border-t border-border">
      <div className="px-6 sm:px-8 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
            What's inside
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-16 tracking-[-0.02em] max-w-2xl">
            Four modules. One model.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {modules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>

          <p className="text-muted-foreground mt-12 max-w-2xl">
            Plus: asset groups with LTV tracking, dual-basis net worth, household sharing, and full data export.
          </p>
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
}: {
  icon: typeof Gauge
  title: string
  subtitle: string
  bullets: string[]
}) {
  return (
    <div className="group">
      <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground mb-4">{subtitle}</p>
      <ul className="space-y-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  )
}
