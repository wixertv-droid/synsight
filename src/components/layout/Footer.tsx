import Link from "next/link";

const footerLinks = {
  Produkt: [
    { label: "Plattform", href: "/#platform" },
    { label: "Risiko-Check", href: "/#demo-scanner" },
    { label: "Schutzpaket", href: "/#protect-package" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Unternehmen: [
    { label: "Über SynSight", href: "/company" },
    { label: "Kontakt", href: "/contact" },
    { label: "Partnerschaften", href: "/partners" },
    { label: "Presse", href: "/press" },
  ],
  Rechtliches: [
    { label: "Impressum", href: "/impressum" },
    { label: "Datenschutz", href: "/datenschutz" },
    { label: "AGB", href: "/agb" },
    { label: "Cookies", href: "/cookies" },
    { label: "Nutzungsbedingungen", href: "/nutzungsbedingungen" },
    { label: "Security", href: "/security" },
  ],
  Support: [
    { label: "Kontakt", href: "/contact" },
    { label: "Login", href: "/login" },
    { label: "Konto erstellen", href: "/register" },
    {
      label: "Datenschutzanfrage",
      href: "mailto:datenschutz@synsight.de?subject=Datenschutzanfrage%20SynSight",
    },
    {
      label: "Technischer Kontakt",
      href: "mailto:contact@synsight.de?subject=Technische%20Anfrage%20SynSight",
    },
  ],
};

function isInternal(href: string) {
  return href.startsWith("/");
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-cyber-blue/10 bg-space-darker">
      {/* Subtle signal field — counterpart to the hero globe, much lighter */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
      >
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-cyber-blue/[0.05] blur-[80px]" />
        <div className="absolute right-[12%] top-8 h-40 w-40 rounded-full bg-cyber-cyan/[0.04] blur-[70px]" />
        <div className="footer-signal-grid absolute inset-0 opacity-[0.12]" />
        <div className="absolute bottom-10 right-8 hidden h-36 w-36 md:block lg:right-16">
          <div className="footer-orbit absolute inset-0 rounded-full border border-cyber-cyan/15" />
          <div className="footer-orbit footer-orbit-delay absolute inset-4 rounded-full border border-cyber-blue/20" />
          <div className="footer-orbit footer-orbit-delay-2 absolute inset-8 rounded-full border border-white/10" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyber-cyan shadow-[0_0_12px_rgba(112,231,255,.8)]" />
          <div className="footer-ping absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyber-cyan/40" />
        </div>
      </div>

      <div className="section-padding relative mx-auto max-w-7xl">
        {/* Action strip */}
        <div className="mb-14 flex flex-col gap-5 rounded-2xl border border-cyber-blue/15 bg-gradient-to-r from-cyber-blue/[0.08] via-transparent to-cyber-cyan/[0.05] p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
              NÄCHSTER SCHRITT
            </p>
            <p className="mt-2 text-lg font-medium tracking-[-.02em] text-white/85 md:text-xl">
              Wissen, was auffindbar ist — und es unter Kontrolle bringen.
            </p>
            <p className="mt-1.5 max-w-xl text-sm text-white/35">
              Starten Sie mit dem Risiko-Check oder sichern Sie Ihren
              persönlichen Schutzbereich mit einem SynSight-Konto.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#demo-scanner"
              className="inline-flex items-center justify-center rounded-xl border border-cyber-cyan/30 bg-cyber-cyan/[0.12] px-5 py-3 font-mono text-[10px] tracking-[.14em] text-cyber-cyan transition hover:border-cyber-cyan/50 hover:bg-cyber-cyan/[0.18]"
            >
              Risiko-Check starten
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 font-mono text-[10px] tracking-[.14em] text-white/60 transition hover:border-white/25 hover:text-white/85"
            >
              Konto erstellen
            </Link>
          </div>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="glow-border flex h-10 w-10 items-center justify-center rounded-full border border-cyber-blue/30">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
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
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-gray-500">
              Transparenz und Schutz für Ihre digitale Identität. KI-gestützt,
              verständlich und in Deutschland entwickelt.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:contact@synsight.de"
                className="inline-flex items-center gap-2 text-sm text-cyber-blue/70 transition-colors hover:text-cyber-cyan"
              >
                contact@synsight.de
                <span aria-hidden="true">↗</span>
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-sm text-white/35 transition-colors hover:text-cyber-cyan"
              >
                Kontaktformular öffnen
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-sm font-semibold tracking-wide text-white">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {isInternal(link.href) ? (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 transition-colors hover:text-cyber-blue"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-gray-500 transition-colors hover:text-cyber-blue"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-cyber-blue/10 pt-8 md:flex-row">
          <p className="font-mono text-xs text-gray-600">
            &copy; {new Date().getFullYear()} SynSight — synsight.de — Alle
            Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyber-cyan/60 shadow-[0_0_8px_rgba(112,231,255,.45)]" />
            <span className="font-mono text-xs text-gray-500">
              Produktentwicklung in Deutschland · EU-Datenprinzip
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
