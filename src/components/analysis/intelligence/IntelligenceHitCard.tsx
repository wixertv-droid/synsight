"use client";

import { useState } from "react";
import { riskColorClass, riskLabel } from "@/lib/analysis/risk-assessment";
import type { IntelligenceHit } from "@/lib/analysis/types";

const categoryLabel: Record<string, string> = {
  name: "Name",
  email: "E-Mail",
  phone: "Telefon",
  company: "Firma",
  alias: "Alias",
  social: "Social",
  website: "Website",
  address: "Ort",
  general: "Allgemein",
};

function formatFetchedAt(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export default function IntelligenceHitCard({ hit }: { hit: IntelligenceHit }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#070d16]/90">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full gap-3 px-4 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <span
          className={`mt-0.5 h-fit shrink-0 rounded border px-2 py-0.5 font-mono text-[7px] tracking-[.1em] ${riskColorClass(hit.risk)}`}
        >
          {riskLabel(hit.risk).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[7px] tracking-[.1em] text-white/35">
              {(categoryLabel[hit.category] ?? hit.category).toUpperCase()}
            </span>
            <span className="font-mono text-[7px] text-white/25">
              {hit.status === "verified" ? "API-VERIFIZIERT" : "PROFIL"}
            </span>
          </span>
          <span className="mt-2 block text-sm font-medium text-cyber-cyan/85">
            {hit.title}
          </span>
          <span className="mt-1 block truncate font-mono text-[10px] text-emerald-100/45">
            {hit.url}
          </span>
          <span className="mt-2 block text-[12px] leading-relaxed text-white/40">
            {hit.snippet}
          </span>
          <span className="mt-3 grid gap-1 font-mono text-[7px] tracking-[.08em] text-white/25 sm:grid-cols-3">
            <span>QUELLE · {hit.source}</span>
            <span>RELEVANZ · {hit.relevance.toUpperCase()}</span>
            <span>ABGERUFEN · {formatFetchedAt(hit.fetchedAt)}</span>
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
        <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">
          <DetailBlock
            title="Warum wurde dieser gefunden?"
            text={hit.whyFound}
          />
          <DetailBlock title="Warum ist er relevant?" text={hit.whyRelevant} />
          <DetailBlock
            title="Welche Daten sind sichtbar?"
            text={hit.visibleData}
          />
          <DetailBlock
            title="Ist dies öffentlich?"
            text={
              hit.isPublic
                ? "Ja — öffentlich zugänglich oder indexiert."
                : "Nein"
            }
          />
          <DetailBlock
            title="Ist dies problematisch?"
            text={
              hit.isProblematic
                ? "Ja — erhöhte Aufmerksamkeit empfohlen."
                : "Nein — derzeit unkritisch."
            }
          />
          <DetailBlock title="Welche Risiken bestehen?" text={hit.risks} />
          <DetailBlock
            title="Kann ignoriert werden?"
            text={
              hit.canIgnore
                ? "Ja, vorerst beobachten."
                : "Nein — prüfen oder handeln."
            }
          />
          <DetailBlock
            title="Sollte gehandelt werden?"
            text={
              hit.shouldAct
                ? "Ja — Maßnahme empfohlen."
                : "Optional — keine Eile."
            }
          />
          <div className="rounded-xl border border-cyber-cyan/15 bg-cyber-cyan/[0.04] px-3 py-3">
            <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/55">
              EMPFEHLUNG
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/55">
              {hit.recommendation}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
        {title.toUpperCase()}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{text}</p>
    </div>
  );
}
