"use client";

import { useMemo, useState } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { GoogleSearchReport } from "@/lib/dashboard/google-search-report";
import type { RiskLevel } from "@/types/platform";

const severityCls: Record<RiskLevel, string> = {
  low: "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100/70",
  medium: "border-amber-300/20 bg-amber-300/[0.05] text-amber-100/70",
  high: "border-rose-300/20 bg-rose-300/[0.05] text-rose-100/70",
};

const categoryLabel: Record<string, string> = {
  name: "Name",
  email: "E-Mail",
  phone: "Telefon",
  company: "Firma",
  alias: "Alias",
  social: "Social",
  website: "Website",
  address: "Ort",
  image: "Bilder",
};

export default function GoogleSearchReportPanel({
  report,
}: {
  report: GoogleSearchReport;
}) {
  const [openHitId, setOpenHitId] = useState<string | null>(
    report.hits[0]?.id ?? null
  );
  const [filter, setFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set(report.hits.map((hit) => hit.category));
    return ["all", ...Array.from(set)];
  }, [report.hits]);

  const visibleHits = report.hits.filter(
    (hit) => filter === "all" || hit.category === filter
  );

  const riskLabel =
    report.riskLevel === "high"
      ? "Hoch"
      : report.riskLevel === "medium"
        ? "Mittel"
        : "Niedrig";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyber-cyan/20 bg-cyber-cyan/[0.04] p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
              GOOGLE PRÄSENZ REPORT
            </p>
            <h4 className="mt-2 text-lg font-medium text-white/90">
              Was Google über {report.subjectName} öffentlich zeigt
            </h4>
            <p className="mt-2 text-[12px] leading-relaxed text-white/40">
              {report.summary}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/30">
              Erstellt: {report.generatedAtLabel}
              <span className="text-white/15">·</span>
              Profil {report.profileCompleteness} %
              <InfoTooltip label="Profilbezug">
                Die Suchanfragen und Treffer werden aus Ihren
                Identitätsprofil-Angaben gebildet (Name, E-Mails, Telefon,
                Firma, Aliase, Social, Websites).
              </InfoTooltip>
            </p>
          </div>
          <div
            className={`rounded-xl border px-4 py-3 text-right ${severityCls[report.riskLevel]}`}
          >
            <p className="font-mono text-[8px] tracking-[.14em]">RISIKO</p>
            <p className="mt-1 text-2xl font-semibold">{report.riskScore}</p>
            <p className="mt-1 text-[10px] tracking-wider">{riskLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-white/38">
          {report.whatThisMeans}
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="font-mono text-[9px] tracking-[.16em] text-white/35">
            AUSGEFÜHRTE SUCHANFRAGEN
          </h4>
          <InfoTooltip label="Suchanfragen">
            Jede Zeile ist eine konkrete Google-Suche, die mit Ihren Profildaten
            gebaut wurde — so wie es eine echte Präsenz-Analyse tun würde.
          </InfoTooltip>
        </div>
        <ul className="space-y-2">
          {report.queries.map((query) => (
            <li
              key={query.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/55">
                  {query.label.toUpperCase()}
                </span>
                <span className="font-mono text-[8px] text-white/25">
                  {query.hitCount} TREFFER
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[12px] text-white/70">
                {query.query}
              </p>
              <p className="mt-1 text-[11px] text-white/35">{query.help}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-mono text-[9px] tracking-[.16em] text-white/35">
              GEFUNDENE GOOGLE-TREFFER
            </h4>
            <InfoTooltip label="Treffer aufklappen">
              Jeder Treffer entspricht einem typischen Suchergebnis: Titel,
              Link, Textausschnitt. Aufklappen zeigt, warum der Fund wichtig
              ist.
            </InfoTooltip>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`rounded border px-2 py-1 font-mono text-[7px] tracking-[.1em] ${
                  filter === category
                    ? "border-cyber-cyan/35 text-cyber-cyan"
                    : "border-white/10 text-white/30 hover:border-white/20"
                }`}
              >
                {category === "all"
                  ? "ALLE"
                  : (categoryLabel[category] ?? category).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-2.5">
          {visibleHits.map((hit) => {
            const open = openHitId === hit.id;
            return (
              <li
                key={hit.id}
                className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#070d16]/90"
              >
                <button
                  type="button"
                  onClick={() => setOpenHitId(open ? null : hit.id)}
                  aria-expanded={open}
                  className="flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
                >
                  <span
                    className={`mt-0.5 h-fit shrink-0 rounded border px-2 py-0.5 font-mono text-[7px] tracking-[.1em] ${severityCls[hit.severity]}`}
                  >
                    {(
                      categoryLabel[hit.category] ?? hit.category
                    ).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-cyber-cyan/85">
                      {hit.title}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] text-emerald-100/45">
                      {hit.url}
                    </span>
                    <span className="mt-2 block text-[12px] leading-relaxed text-white/40">
                      {hit.snippet}
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`mt-1 h-4 w-4 shrink-0 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-white/[0.06] px-4 py-3">
                    <div>
                      <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
                        WARUM IST DAS WICHTIG?
                      </p>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                        {hit.whyItMatters}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
                        SUCHANFRAGE
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/55">
                        {hit.query}
                      </p>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className="font-mono text-[9px] tracking-[.16em] text-white/35">
          EMPFEHLUNGEN
        </h4>
        <ol className="mt-3 space-y-2">
          {report.recommendations.map((item, index) => (
            <li
              key={item.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium text-white/75">
                  <span className="mr-2 font-mono text-[8px] text-cyber-cyan/45">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.title}
                </p>
                <span className="font-mono text-[7px] tracking-[.12em] text-white/30">
                  {item.priority.toUpperCase()}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/38">
                {item.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {report.missingProfileHints.length > 0 ? (
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3">
          <p className="font-mono text-[8px] tracking-[.14em] text-amber-100/55">
            FÜR NOCH BESSERE TREFFER
          </p>
          <ul className="mt-2 space-y-1">
            {report.missingProfileHints.map((hint) => (
              <li key={hint} className="text-[11px] text-amber-50/60">
                · {hint}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="font-mono text-[8px] tracking-[.12em] text-white/20">
        UI-DEMO AUS PROFILDATEN · KEINE LIVE-GOOGLE-API
      </p>
    </div>
  );
}
