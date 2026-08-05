const footerLinks = {
  Produkt: [
    { label: "Plattform", href: "/#platform" },
    { label: "Risiko-Check", href: "/#demo-scanner" },
    { label: "Alle Analysen", href: "/analysen" },
    { label: "Schutzpaket", href: "/#protect-package" },
  ],
  Analysen: [
    { label: "Google-Analyse", href: "/google-analyse" },
    { label: "Username-Suche", href: "/username-suche" },
    { label: "Digital Footprint", href: "/digital-footprint" },
    { label: "Datenleck prüfen", href: "/datenleck-pruefen" },
    { label: "OSINT-Analyse", href: "/osint-analyse" },
  ],
  Unternehmen: [
    { label: "Hilfe & FAQ", href: "/hilfe" },
    { label: "Blog", href: "/blog" },
    { label: "Kontakt", href: "mailto:hello@synsight.de" },
    { label: "Partnerschaften", href: "mailto:hello@synsight.de?subject=Partnerschaft" },
  ],
  Rechtliches: [
    { label: "Datenschutz", href: "/datenschutz" },
    { label: "Impressum", href: "/impressum" },
    { label: "AGB", href: "/agb" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-cyber-blue/10 bg-space-darker">
      <div className="section-padding max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full border border-cyber-blue/30 flex items-center justify-center glow-border">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  role="img"
                  aria-label="SynSight Logo"
                >
                  <title>SynSight Logo</title>
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
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-4">
              Cybersecurity- und OSINT-Plattform für digitale Identität.
              KI-gestützt, verständlich und in Deutschland entwickelt.
            </p>
            <p className="mb-6 text-xs leading-relaxed text-gray-600">
              Anbieter-Kontakt:{" "}
              <a
                href="mailto:hello@synsight.de"
                className="text-cyber-blue/80 hover:text-cyber-cyan"
              >
                hello@synsight.de
              </a>
              {" · "}
              Datenschutz:{" "}
              <a
                href="mailto:datenschutz@synsight.de"
                className="text-cyber-blue/80 hover:text-cyber-cyan"
              >
                datenschutz@synsight.de
              </a>
            </p>
            <a
              href="mailto:hello@synsight.de"
              className="inline-flex items-center gap-2 text-sm text-cyber-blue/70 transition-colors hover:text-cyber-cyan"
            >
              hello@synsight.de
              <span aria-hidden="true">↗</span>
            </a>
          </div>

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

        <div className="pt-8 border-t border-cyber-blue/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600 font-mono">
            &copy; {new Date().getFullYear()} SynSight — synsight.de — Alle
            Rechte vorbehalten.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/login"
              className="text-xs text-gray-600 hover:text-gray-400"
            >
              Login
            </a>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyber-cyan/60" />
              <span className="text-xs font-mono text-gray-500">
                Produktentwicklung in Deutschland · EU-Datenprinzip
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
