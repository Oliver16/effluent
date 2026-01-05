export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4">
          <span className="text-primary-foreground font-bold text-2xl">E</span>
        </div>
        <h1 className="text-3xl font-bold">Effluent.io</h1>
        <p className="text-muted-foreground">Personal Finance Modeling</p>
      </div>
      {children}
    </div>
  )
}
