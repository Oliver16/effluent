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
    <section className="px-4 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Start from a life event, not a blank slate
        </h2>
        <p className="text-muted-foreground mb-6">
          Each template pre-configures the income, expense, asset, and debt changes you'd otherwise forget.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {events.map((event) => (
            <span
              key={event}
              className="px-3 py-1.5 text-sm bg-muted rounded-full text-muted-foreground"
            >
              {event}
            </span>
          ))}
          <span className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full">
            +13 more
          </span>
        </div>
      </div>
    </section>
  )
}
