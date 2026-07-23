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
  const hasUrl = Boolean(hit.url?.startsWith("http"));

  return (
    <article className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#070d16]/90">
      <div className="flex gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left transition hover:opacity-95"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={`h-fit shrink-0 rounded border px-2 py-0.5 font-mono text-[7px] tracking-[.1em] ${riskColorClass(hit.risk)}`}
            >
              {riskLabel(hit.risk).toUpperCase()}
            </span>
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
          <span className="mt-2 block text-[12px] leading-relaxed text-white/40">
            {hit.snippet}
          </span>
          <span className="mt-3 grid gap-1 font-mono text-[7px] tracking-[.08em] text-white/25 sm:grid-cols-3">
            <span>QUELLE · {hit.source}</span>
            <span>RELEVANZ · {hit.relevance.toUpperCase()}</span>
            <span>ABGERUFEN · {formatFetchedAt(hit.fetchedAt)}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-1 self-start text-white/30"
          aria-label={open ? "Details zuklappen" : "Details aufklappen"}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {hasUrl ? (
        <div className="border-t border-white/[0.05] px-4 py-2.5">
          <a
            href={hit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.05] px-3 py-2 transition hover:border-cyber-cyan/45 hover:bg-cyber-cyan/[0.1]"
          >
            <span className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/70">
              QUELLE ÖFFNEN
            </span>
            <span className="truncate font-mono text-[11px] text-emerald-100/70 group-hover:text-emerald-100/90">
              {hit.url}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0 text-cyber-cyan/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M14 5h5v5M19 5l-9 9M10 5H5v14h14v-5" />
            </svg>
          </a>
        </div>
      ) : null}

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
          {hasUrl ? (
            <a
              href={hit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/[0.08] px-3 py-2 text-xs text-cyber-cyan transition hover:bg-cyber-cyan/[0.14]"
            >
              Fundstelle im Browser öffnen
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M14 5h5v5M19 5l-9 9M10 5H5v14h14v-5" />
              </svg>
            </a>
          ) : null}
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
