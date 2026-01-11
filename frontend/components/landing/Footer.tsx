const footerLinks = {
  Product: ['Features', 'Pricing', 'Security'],
  Resources: ['Documentation', 'Help Center', 'API'],
  Company: ['About', 'Contact', 'Privacy'],
}

export function Footer() {
  return (
    <footer className="px-4 py-12 border-t border-border bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="font-bold text-lg text-foreground mb-2">Effluent</div>
            <p className="text-sm text-muted-foreground">
              Financial control plane for households.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm text-foreground mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((label) => (
                  <li key={label}>
                    <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Effluent. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
