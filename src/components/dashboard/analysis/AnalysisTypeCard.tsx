import Link from "next/link";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type {
  AnalysisModule,
  AnalysisModuleId,
} from "@/lib/dashboard/analysis-center-data";

const RESULT_ANCHOR: Record<AnalysisModuleId, string> = {
  google_presence: "google",
  social_media: "social",
  image_analysis: "image",
  data_leak: "leak",
};

export default function AnalysisTypeCard({
  module,
}: {
  module: AnalysisModule;
}) {
  const resultsHref = `/dashboard/results#${RESULT_ANCHOR[module.id]}`;

  return (
    <article className="glass hardware-panel group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-white/[0.08] p-5 transition duration-500 hover:border-cyber-blue/25 md:p-6">
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
        <InfoTooltip label={`Hinweis zu ${module.title}`}>
          {module.help}
        </InfoTooltip>
      </div>

      <h2 className="relative mt-5 text-lg font-medium tracking-[-.02em] text-white/88">
        {module.title}
      </h2>
      <p className="relative mt-3 flex-1 text-[12px] leading-relaxed text-white/38">
        {module.description}
      </p>

      <dl className="relative mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
        <div>
          <dt className="font-mono text-[8px] tracking-[.14em] text-white/22">
            DAUER
          </dt>
          <dd className="mt-1.5 text-xs text-white/65">{module.duration}</dd>
        </div>
        <div>
          <dt className="flex items-center font-mono text-[8px] tracking-[.14em] text-white/22">
            KOSTEN
            <InfoTooltip label="SynCredits Hinweis">
              SynCredits-Kosten werden später an echte Analysepreise
              angebunden. Aktuell nur Platzhalter.
            </InfoTooltip>
          </dt>
          <dd className="mt-1.5 text-xs text-cyber-cyan/70">
            {module.creditsLabel}
          </dd>
        </div>
      </dl>

      <Link
        href={resultsHref}
        className="relative mt-5 inline-flex items-center justify-center rounded-lg border border-cyber-cyan/35 bg-[linear-gradient(110deg,rgba(114,231,255,.16),rgba(41,182,246,.1))] px-4 py-2.5 text-sm font-medium text-cyber-cyan transition hover:border-cyber-cyan/55 hover:bg-cyber-cyan/[0.12] hover:text-white"
      >
        Analyse starten
      </Link>
      <p className="relative mt-2 font-mono text-[8px] tracking-[.12em] text-white/20">
        ÖFFNET DEMO-ERGEBNIS · KEINE API
      </p>
    </article>
  );
}
