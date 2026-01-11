import { Briefcase, Home, Baby, GraduationCap, PiggyBank, TrendingUp } from 'lucide-react'

const categories = [
  { icon: Briefcase, label: 'Career', examples: 'New job, raise, layoff' },
  { icon: Home, label: 'Housing', examples: 'Buy, sell, relocate' },
  { icon: Baby, label: 'Family', examples: 'Baby, marriage, divorce' },
  { icon: GraduationCap, label: 'Education', examples: 'Grad school, pay off loans' },
  { icon: PiggyBank, label: 'Retirement', examples: 'Retire, boost 401(k)' },
  { icon: TrendingUp, label: 'Financial', examples: 'Side business, inheritance' },
]

export function LifeEvents() {
  return (
    <section className="px-4 py-14">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Model decisions as life events
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Don't build scenarios from scratch. Pick a life event template—it suggests all the related financial changes you'd otherwise forget.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map(({ icon: Icon, label, examples }) => (
            <div
              key={label}
              className="group flex flex-col items-center text-center p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{examples}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          28 templates across 7 categories. Each one pre-configures income, expense, asset, and debt changes.
        </p>
      </div>
    </section>
  )
}
