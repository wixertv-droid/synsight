import Link from "next/link";
import type { ReactNode } from "react";

interface CompanyPageProps {
  label: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

export default function CompanyPage({
  label,
  title,
  subtitle,
  children,
  maxWidthClassName = "max-w-5xl",
}: CompanyPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-space-black px-6 py-16 text-slate-200 md:px-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-cyber-blue/[0.07] blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-40 h-96 w-96 rounded-full bg-cyber-cyan/[0.05] blur-[110px]"
      />

      <div className={`relative mx-auto ${maxWidthClassName}`}>
        <Link
          href="/"
          className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[.18em] text-cyber-blue/65 transition-colors hover:text-cyber-cyan"
        >
          <span aria-hidden="true">←</span> ZURÜCK ZU SYNSIGHT
        </Link>

        <header className="mt-14 border-b border-white/[0.07] pb-10">
          <span className="hud-label">{label}</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-.04em] text-white md:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/40 md:text-lg">
              {subtitle}
            </p>
          ) : null}
        </header>

        <div className="mt-12 space-y-16">{children}</div>

        <div className="mt-20 border-t border-white/[0.06] pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-cyber-blue/20 bg-cyber-blue/[0.06] px-4 py-2.5 font-mono text-[10px] tracking-[.14em] text-cyber-cyan/80 transition hover:border-cyber-cyan/35 hover:text-cyber-cyan"
          >
            <span aria-hidden="true">←</span> Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
