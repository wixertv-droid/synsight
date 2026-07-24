"use client";

import type { IntelligenceReport } from "@/lib/analysis/types";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { osintGuidance } from "@/lib/content/guidance";

function yn(value: boolean): string {
  return value ? "Ja" : "Nein";
}

export default function ManagementOverviewPanel({
  report,
}: {
  report: IntelligenceReport;
}) {
  const overview = report.managementOverview ?? {
    websites: 0,
    social: 0,
    images: 0,
    phones: 0,
    emails: 0,
    companies: 0,
    documents: 0,
    press: 0,
    forums: 0,
    other: 0,
    mentions: 0,
  };

  const hits = report.hits ?? [];
  const verifiedCount =
    report.executive?.totalPublicHits ??
    hits.filter((h) => (h.identityConfidence ?? 0) >= 70).length;

  const avgConfidence =
    hits.length === 0
      ? 0
      : Math.round(
          hits.reduce((sum, hit) => sum + (hit.identityConfidence ?? 0), 0) /
            hits.length
        );

  const haystack = hits
    .map((h) => `${h.title} ${h.snippet} ${h.visibleData ?? ""}`)
    .join(" ")
    .toLowerCase();

  const hasPublicPhone =
    overview.phones > 0 ||
    hits.some((h) => h.category === "phone") ||
    /\+?\d[\d\s/-]{6,}|telefon/.test(haystack);
  const hasPublicEmail =
    overview.emails > 0 ||
    hits.some((h) => h.category === "email") ||
    /@[\w.-]+\.[a-z]{2,}|e-?mail/.test(haystack);
  const hasPublicAddress =
    /straße|strasse|plz|\b\d{5}\b|adresse|wohnort/.test(haystack) ||
    hits.some((h) => h.category === "address");

  const foundItems = [
    { label: "Profile", value: overview.social },
    { label: "Foren", value: overview.forums },
    { label: "Dokumente", value: overview.documents },
    { label: "Bilder", value: overview.images },
    { label: "Firmeneinträge", value: overview.companies },
    { label: "Erwähnungen", value: overview.mentions },
  ];

  const exposureItems = [
    {
      label: "Öffentliche Telefonnummer",
      value: yn(hasPublicPhone),
      info: osintGuidance.exposure,
    },
    {
      label: "Öffentliche Mail",
      value: yn(hasPublicEmail),
      info: osintGuidance.exposure,
    },
    {
      label: "Öffentliche Anschrift",
      value: yn(hasPublicAddress),
      info: osintGuidance.exposure,
    },
  ];

  const riskTone =
    report.riskLevel === "high"
      ? "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]"
      : report.riskLevel === "medium"
        ? "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.06]"
        : "text-emerald-100/85 border-emerald-300/25 bg-emerald-300/[0.06]";

  const riskLabel =
    report.riskLevel === "high"
      ? "Hoch"
      : report.riskLevel === "medium"
        ? "Mittel"
        : "Niedrig";

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
          MANAGEMENT SUMMARY
        </p>
        <InfoTooltip label="OSINT">{osintGuidance.osint}</InfoTooltip>
      </div>

      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">
        Google konnte{" "}
        <span className="font-semibold text-white/85">{verifiedCount}</span>{" "}
        eindeutig zuordenbare Treffer finden.
      </p>

      <p className="mt-4 font-mono text-[8px] tracking-[.12em] text-white/30">
        GEFUNDEN WURDEN
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {foundItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
          >
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              {item.label.toUpperCase()}
            </p>
            <p className="mt-1 text-lg font-semibold text-white/80">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {exposureItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
          >
            <div className="flex items-center gap-1.5">
              <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
                {item.label.toUpperCase()}
              </p>
              <InfoTooltip label={item.label}>{item.info}</InfoTooltip>
            </div>
            <p className="mt-1 text-lg font-semibold text-white/80">
              {item.value}
            </p>
          </div>
        ))}

        <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-[7px] tracking-[.1em] text-white/25">
              CONFIDENCE
            </p>
            <InfoTooltip label="Confidence">
              {osintGuidance.confidence}
            </InfoTooltip>
          </div>
          <p className="mt-1 text-lg font-semibold text-white/80">
            {avgConfidence}%
          </p>
        </div>

        <div className={`rounded-xl border px-3 py-3 ${riskTone}`}>
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-[7px] tracking-[.1em] opacity-70">
              GESAMTRISIKO
            </p>
            <InfoTooltip label="Risk">{osintGuidance.risk}</InfoTooltip>
          </div>
          <p className="mt-1 text-lg font-semibold">{riskLabel}</p>
        </div>
      </div>
    </section>
  );
}
