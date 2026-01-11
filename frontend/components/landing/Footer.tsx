export function Footer() {
  return (
    <footer className="px-4 py-8 border-t border-border">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Effluent</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-foreground cursor-pointer">Privacy</span>
          <span className="hover:text-foreground cursor-pointer">Terms</span>
        </div>
      </div>
    </footer>
  )
}
