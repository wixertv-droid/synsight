"use client";

import type {
  DigitalExposureFinding,
  DigitalExposureReport,
  DigitalExposureRiskLevel,
} from "@/lib/analysis/digital-exposure/types";

function riskTone(level: DigitalExposureRiskLevel): string {
  if (level === "high")
    return "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]";
  if (level === "medium")
    return "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.05]";
  return "text-emerald-100/80 border-emerald-400/20 bg-emerald-400/[0.04]";
}

function riskLabel(level: DigitalExposureRiskLevel): string {
  if (level === "high") return "HOCH";
  if (level === "medium") return "MITTEL";
  return "NIEDRIG";
}

function typeIcon(type: DigitalExposureFinding["type"]): string {
  if (type === "PASSWORD_EXPOSURE") return "🔴";
  if (type === "EMAIL") return "📧";
  if (type === "PHONE") return "📱";
  if (type === "BREACH") return "⚠";
  return "◈";
}

function FindingCard({ finding }: { finding: DigitalExposureFinding }) {
  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#070b12]/80 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] tracking-[.14em] text-white/35">
            {finding.type}
          </p>
          <h3 className="mt-1 text-base text-white/88">
            <span className="mr-2" aria-hidden="true">
              {typeIcon(finding.type)}
            </span>
            {finding.title}
          </h3>
        </div>
        <span
          className={`rounded-md border px-2.5 py-1 font-mono text-[9px] tracking-[.12em] ${riskTone(finding.riskLevel)}`}
        >
          RISIKO · {riskLabel(finding.riskLevel)}
        </span>
      </div>

      {finding.identifierMasked ? (
        <p className="mt-3 font-mono text-[11px] text-cyber-cyan/70">
          Identifikator · {finding.identifierMasked}
        </p>
      ) : null}

      {finding.sourceName ? (
        <p className="mt-2 text-sm text-white/55">
          Quelle: <span className="text-white/80">{finding.sourceName}</span>
          {finding.sourceDate ? (
            <span className="text-white/40"> · {finding.sourceDate}</span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-white/60">
        {finding.description}
      </p>

      {finding.dataClasses.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {finding.dataClasses.slice(0, 8).map((item) => (
            <li
              key={item}
              className="font-mono text-[10px] text-white/45 before:mr-2 before:content-['✓'] before:text-emerald-300/70"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {finding.recommendation ? (
        <p className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-white/55">
          Empfehlung: {finding.recommendation}
        </p>
      ) : null}
    </article>
  );
}

export default function DigitalExposureReportView({
  report,
}: {
  report: DigitalExposureReport;
}) {
  const scoreTone =
    report.riskScore >= 70
      ? "text-rose-200"
      : report.riskScore >= 40
        ? "text-amber-100"
        : "text-emerald-200";

  const scrollFindings = report.findings.filter((f) => f.type !== "SOURCE");

  return (
    <section className="glass-strong hardware-panel overflow-hidden rounded-[1.4rem] border border-white/[0.08]">
      <header className="border-b border-white/[0.06] px-5 py-5 md:px-7 md:py-6">
        <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/55">
          DIGITAL LEAK & EXPOSURE SCAN
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
              IDENTITÄT
            </p>
            <p className="mt-1 text-sm text-white/85">{report.subjectName}</p>
          </div>
          <div>
            <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
              ANALYSE STATUS
            </p>
            <p className="mt-1 text-sm text-emerald-200/80">
              {report.status === "completed" ? "abgeschlossen" : report.status}
            </p>
          </div>
          <div>
            <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
              EXPOSURE RISK SCORE
            </p>
            <p className={`mt-1 text-2xl font-semibold ${scoreTone}`}>
              {report.riskScore}
              <span className="ml-1 text-sm font-normal text-white/35">
                / 100
              </span>
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/50">
          {report.summary}
        </p>
      </header>

      <div className="px-5 py-5 md:px-7 md:py-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
              GEFUNDENE SICHERHEITSEREIGNISSE
            </p>
            <p className="mt-1 text-xs text-white/40">
              {scrollFindings.length} Einträge · nur bestätigte API-Ergebnisse
            </p>
          </div>
          <p className="font-mono text-[8px] text-white/28">
            {report.providerLabel}
          </p>
        </div>

        {scrollFindings.length === 0 ? (
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-5 text-sm text-emerald-100/75">
            Keine bekannten Datenlecks zu diesem Identifikator gefunden.
          </p>
        ) : (
          <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {scrollFindings.map((finding, index) => (
              <FindingCard
                key={`${finding.type}-${finding.title}-${index}`}
                finding={finding}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
