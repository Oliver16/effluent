export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {children}
      </div>
    </div>
  )
}
