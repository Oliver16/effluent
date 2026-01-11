const events = [
  'New job', 'Raise', 'Layoff',
  'Buy home', 'Sell home', 'Relocate',
  'Baby', 'Marriage', 'Divorce',
  'Grad school', 'Pay off loans',
  'Retire', 'Boost 401(k)',
  'Side business', 'Inheritance',
]

export function LifeEvents() {
  return (
    <section className="border-t border-border">
      <div className="px-6 sm:px-8 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
              Life events
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-[-0.02em]">
              Start from a template, not a blank slate.
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Each template pre-configures the income, expense, asset, and debt changes you'd otherwise forget.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {events.map((event) => (
              <span
                key={event}
                className="px-4 py-2 text-base bg-muted rounded-full text-foreground"
              >
                {event}
              </span>
            ))}
            <span className="px-4 py-2 text-base bg-primary/10 text-primary rounded-full font-medium">
              +13 more
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
