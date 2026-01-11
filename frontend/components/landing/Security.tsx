import { Lock, Database, Shield, Users } from 'lucide-react'

const features = [
  { icon: Lock, label: 'TLS encryption in transit' },
  { icon: Database, label: 'Database encryption at rest' },
  { icon: Shield, label: 'Sensitive field encryption' },
  { icon: Users, label: 'Household-scoped access control' },
]

export function Security() {
  return (
    <section className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
