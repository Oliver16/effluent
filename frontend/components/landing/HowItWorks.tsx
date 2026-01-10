import { Plus, Eye, Zap } from 'lucide-react'

const steps = [
  {
    icon: Plus,
    title: 'Initialize',
    description: 'Add flows, assets, liabilities.',
  },
  {
    icon: Eye,
    title: 'Observe',
    description: 'Monitor signals + confidence.',
  },
  {
    icon: Zap,
    title: 'Operate',
    description: 'Run scenarios and compare outcomes.',
  },
]

export function HowItWorks() {
  return (
    <section className="px-4 py-20 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 text-foreground animate-fade-in">
          Initialize → Observe → Operate
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <Step key={step.title} {...step} number={i + 1} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Step({
  icon: Icon,
  title,
  description,
  number,
  delay
}: {
  icon: typeof Plus
  title: string
  description: string
  number: number
  delay: number
}) {
  return (
    <div
      className="text-center animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
        <Icon className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
          {number}
        </span>
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
