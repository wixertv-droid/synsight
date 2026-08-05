import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Seite nicht gefunden (404)",
  description:
    "Die angeforderte Seite existiert nicht. Zurück zur SynSight Startseite oder zu den Analysen.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-space-black px-6 text-center text-white">
      <p className="font-mono text-[11px] tracking-[0.28em] text-cyber-cyan/70">
        HTTP 404
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Seite nicht gefunden
      </h1>
      <p className="mt-4 max-w-md text-sm text-white/50">
        Die URL ist ungültig oder wurde verschoben. Nutzen Sie die Navigation
        oder kehren Sie zur Startseite zurück.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg border border-cyber-blue/30 bg-cyber-blue/10 px-4 py-2 text-sm text-cyan-100"
        >
          Zur Startseite
        </Link>
        <Link
          href="/analysen"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70"
        >
          Analysen
        </Link>
        <Link
          href="/hilfe"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70"
        >
          Hilfe
        </Link>
      </div>
    </main>
  );
}
