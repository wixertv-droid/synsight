import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { ReactNode } from "react";

/** Öffentliche Content-Seiten mit Nav/Footer — ohne bestehende App-Funktionen zu ändern */
export default function PublicShell({
  children,
  showCta = true,
}: {
  children: ReactNode;
  showCta?: boolean;
}) {
  return (
    <main className="min-h-screen bg-space-black text-slate-200">
      <Navbar />
      <div className="section-padding mx-auto max-w-5xl pt-28 md:pt-32">
        {children}
        {showCta && (
          <aside className="mt-16 rounded-2xl border border-cyber-blue/20 bg-cyber-blue/[0.04] p-6 md:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Nächster Schritt
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
              Starten Sie die kostenlose Voranalyse oder erstellen Sie ein Konto
              für vollständige Berichte. SynSight erklärt öffentliche Risiken —
              ohne unnötige Fachsprache.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/#demo-scanner"
                className="rounded-lg border border-cyber-blue/30 bg-cyber-blue/10 px-4 py-2.5 text-sm text-cyan-100 transition hover:bg-cyber-blue/20"
              >
                Demo-Scan öffnen
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Konto erstellen
              </Link>
              <Link
                href="/analysen"
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Alle Analysen
              </Link>
            </div>
          </aside>
        )}
      </div>
      <Footer />
    </main>
  );
}
