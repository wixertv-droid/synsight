"use client";

import { useMemo, useState } from "react";
import {
  getCategoryMeta,
  riskToSeverity,
  severityLabel,
  severityPercent,
  type HitSeverity,
} from "@/lib/analysis/hit-intel";
import type { IntelligenceHit } from "@/lib/analysis/types";

type HitActionState = "none" | "ignored" | "watching" | "resolved";

const ACTION_STORAGE_PREFIX = "synsight.hitAction.";

function readAction(hitId: string): HitActionState {
  if (typeof window === "undefined") return "none";
  try {
    const value = window.localStorage.getItem(ACTION_STORAGE_PREFIX + hitId);
    if (value === "ignored" || value === "watching" || value === "resolved") {
      return value;
    }
  } catch {
    /* ignore */
  }
  return "none";
}

function writeAction(hitId: string, state: HitActionState) {
  try {
    if (state === "none") {
      window.localStorage.removeItem(ACTION_STORAGE_PREFIX + hitId);
    } else {
      window.localStorage.setItem(ACTION_STORAGE_PREFIX + hitId, state);
    }
  } catch {
    /* ignore */
  }
}

function stars(count: number): string {
  return (
    "★".repeat(Math.max(1, Math.min(5, count))) +
    "☆".repeat(Math.max(0, 5 - count))
  );
}

function RiskBar({
  percent,
  severity,
}: {
  percent: number;
  severity: HitSeverity;
}) {
  const color =
    severity === "critical"
      ? "from-rose-500 to-rose-300"
      : severity === "high"
        ? "from-orange-500 to-amber-300"
        : severity === "medium"
          ? "from-amber-400 to-yellow-200"
          : "from-emerald-500 to-emerald-200";

  return (
    <div className="min-w-[120px]">
      <div className="mb-1 flex items-center justify-between font-mono text-[8px] tracking-[.1em] text-white/35">
        <span>RISIKO</span>
        <span>
          {percent} % · {severityLabel(severity).toUpperCase()}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          style={{ width: `${Math.max(6, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function ConfidenceBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
          IDENTITÄTSWAHRSCHEINLICHKEIT
        </p>
        <p className="font-mono text-[10px] text-cyber-cyan/80">{percent} %</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyber-cyan/50 to-cyber-cyan"
          style={{ width: `${Math.max(6, Math.min(100, percent))}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-white/45">{label}</p>
    </div>
  );
}

export default function IntelligenceHitCard({ hit }: { hit: IntelligenceHit }) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [action, setAction] = useState<HitActionState>(() =>
    readAction(hit.id)
  );

  const meta = useMemo(
    () => getCategoryMeta(hit.category, hit.url, hit.title),
    [hit.category, hit.url, hit.title]
  );
  const severity = hit.severity ?? riskToSeverity(hit.risk);
  const riskPercent = hit.riskPercent ?? severityPercent(severity);
  const confidence = hit.identityConfidence ?? 40;
  const confidenceLabel =
    hit.identityConfidenceLabel ??
    (confidence >= 75
      ? "Sehr wahrscheinlich dieselbe Person"
      : confidence >= 45
        ? "Möglicher Bezug — manuell prüfen"
        : "Wahrscheinlich Namensgleichheit");
  const evaluation = hit.aiEvaluation ?? {
    stars: confidence >= 70 ? 4 : 2,
    headline:
      confidence >= 70
        ? "Treffer gehört mit hoher Wahrscheinlichkeit zu Ihrer Person."
        : "Bezug zur Person ist unsicher.",
    reasons: ["Über Profil-Suchanfrage gefunden"],
    dangers: [hit.risks || "Öffentliche Sichtbarkeit"],
    recommendation: hit.recommendation,
  };
  const hasUrl = Boolean(hit.url?.startsWith("http"));

  function setHitAction(next: HitActionState) {
    setAction(next);
    writeAction(hit.id, next);
  }

  if (action === "ignored") {
    return (
      <article className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-white/35">{hit.title}</p>
          <button
            type="button"
            onClick={() => setHitAction("none")}
            className="font-mono text-[9px] text-white/40 hover:text-white/70"
          >
            Wieder anzeigen
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-[#070d16]/95 ${
        action === "resolved"
          ? "border-emerald-300/25 opacity-80"
          : action === "watching"
            ? "border-amber-300/25"
            : "border-white/[0.08]"
      }`}
    >
      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.chipClass}`}
            >
              {hit.displayCategory ?? meta.label}
            </span>
            {action === "watching" ? (
              <span className="rounded-full border border-amber-300/30 px-2 py-0.5 font-mono text-[8px] text-amber-100/80">
                BEOBACHTUNG
              </span>
            ) : null}
            {action === "resolved" ? (
              <span className="rounded-full border border-emerald-300/30 px-2 py-0.5 font-mono text-[8px] text-emerald-100/80">
                GELÖST
              </span>
            ) : null}
          </div>
          <RiskBar percent={riskPercent} severity={severity} />
        </div>

        <div>
          <h4 className="text-[15px] font-medium leading-snug text-white/90">
            {hit.title}
          </h4>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/40">
            {hit.snippet}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickFact
            label="Betrifft mich?"
            value={hit.belongsToYou ?? confidenceLabel}
          />
          <QuickFact
            label="Gefährlich?"
            value={hit.isDangerous ?? (hit.isProblematic ? "Ja" : "Gering")}
          />
          <QuickFact
            label="Handeln?"
            value={hit.needsAction ?? (hit.shouldAct ? "Ja" : "Optional")}
          />
          <QuickFact
            label="Warum gefunden?"
            value={
              (hit.whyFoundPlain ?? hit.whyFound).slice(0, 72) +
              ((hit.whyFoundPlain ?? hit.whyFound).length > 72 ? "…" : "")
            }
          />
        </div>

        <ConfidenceBar percent={confidence} label={confidenceLabel} />

        <section className="rounded-xl border border-cyber-cyan/20 bg-cyber-cyan/[0.04] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/70">
              KI-BEWERTUNG
            </p>
            <p className="font-mono text-[12px] tracking-[.08em] text-amber-200/80">
              {stars(evaluation.stars)}
            </p>
          </div>
          <p className="mt-2 text-sm text-white/75">{evaluation.headline}</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {evaluation.reasons.slice(0, 4).map((reason) => (
              <li
                key={reason}
                className="font-mono text-[11px] text-emerald-100/70"
              >
                ✓ {reason}
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                GEFAHREN
              </p>
              <ul className="mt-1 space-y-1 text-[12px] text-white/50">
                {evaluation.dangers.slice(0, 3).map((danger) => (
                  <li key={danger}>• {danger}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                EMPFEHLUNG
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                {evaluation.recommendation}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/35">
          <span>Quelle · {hit.source || "unbekannt"}</span>
          <span className="text-white/15">·</span>
          <span>
            Erkennung ·{" "}
            {new Intl.DateTimeFormat("de-DE", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Berlin",
            }).format(new Date(hit.fetchedAt))}
          </span>
          <span className="text-white/15">·</span>
          <span>Confidence · {confidence} %</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasUrl ? (
            <a
              href={hit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-3 py-1.5 text-[11px] text-cyber-cyan"
            >
              Original öffnen
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setHitAction("ignored")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/45 hover:text-white/70"
          >
            Ignorieren
          </button>
          <button
            type="button"
            onClick={() =>
              setHitAction(action === "watching" ? "none" : "watching")
            }
            className="rounded-lg border border-amber-300/25 px-3 py-1.5 text-[11px] text-amber-100/70"
          >
            {action === "watching"
              ? "Beobachtung entfernen"
              : "Zur Beobachtung"}
          </button>
          <button
            type="button"
            onClick={() =>
              setHitAction(action === "resolved" ? "none" : "resolved")
            }
            className="rounded-lg border border-emerald-300/25 px-3 py-1.5 text-[11px] text-emerald-100/70"
          >
            {action === "resolved" ? "Gelöst aufheben" : "Als gelöst markieren"}
          </button>
          <button
            type="button"
            disabled
            title="Folgt in einem späteren Sprint"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/25"
          >
            Entfernung beantragen
          </button>
          <button
            type="button"
            onClick={() => setAiOpen((value) => !value)}
            className="rounded-lg border border-cyber-cyan/25 px-3 py-1.5 text-[11px] text-cyber-cyan/80"
          >
            {aiOpen ? "KI schließen" : "KI erklären"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/40"
          >
            {open ? "Weniger" : "Details"}
          </button>
        </div>
      </div>

      {aiOpen ? (
        <div className="border-t border-white/[0.06] bg-black/20 px-4 py-4">
          <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/55">
            KI ERKLÄRUNG
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {hit.whyFoundPlain ?? hit.whyFound}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {hit.whyRelevantPlain ?? hit.whyRelevant}
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
          <DetailBlock
            title="Warum wurde dieser gefunden?"
            text={hit.whyFoundPlain ?? hit.whyFound}
          />
          <DetailBlock
            title="Warum ist er relevant?"
            text={hit.whyRelevantPlain ?? hit.whyRelevant}
          />
          <DetailBlock
            title="Welche Daten sind sichtbar?"
            text={hit.visibleData}
          />
          <p className="truncate font-mono text-[10px] text-white/30">
            {hit.url}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
      <p className="font-mono text-[7px] tracking-[.12em] text-white/28">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-white/70">{value}</p>
    </div>
  );
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
        {title.toUpperCase()}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/50">{text}</p>
    </div>
  );
}
