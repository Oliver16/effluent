import { Lock, Database, Shield, Users } from 'lucide-react'

const features = [
  { icon: Lock, label: 'TLS encryption in transit' },
  { icon: Database, label: 'Database encryption at rest' },
  { icon: Shield, label: 'Sensitive field encryption' },
  { icon: Users, label: 'Household-scoped access control' },
]

export function Security() {
  return (
    <section className="border-t border-border">
      <div className="px-6 sm:px-8 md:px-12 lg:px-20 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
