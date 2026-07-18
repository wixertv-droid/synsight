import Link from "next/link";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { AnalysisModule } from "@/lib/dashboard/analysis-center-data";

export default function AnalysisTypeCard({
  module,
  credits,
  featured = false,
}: {
  module: AnalysisModule;
  credits: number;
  featured?: boolean;
}) {
  const resultsHref = `/dashboard/results#${module.id}`;

  return (
    <article
      className={`glass hardware-panel group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border p-5 transition duration-500 md:p-6 ${
        featured
          ? "border-cyber-cyan/35 bg-gradient-to-b from-cyber-cyan/[0.07] to-transparent shadow-[0_0_40px_rgba(0,212,255,.08)]"
          : "border-white/[0.08] hover:border-cyber-blue/25"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${module.accent}`}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyber-cyan/20 bg-cyber-cyan/[0.06] text-cyber-cyan/80 transition group-hover:border-cyber-cyan/40 group-hover:shadow-[0_0_24px_rgba(112,231,255,.12)]">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
          >
            <path d={module.icon} />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          {module.badge ? (
            <span className="rounded-md border border-cyber-cyan/25 bg-cyber-cyan/[0.08] px-2 py-1 font-mono text-[7px] tracking-[.12em] text-cyber-cyan/75">
              {module.badge.toUpperCase()}
            </span>
          ) : null}
          <InfoTooltip label={`Hilfe: ${module.title}`}>
            {module.help}
          </InfoTooltip>
        </div>
      </div>

      <h3 className="relative mt-5 text-lg font-medium tracking-[-.02em] text-white/90">
        {module.title}
      </h3>
      <p className="relative mt-1.5 text-[12px] font-medium text-cyber-cyan/65">
        {module.tagline}
      </p>
      <p className="relative mt-3 flex-1 text-[12px] leading-relaxed text-white/40">
        {module.description}
      </p>

      <div className="relative mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
        <p className="flex items-center font-mono text-[8px] tracking-[.14em] text-white/28">
          DAS ERHALTEN SIE
          <InfoTooltip label="Leistungen erklären">
            Diese Punkte zeigen Ihnen vor dem Start, welchen Nutzen die Analyse
            liefert — in verständlicher Sprache, ohne Fachjargon.
          </InfoTooltip>
        </p>
        <ul className="mt-2 space-y-1.5">
          {module.whatYouGet.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-[11px] leading-snug text-white/55"
            >
              <span className="mt-1 h-1 w-1 flex-none rounded-full bg-cyber-cyan/70" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div>
          <p className="font-mono text-[8px] tracking-[.14em] text-white/22">
            DAUER
          </p>
          <p className="mt-1 text-xs text-white/65">{module.duration}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end font-mono text-[8px] tracking-[.14em] text-white/22">
            PREIS
            <InfoTooltip label="SynCredits Preis">
              SynCredits sind die Nutzungseinheit von SynSight. Der angezeigte
              Preis wird bei Start abgebucht — später mit Live-Bestätigung.
            </InfoTooltip>
          </p>
          <p className="mt-1 text-xl font-semibold tracking-[-.03em] text-cyber-cyan">
            {credits}
            <span className="ml-1 text-[11px] font-medium text-cyber-cyan/60">
              SynCredits
            </span>
          </p>
        </div>
      </div>

      <Link
        href={resultsHref}
        className={`relative mt-5 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          featured
            ? "border border-cyber-cyan/50 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] text-[#021019] shadow-[0_12px_30px_rgba(41,182,246,.2)] hover:brightness-110"
            : "border border-cyber-cyan/35 bg-[linear-gradient(110deg,rgba(114,231,255,.16),rgba(41,182,246,.1))] text-cyber-cyan hover:border-cyber-cyan/55 hover:text-white"
        }`}
      >
        Analyse starten
      </Link>
      <p className="relative mt-2 text-center font-mono text-[8px] tracking-[.12em] text-white/20">
        UI-VORSCHAU · DEMO-ERGEBNIS · KEINE LIVE-API
      </p>
    </article>
  );
}
