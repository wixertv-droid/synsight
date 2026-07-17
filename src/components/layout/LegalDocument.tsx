import type { ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InfoTooltip from "@/components/ui/InfoTooltip";

export interface LegalNavItem {
  id: string;
  label: string;
}

interface LegalDocumentProps {
  label: string;
  title: string;
  subtitle?: string;
  updatedAt: string;
  nav?: LegalNavItem[];
  children: ReactNode;
}

export default function LegalDocument({
  label,
  title,
  subtitle,
  updatedAt,
  nav,
  children,
}: LegalDocumentProps) {
  return (
    <div className="min-h-screen bg-space-black text-slate-200">
      <Navbar />
      <main className="relative overflow-hidden px-6 pb-20 pt-28 md:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyber-blue/[0.06] blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-64 h-80 w-80 rounded-full bg-cyber-cyan/[0.04] blur-[110px]"
        />

        <div className="relative mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[.18em] text-cyber-blue/65 transition-colors hover:text-cyber-cyan"
          >
            <span aria-hidden="true">←</span> ZURÜCK ZU SYNSIGHT
          </Link>

          <header className="mt-12 border-b border-white/[0.07] pb-10">
            <span className="hud-label">{label}</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-.04em] text-white md:text-6xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/40 md:text-lg">
                {subtitle}
              </p>
            ) : null}
            <p className="mt-6 font-mono text-[9px] tracking-[.14em] text-white/28">
              ZULETZT AKTUALISIERT / {updatedAt}
            </p>
          </header>

          {nav && nav.length > 0 ? (
            <nav aria-label="Abschnitte" className="mt-8 flex flex-wrap gap-2">
              {nav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-mono text-[9px] tracking-[.12em] text-white/40 transition hover:border-cyber-cyan/30 hover:text-cyber-cyan"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}

          <div className="mt-12 space-y-6">{children}</div>

          <div className="mt-16 flex flex-col gap-4 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[9px] tracking-[.14em] text-white/25">
              ZULETZT AKTUALISIERT / {updatedAt}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-cyber-blue/20 bg-cyber-blue/[0.06] px-4 py-2.5 font-mono text-[10px] tracking-[.14em] text-cyber-cyan/80 transition hover:border-cyber-cyan/35 hover:text-cyber-cyan"
              >
                <span aria-hidden="true">←</span> Zur Startseite
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 font-mono text-[10px] tracking-[.14em] text-white/45 transition hover:border-white/20 hover:text-white/70"
              >
                Kontakt
              </Link>
            </div>
          </div>

          <p className="mt-8 rounded-xl border border-amber-300/12 bg-amber-300/[0.03] px-4 py-3 text-[11px] leading-relaxed text-amber-100/45">
            Hinweis: Diese Seite ist die produktnahe Dokumentation von SynSight
            und als Entwurf für eine spätere juristische Endprüfung
            strukturiert. Bei Unsicherheiten wenden Sie sich an{" "}
            <a
              href="mailto:contact@synsight.de"
              className="text-cyber-cyan/70 hover:text-cyber-cyan"
            >
              contact@synsight.de
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function LegalPanel({
  id,
  title,
  info,
  children,
}: {
  id?: string;
  title: string;
  info?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="glass hardware-panel scroll-mt-28 rounded-[1.25rem] border border-white/[0.07] p-6 md:p-8"
    >
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-medium tracking-[-.02em] text-white/90">
          {title}
        </h2>
        {info ? <InfoTooltip label={title}>{info}</InfoTooltip> : null}
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-white/45">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyber-cyan/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalMeta({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
        >
          <dt className="font-mono text-[8px] tracking-[.14em] text-white/30">
            {row.label.toUpperCase()}
          </dt>
          <dd className="mt-2 text-sm text-white/70">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
