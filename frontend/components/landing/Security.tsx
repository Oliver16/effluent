import { Lock, Database, Shield, Users } from 'lucide-react'

const features = [
  { icon: Lock, label: 'TLS encryption in transit' },
  { icon: Database, label: 'Database encryption at rest' },
  { icon: Shield, label: 'Sensitive field encryption' },
  { icon: Users, label: 'Household-scoped access control' },
]

export function Security() {
  return (
    <section className="px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-border bg-card/50 p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Security
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-foreground">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
