const footerLinks = {
  Produkt: [
    { label: "Funktionen", href: "#technology" },
    { label: "Demo", href: "#demo-scanner" },
    { label: "Preise", href: "#" },
    { label: "API", href: "#" },
  ],
  Unternehmen: [
    { label: "Über uns", href: "#" },
    { label: "Karriere", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Presse", href: "#" },
  ],
  Rechtliches: [
    { label: "Datenschutz", href: "#" },
    { label: "Impressum", href: "#" },
    { label: "AGB", href: "#" },
    { label: "Cookie-Richtlinie", href: "#" },
  ],
  Support: [
    { label: "Hilfe-Center", href: "#" },
    { label: "Kontakt", href: "#" },
    { label: "Status", href: "#" },
    { label: "Dokumentation", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-cyber-blue/10 bg-space-darker">
      <div className="section-padding max-w-7xl mx-auto">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full border border-cyber-blue/30 flex items-center justify-center glow-border">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    fill="none"
                    stroke="#00BFFF"
                    strokeWidth="1.5"
                  />
                  <circle cx="12" cy="12" r="3" fill="#00FFFF" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-[0.2em]">
                SYN<span className="text-cyber-blue">SIGHT</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-6">
              Die intelligente KI-Plattform zum Schutz Ihrer digitalen Identität.
              Entwickelt in Deutschland.
            </p>
            <div className="flex gap-4">
              {["X", "Li", "Gh"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center text-xs font-mono text-gray-500 hover:text-cyber-blue hover:border-cyber-blue/30 transition-all"
                  aria-label={social}
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-cyber-blue transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-cyber-blue/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600 font-mono">
            &copy; {new Date().getFullYear()} SynSight GmbH — synsight.de — Alle
            Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-mono text-gray-500">
              Alle Systeme operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
