"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analysisHitFingerprint } from "@/lib/analysis/hit-fingerprint";
import type { HitActionState } from "@/lib/analysis/hit-action-state";
import type { PlatformThreat } from "@/lib/dashboard/build-threats-from-reports";

/**
 * Action buttons for Bedrohungen cards — same semantics as Google / Username
 * IntelligenceHitCard (Original, Ignorieren, Selbst, Gelöst, SynSight, KI).
 */
export default function ThreatHitActions({
  threat,
  onExcluded,
}: {
  threat: PlatformThreat;
  /** Called when ignored/resolved — parent can hide the card and refresh Lagebild. */
  onExcluded?: (threatId: string, action: HitActionState) => void;
}) {
  const fingerprint = useMemo(
    () =>
      analysisHitFingerprint({
        module: threat.moduleKey,
        url: threat.url,
        platform: threat.actionPlatform,
        title: threat.actionTitle,
      }),
    [threat.moduleKey, threat.url, threat.actionPlatform, threat.actionTitle]
  );

  const [action, setAction] = useState<HitActionState>("none");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const hydratedRef = useRef(false);
  const hasUrl = Boolean(threat.url?.startsWith("http"));

  useEffect(() => {
    if (hydratedRef.current) return;
    let cancelled = false;
    fetch(
      `/api/analysis/actions?module=${encodeURIComponent(threat.moduleKey)}`
    )
      .then((r) => r.json())
      .then((body) => {
        if (cancelled || !body.success) return;
        hydratedRef.current = true;
        const match = (
          body.data.actions as Array<{
            hitFingerprint: string;
            action: string;
          }>
        ).find((row) => row.hitFingerprint === fingerprint);
        if (!match) return;
        if (
          match.action === "ignored" ||
          match.action === "self" ||
          match.action === "resolved" ||
          match.action === "ordered"
        ) {
          setAction(match.action);
          if (match.action === "ignored" || match.action === "resolved") {
            onExcluded?.(threat.id, match.action);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fingerprint, threat.moduleKey, threat.id, onExcluded]);

  async function persist(
    kind: "ignored" | "self" | "ordered" | "resolved" | "clear"
  ): Promise<boolean> {
    setBusy(true);
    setToast(null);
    try {
      const response = await fetch("/api/analysis/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          sourceModule: threat.moduleKey,
          platform: threat.actionPlatform,
          profileUrl: hasUrl ? threat.url : null,
          title: threat.actionTitle,
          analysisId: null,
          orderType: kind === "ordered" ? threat.orderType : null,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setToast(body.error?.message ?? "Aktion fehlgeschlagen.");
        return false;
      }
      return true;
    } catch {
      setToast("Verbindung fehlgeschlagen.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setHitAction(next: HitActionState) {
    if (next === "none") {
      const ok = await persist("clear");
      if (!ok) return;
      setAction("none");
      setGuideOpen(false);
      setToast("Aktion zurückgesetzt — zählt wieder in der Statistik.");
      return;
    }
    const ok = await persist(next);
    if (!ok) return;
    setAction(next);
    if (next === "self") setGuideOpen(true);
    if (next === "ignored") {
      setToast("Ignoriert — fließt nicht mehr in die Statistik.");
      onExcluded?.(threat.id, next);
    }
    if (next === "resolved") {
      setGuideOpen(false);
      setToast("Als gelöst markiert — fließt nicht mehr in die Statistik.");
      onExcluded?.(threat.id, next);
    }
    if (next === "ordered") {
      setToast("Auftrag an SynSight weitergegeben — siehe Meine Aufträge.");
    }
  }

  if (action === "ignored") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3 md:px-6">
        <span className="rounded-lg border border-white/20 bg-white/[0.04] px-2 py-0.5 font-mono text-[8px] tracking-[.12em] text-white/50">
          IGNORIERT · NICHT IN STATISTIK
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void setHitAction("none")}
          className="rounded-lg border border-white/15 px-3 py-1.5 font-mono text-[10px] text-white/55 hover:border-white/30 hover:text-white/80 disabled:opacity-50"
        >
          Ignorieren aufheben
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-white/[0.06] px-5 py-4 md:px-6">
      <div className="flex flex-wrap gap-2">
        {hasUrl ? (
          <a
            href={threat.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-3 py-1.5 text-[11px] text-cyber-cyan"
          >
            Original öffnen
          </a>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void setHitAction("ignored")}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/45 hover:text-white/70 disabled:opacity-50"
        >
          Ignorieren
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (action === "self") {
              setGuideOpen((value) => !value);
              return;
            }
            void setHitAction("self");
          }}
          className={`rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50 ${
            action === "self"
              ? "border-amber-300/40 bg-amber-300/[0.08] text-amber-100/85"
              : "border-amber-300/25 text-amber-100/70"
          }`}
        >
          {action === "self" && guideOpen
            ? "Anleitung schließen"
            : "Erledige ich selbst"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void setHitAction(action === "resolved" ? "none" : "resolved")
          }
          className={`rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50 ${
            action === "resolved"
              ? "border-emerald-300/40 bg-emerald-300/[0.1] text-emerald-100/90"
              : "border-emerald-300/25 text-emerald-100/70"
          }`}
        >
          {action === "resolved" ? "Gelöst aufheben" : "Als gelöst markieren"}
        </button>
        {threat.orderType ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void setHitAction(action === "ordered" ? "none" : "ordered")
            }
            className={`rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50 ${
              action === "ordered"
                ? "border-cyber-cyan/45 bg-cyber-cyan/[0.12] text-cyber-cyan"
                : "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100/85"
            }`}
          >
            {action === "ordered"
              ? "Auftrag zurücknehmen"
              : "SynSight soll das übernehmen"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setAiOpen((value) => !value)}
          className="rounded-lg border border-cyber-cyan/25 px-3 py-1.5 text-[11px] text-cyber-cyan/80"
        >
          {aiOpen ? "KI schließen" : "KI erklären"}
        </button>
      </div>

      {guideOpen ? (
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] px-3 py-3">
          <p className="font-mono text-[8px] tracking-[.12em] text-amber-100/60">
            SO GEHST DU VOR
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] text-white/60">
            {threat.selfGuide.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {aiOpen ? (
        <div className="rounded-lg border border-cyber-cyan/15 bg-cyber-cyan/[0.04] px-3 py-3">
          <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/55">
            KI ERKLÄRUNG
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {threat.aiExplain.whyFound}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {threat.aiExplain.whyRelevant}
          </p>
        </div>
      ) : null}

      {toast ? <p className="text-xs text-emerald-100/70">{toast}</p> : null}
    </div>
  );
}
