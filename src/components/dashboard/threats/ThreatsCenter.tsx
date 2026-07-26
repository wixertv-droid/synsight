"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import AiSummaryWithLinks from "@/components/analysis/intelligence/AiSummaryWithLinks";
import ThreatHitActions from "@/components/dashboard/threats/ThreatHitActions";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StatusDot from "@/components/ui/StatusDot";
import {
  THREAT_MODULE_META,
  threatLevelMeta,
  type PlatformThreat,
  type ThreatModuleKey,
} from "@/lib/dashboard/build-threats-from-reports";
import type { HitActionState } from "@/lib/analysis/hit-action-state";
import type { RiskLevel } from "@/types/platform";

const levelTone: Record<
  RiskLevel,
  {
    tone: "online" | "warning" | "danger";
    panel: string;
  }
> = {
  low: {
    tone: "online",
    panel: "border-emerald-300/12 bg-emerald-300/[0.03]",
  },
  medium: {
    tone: "warning",
    panel: "border-amber-300/12 bg-amber-300/[0.03]",
  },
  high: {
    tone: "danger",
    panel: "border-rose-300/12 bg-rose-300/[0.03]",
  },
};

const levels: RiskLevel[] = ["low", "medium", "high"];

type ModuleFilter = "all" | ThreatModuleKey;
type LevelFilter = "all" | RiskLevel;

export interface ThreatsSummaryPayload {
  summaryText: string;
  status: string;
  generatedAt: string | null;
  threatCount: number;
  modules: string[];
}

export default function ThreatsCenter({
  threats,
  initialSummary = null,
  needsGeneration = false,
}: {
  threats: PlatformThreat[];
  initialSummary?: ThreatsSummaryPayload | null;
  needsGeneration?: boolean;
}) {
  const [summary, setSummary] = useState<ThreatsSummaryPayload | null>(
    initialSummary
  );
  const [summaryLoading, setSummaryLoading] = useState(
    Boolean(needsGeneration || initialSummary?.status === "generating")
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const queueLagebildRefresh = useCallback(() => {
    let pollTimer: number | undefined;
    let cancelled = false;

    async function pollUntilReady(attemptsLeft: number) {
      if (cancelled || attemptsLeft <= 0) {
        setSummaryLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/dashboard/threats/summary");
        const body = await response.json().catch(() => null);
        if (response.ok && body?.success && body.data?.summary) {
          const row = body.data.summary;
          setSummary({
            summaryText: row.summaryText ?? "",
            status: row.status ?? "ready",
            generatedAt: row.generatedAt ?? null,
            threatCount: row.threatCount ?? 0,
            modules: row.modules ?? [],
          });
          if (row.status === "generating" || body.data.needsGeneration) {
            pollTimer = window.setTimeout(
              () => void pollUntilReady(attemptsLeft - 1),
              2500
            );
            return;
          }
        }
      } catch {
        pollTimer = window.setTimeout(
          () => void pollUntilReady(attemptsLeft - 1),
          3000
        );
        return;
      }
      setSummaryLoading(false);
    }

    setSummaryLoading(true);
    void fetch("/api/dashboard/threats/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    })
      .then((r) => r.json())
      .then((body) => {
        if (!body?.success) {
          setSummaryLoading(false);
          return;
        }
        const row = body.data?.summary;
        if (row) {
          setSummary({
            summaryText: row.summaryText ?? "",
            status: row.status ?? "generating",
            generatedAt: row.generatedAt ?? null,
            threatCount: row.threatCount ?? 0,
            modules: row.modules ?? [],
          });
        }
        if (row?.status === "generating" || body.data?.async) {
          pollTimer = window.setTimeout(() => void pollUntilReady(24), 2000);
        } else {
          setSummaryLoading(false);
        }
      })
      .catch(() => {
        setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, []);

  const handleExcluded = useCallback(
    (threatId: string, action: HitActionState) => {
      if (action !== "ignored" && action !== "resolved") return;
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(threatId);
        return next;
      });
      queueLagebildRefresh();
    },
    [queueLagebildRefresh]
  );

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | undefined;

    function applyRow(
      row: {
        summaryText?: string;
        status?: string;
        generatedAt?: string;
        threatCount?: number;
        modules?: string[];
      } | null
    ) {
      if (!row || cancelled) return;
      setSummary({
        summaryText: row.summaryText ?? "",
        status: row.status ?? "ready",
        generatedAt: row.generatedAt ?? null,
        threatCount: row.threatCount ?? 0,
        modules: row.modules ?? [],
      });
      if (
        row.status === "ready" ||
        row.status === "empty" ||
        row.status === "failed"
      ) {
        setSummaryLoading(false);
      }
    }

    async function pollUntilReady(attemptsLeft: number) {
      if (cancelled || attemptsLeft <= 0) {
        setSummaryLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/dashboard/threats/summary");
        const body = await response.json().catch(() => null);
        if (response.ok && body?.success) {
          applyRow(body.data.summary);
          if (
            body.data.summary?.status === "generating" ||
            body.data.needsGeneration
          ) {
            pollTimer = window.setTimeout(
              () => void pollUntilReady(attemptsLeft - 1),
              2500
            );
            return;
          }
        }
      } catch {
        // keep polling briefly
        pollTimer = window.setTimeout(
          () => void pollUntilReady(attemptsLeft - 1),
          3000
        );
        return;
      }
      setSummaryLoading(false);
    }

    async function start() {
      if (!needsGeneration && initialSummary?.status !== "generating") {
        return;
      }
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const response = await fetch("/api/dashboard/threats/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: false }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) {
          throw new Error(body?.error?.message ?? "Lagebild fehlgeschlagen");
        }
        applyRow(body.data.summary);
        if (
          body.data.summary?.status === "generating" ||
          body.data.async === true
        ) {
          pollTimer = window.setTimeout(() => void pollUntilReady(24), 2000);
        } else {
          setSummaryLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setSummaryError(
            error instanceof Error ? error.message : "Lagebild fehlgeschlagen"
          );
          setSummaryLoading(false);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
    // Only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showGenerating = summaryLoading || summary?.status === "generating";

  const visibleThreats = useMemo(
    () => threats.filter((threat) => !hiddenIds.has(threat.id)),
    [threats, hiddenIds]
  );

  const availableModules = useMemo(() => {
    const keys = new Set(visibleThreats.map((t) => t.moduleKey));
    return (Object.keys(THREAT_MODULE_META) as ThreatModuleKey[]).filter((k) =>
      keys.has(k)
    );
  }, [visibleThreats]);

  const filtered = useMemo(() => {
    return visibleThreats.filter((threat) => {
      if (moduleFilter !== "all" && threat.moduleKey !== moduleFilter) {
        return false;
      }
      if (levelFilter !== "all" && threat.level !== levelFilter) {
        return false;
      }
      return true;
    });
  }, [visibleThreats, moduleFilter, levelFilter]);

  const counts = levels.map((level) => ({
    level,
    count: filtered.filter((threat) => threat.level === level).length,
  }));

  return (
    <main id="threats-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Schutz"
        title="Bedrohungen & Schutzmaßnahmen"
        description="Priorisierte Risiken aus Ihren Analyseberichten — mit klarer Erklärung und konkreten Handlungsschritten."
        helpLabel="Was sind Bedrohungen?"
        helpText="Jede Karte beschreibt einen Fund aus Google-, Leak- oder Username-Analysen, warum er relevant ist und was Sie tun können. Das KI-Lagebild wird nach jeder Analyse neu berechnet."
      />

      <section
        aria-label="KI-Lagebild"
        className="mb-8 rounded-[1.4rem] border border-cyber-cyan/20 bg-cyber-cyan/[0.04] p-5 md:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
              KI-LAGEBILD · UNGESCHÖNT
            </p>
            <h2 className="mt-2 text-lg font-medium text-white/85">
              Gesamteinschätzung aus Ihren Analysen
            </h2>
          </div>
          {summary?.generatedAt ? (
            <p className="font-mono text-[8px] tracking-[.12em] text-white/25">
              STAND{" "}
              {new Date(summary.generatedAt).toLocaleString("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          {showGenerating ? (
            <p className="text-sm text-white/40">Lagebild wird erstellt…</p>
          ) : summaryError ? (
            <p className="text-sm text-rose-100/70">{summaryError}</p>
          ) : summary?.summaryText &&
            summary.summaryText !== "Lagebild wird erstellt…" ? (
            <AiSummaryWithLinks text={summary.summaryText} />
          ) : threats.length === 0 ? (
            <p className="text-sm text-white/40">
              Noch keine Analysen mit priorisierten Funden — das Lagebild
              erscheint nach der ersten Auswertung.
            </p>
          ) : (
            <p className="text-sm text-white/40">
              Für die vorhandenen Analysen liegt noch kein Lagebild vor. Es wird
              automatisch erzeugt.
            </p>
          )}
        </div>
      </section>

      <section
        aria-label="Filter"
        className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={moduleFilter === "all"}
            onClick={() => setModuleFilter("all")}
            label={`Alle Module (${visibleThreats.length})`}
          />
          {availableModules.map((key) => {
            const count = visibleThreats.filter(
              (t) => t.moduleKey === key
            ).length;
            return (
              <FilterChip
                key={key}
                active={moduleFilter === key}
                onClick={() => setModuleFilter(key)}
                label={`${THREAT_MODULE_META[key].short} (${count})`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={levelFilter === "all"}
            onClick={() => setLevelFilter("all")}
            label="Alle Level"
          />
          {levels.map((level) => (
            <FilterChip
              key={level}
              active={levelFilter === level}
              onClick={() => setLevelFilter(level)}
              label={threatLevelMeta[level].label}
            />
          ))}
        </div>
      </section>

      <section
        aria-label="Risiko-Level Übersicht"
        className="grid gap-4 md:grid-cols-3"
      >
        {counts.map(({ level, count }) => {
          const meta = threatLevelMeta[level];
          const style = levelTone[level];
          return (
            <article
              key={level}
              className={`glass hardware-panel rounded-[1.4rem] border p-5 ${style.panel}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-[9px] tracking-[.16em]">
                  <StatusDot tone={style.tone} />
                  {meta.short}
                </span>
                <InfoTooltip label={`Level ${meta.label}`}>
                  {meta.description}
                </InfoTooltip>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-.03em] text-white/85">
                {meta.label}
              </h2>
              <p className="mt-2 text-xs text-white/35">
                {count} Bedrohung{count === 1 ? "" : "en"}
                {moduleFilter !== "all" || levelFilter !== "all"
                  ? " (gefiltert)"
                  : ""}
              </p>
            </article>
          );
        })}
      </section>

      <section aria-label="Bedrohungsliste" className="mt-8 space-y-4">
        {filtered.length === 0 ? (
          <article className="glass-strong hardware-panel rounded-[1.4rem] border border-white/[0.08] px-5 py-8 md:px-6">
            <p className="font-mono text-[8px] tracking-[.14em] text-white/25">
              KEINE BEDROHUNGEN
            </p>
            <h3 className="mt-3 text-lg font-medium text-white/80">
              {visibleThreats.length === 0
                ? "Noch keine priorisierten Funde"
                : "Keine Treffer für diesen Filter"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/35">
              {visibleThreats.length === 0
                ? "Sobald Google-, Leak- oder Username-Analysen vorliegen, erscheinen hier die relevanten Risiken mit Handlungsschritten."
                : "Passen Sie Modul- oder Risiko-Filter an, um weitere Einträge zu sehen."}
            </p>
            {visibleThreats.length === 0 ? (
              <Link
                href="/dashboard/analysis"
                className="mt-5 inline-flex text-xs text-cyber-blue/80 transition hover:text-cyber-cyan"
              >
                Zum Analysecenter →
              </Link>
            ) : null}
          </article>
        ) : (
          filtered.map((threat) => {
            const meta = threatLevelMeta[threat.level];
            const style = levelTone[threat.level];
            return (
              <article
                key={threat.id}
                className="glass-strong hardware-panel overflow-hidden rounded-[1.4rem] border border-white/[0.08] transition duration-300 hover:border-cyber-blue/20"
              >
                <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-mono text-[8px] tracking-[.14em] text-white/25">
                      <StatusDot tone={style.tone} />
                      {meta.label.toUpperCase()} ·{" "}
                      {THREAT_MODULE_META[threat.moduleKey].short} ·{" "}
                      {threat.source}
                    </p>
                    <h3 className="mt-2 text-lg font-medium text-white/88">
                      {threat.title}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex rounded-lg border px-3 py-1.5 font-mono text-[8px] tracking-[.14em] ${style.panel}`}
                  >
                    LEVEL / {meta.short}
                  </span>
                </div>

                <div className="grid gap-px bg-white/[0.05] md:grid-cols-3">
                  <div className="bg-[#050a13]/95 p-5">
                    <p className="flex items-center font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
                      WAS WURDE GEFUNDEN?
                      <InfoTooltip label="Fund erklären">
                        Treffer aus Ihrer Analyse.
                      </InfoTooltip>
                    </p>
                    <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                      {threat.found}
                    </p>
                  </div>
                  <div className="bg-[#050a13]/95 p-5">
                    <p className="flex items-center font-mono text-[8px] tracking-[.14em] text-amber-100/45">
                      WARUM IST ES WICHTIG?
                      <InfoTooltip label="Risiko erklären">
                        Kontext, warum Handlungsbedarf besteht.
                      </InfoTooltip>
                    </p>
                    <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                      {threat.whyItMatters}
                    </p>
                  </div>
                  <div className="bg-[#050a13]/95 p-5">
                    <p className="flex items-center font-mono text-[8px] tracking-[.14em] text-emerald-100/45">
                      WAS KÖNNEN SIE TUN?
                      <InfoTooltip label="Maßnahmen erklären">
                        Konkrete Schutzmaßnahmen, die Sie selbst umsetzen
                        können.
                      </InfoTooltip>
                    </p>
                    <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                      {threat.userAction}
                    </p>
                  </div>
                </div>

                <ThreatHitActions threat={threat} onExcluded={handleExcluded} />
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 font-mono text-[8px] tracking-[.12em] transition ${
        active
          ? "border-cyber-cyan/40 bg-cyber-cyan/[0.1] text-cyber-cyan"
          : "border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/65"
      }`}
    >
      {label}
    </button>
  );
}
