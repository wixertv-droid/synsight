"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  UsernameActionItem,
  UsernameAmpel,
  UsernameHit,
  UsernameReport,
  UsernameRiskLevel,
  UsernameSecurityOverview,
  UsernameIdentityFindings,
} from "@/lib/analysis/username/types";
import {
  buildActionPlan,
  buildIdentityFindings,
  buildManagementOverview,
  buildSecurityOverview,
  splitPrimaryAndWeakHits,
} from "@/lib/analysis/username/report-metrics";
import { confidenceLabel } from "@/lib/analysis/username/confidence";
import { usernameHitFingerprint } from "@/lib/analysis/username/hit-fingerprint";
import SectionReveal from "@/components/analysis/intelligence/SectionReveal";
import SystemRail, {
  type SystemRailSection,
} from "@/components/layout/SystemRail";
import AiSummaryWithLinks from "@/components/analysis/intelligence/AiSummaryWithLinks";

const RAIL: SystemRailSection[] = [
  { id: "user-security", label: "SICHERHEIT" },
  { id: "user-ai", label: "KI-LAGE" },
  { id: "user-identity", label: "PROFIL" },
  { id: "user-hits", label: "TREFFER" },
  { id: "user-weak", label: "WEITERE" },
  { id: "user-actions", label: "MASSNAHMEN" },
];

function riskLabel(level: UsernameRiskLevel): string {
  if (level === "high") return "HOCH";
  if (level === "medium") return "MITTEL";
  return "NIEDRIG";
}

function riskTone(level: UsernameRiskLevel): string {
  if (level === "high")
    return "text-rose-200/85 border-rose-400/25 bg-rose-400/[0.06]";
  if (level === "medium")
    return "text-amber-100/85 border-amber-300/25 bg-amber-300/[0.05]";
  return "text-emerald-100/80 border-emerald-400/20 bg-emerald-400/[0.04]";
}

function ampelVisual(ampel: UsernameAmpel) {
  if (ampel === "red")
    return {
      emoji: "🔴",
      ring: "border-rose-400/40 bg-rose-400/[0.08]",
      text: "text-rose-100/90",
    };
  if (ampel === "orange")
    return {
      emoji: "🟠",
      ring: "border-orange-300/40 bg-orange-300/[0.08]",
      text: "text-orange-100/90",
    };
  if (ampel === "yellow")
    return {
      emoji: "🟡",
      ring: "border-amber-300/40 bg-amber-300/[0.08]",
      text: "text-amber-100/90",
    };
  return {
    emoji: "🟢",
    ring: "border-emerald-300/40 bg-emerald-300/[0.08]",
    text: "text-emerald-100/90",
  };
}

function fingerprintFor(
  hit: Pick<UsernameHit, "platform" | "profileUrl" | "title">
) {
  return usernameHitFingerprint({
    platform: hit.platform,
    profileUrl: hit.profileUrl,
    title: hit.title,
  });
}

function PlatformHitCard({
  hit,
  ignored,
}: {
  hit: UsernameHit;
  ignored: boolean;
}) {
  const checks = (hit.matchChecks ?? []).filter((c) => c.matched);
  return (
    <article
      className={`overflow-hidden rounded-xl border bg-[#070d16]/95 ${
        ignored ? "border-white/[0.04] opacity-40" : "border-white/[0.08]"
      }`}
    >
      <div className="space-y-3 px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.08] font-mono text-[11px] text-cyber-cyan">
              {(hit.logoKey || hit.platform).slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-mono text-[9px] tracking-[.14em] text-white/35">
                {hit.category.toUpperCase()}
              </p>
              <h3 className="text-[15px] font-medium text-white/90">
                {hit.platform}
              </h3>
            </div>
          </div>
          <span
            className={`rounded-md border px-2.5 py-1 font-mono text-[9px] tracking-[.12em] ${riskTone(hit.riskLevel)}`}
          >
            RISIKO · {riskLabel(hit.riskLevel)}
          </span>
        </div>

        <p className="text-[12px] leading-relaxed text-white/45">
          {hit.snippet}
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] text-white/25">CONFIDENCE</p>
            <p className="mt-1 text-sm text-white/80">
              {hit.confidence}% · {confidenceLabel(hit.confidence)}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] text-white/25">SEIT</p>
            <p className="mt-1 text-sm text-white/80">
              {hit.firstSeen ?? "unbekannt"}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="font-mono text-[7px] text-white/25">ALIAS</p>
            <p className="mt-1 truncate text-sm text-white/80">
              {hit.queriedUsername ?? hit.profileName ?? "—"}
            </p>
          </div>
        </div>

        {hit.profileUrl ? (
          <a
            href={hit.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-mono text-[11px] text-cyber-cyan/75 underline-offset-2 hover:underline"
          >
            Direktlink öffnen
          </a>
        ) : null}

        {checks.length > 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-3">
            <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
              WARUM WURDE DIESER TREFFER ERKANNT?
            </p>
            <ul className="mt-2 space-y-1">
              {checks.map((check) => (
                <li
                  key={check.label}
                  className="text-[12px] text-emerald-100/75"
                >
                  ✓ {check.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ActionPlanCard({
  action,
  analysisId,
  onIgnored,
  onOrdered,
}: {
  action: UsernameActionItem;
  analysisId: number;
  onIgnored: (platform: string, url: string | null, title: string) => void;
  onOrdered: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const visual = ampelVisual(action.ampel);

  async function postAction(
    kind: "ignored" | "self" | "ordered"
  ): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/analysis/username/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          platform: action.relatedPlatform ?? "Allgemein",
          profileUrl: action.relatedUrl,
          title: action.title,
          analysisId,
          orderType: kind === "ordered" ? action.orderType : null,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setMessage(body.error?.message ?? "Aktion fehlgeschlagen.");
        return false;
      }
      return true;
    } catch {
      setMessage("Verbindung fehlgeschlagen.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
            {action.priority}
          </p>
          <h3 className="mt-1 text-base font-medium text-white/90">
            {action.title}
          </h3>
          {action.relatedPlatform ? (
            <p className="mt-1 text-sm text-white/45">
              {action.relatedPlatform}
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-lg border px-3 py-2 font-mono text-[10px] ${visual.ring} ${visual.text}`}
        >
          {visual.emoji} RISIKO
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/[0.06] px-3 py-2">
          <p className="font-mono text-[7px] text-white/25">AUFWAND</p>
          <p className="mt-1 text-sm text-white/75">{action.effort}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] px-3 py-2">
          <p className="font-mono text-[7px] text-white/25">NUTZEN</p>
          <p className="mt-1 text-sm text-white/75">{action.benefit}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] px-3 py-2">
          <p className="font-mono text-[7px] text-white/25">WARUM</p>
          <p className="mt-1 text-sm text-white/75">{action.why}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void postAction("ignored").then((ok) => {
              if (ok) {
                onIgnored(
                  action.relatedPlatform ?? "Allgemein",
                  action.relatedUrl,
                  action.title
                );
                setMessage(
                  "Ignoriert — fließt nicht mehr in Risiko/Statistik."
                );
              }
            })
          }
          className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-3 text-sm text-white/70 transition hover:border-white/30 disabled:opacity-50"
        >
          Ignorieren
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setShowGuide((value) => !value);
            void postAction("self");
          }}
          className="rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/[0.08] px-3 py-3 text-sm text-cyber-cyan transition hover:border-cyber-cyan/50 disabled:opacity-50"
        >
          Ich kümmere mich selbst
        </button>
        {action.orderType ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void postAction("ordered").then((ok) => {
                if (ok) {
                  onOrdered();
                  setMessage(
                    "Auftrag angelegt (vorbereitet) — siehe „Meine Aufträge“."
                  );
                }
              })
            }
            className="rounded-lg border border-emerald-300/30 bg-emerald-300/[0.08] px-3 py-3 text-sm text-emerald-100/85 transition hover:border-emerald-300/50 disabled:opacity-50"
          >
            SynSight soll das übernehmen
          </button>
        ) : (
          <div className="rounded-lg border border-white/[0.06] px-3 py-3 text-center text-[11px] text-white/30">
            SynSight-Übernahme nicht verfügbar
          </div>
        )}
      </div>

      {showGuide ? (
        <div className="mt-3 rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/[0.04] px-4 py-3">
          <p className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/60">
            SO GEHST DU VOR
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-white/60">
            {(action.selfGuide?.length
              ? action.selfGuide
              : action.how.split(/(?<=\.)\s+/).filter(Boolean)
            ).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 text-xs text-emerald-100/70">{message}</p>
      ) : null}
    </article>
  );
}

function FindingChip({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean;
}) {
  const display =
    typeof value === "boolean" ? (value ? "Ja" : "Nein") : String(value);
  const positive = value === true || (typeof value === "number" && value > 0);
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        positive
          ? "border-amber-300/25 bg-amber-300/[0.05]"
          : "border-white/[0.06] bg-black/20"
      }`}
    >
      <p className="font-mono text-[7px] tracking-[.12em] text-white/30">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-lg font-semibold text-white/85">{display}</p>
    </div>
  );
}

export default function UsernameIntelligenceReportView({
  report,
  revealSections = true,
}: {
  report: UsernameReport;
  revealSections?: boolean;
}) {
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/analysis/username/actions")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setIgnored(new Set(body.data.ignoredFingerprints ?? []));
        }
      })
      .catch(() => undefined);
  }, []);

  const derived = useMemo(() => {
    const activeHits = report.hits.filter(
      (hit) => !ignored.has(fingerprintFor(hit))
    );
    const overview =
      report.managementOverview ??
      buildManagementOverview({
        username: report.subjectUsername,
        hits: activeHits,
        identityScore: report.identityScore,
        riskScore: report.riskScore,
        confidence: report.confidence,
      });
    const actions = (
      report.actions?.length
        ? report.actions
        : buildActionPlan(activeHits, overview)
    ).map((action) => ({
      ...action,
      selfGuide: action.selfGuide ?? [],
      effortMinutes: action.effortMinutes ?? 30,
      relatedHitId: action.relatedHitId ?? null,
      relatedUrl: action.relatedUrl ?? null,
      ampel: action.ampel ?? "yellow",
      orderType: action.orderType ?? null,
    }));
    const security: UsernameSecurityOverview =
      report.securityOverview ??
      buildSecurityOverview({
        hits: activeHits,
        actions,
        overallRisk: overview.overallRisk,
      });
    // Recompute KPIs against non-ignored hits when ignores change
    const liveSecurity = buildSecurityOverview({
      hits: activeHits,
      actions,
      overallRisk: overview.overallRisk,
    });
    const findings: UsernameIdentityFindings =
      report.identityFindings ?? buildIdentityFindings(activeHits);
    const { primary, weak } = splitPrimaryAndWeakHits(activeHits);
    return {
      overview,
      actions: actions.filter(
        (action) =>
          !action.relatedUrl ||
          !ignored.has(
            fingerprintFor({
              platform: action.relatedPlatform ?? "Allgemein",
              profileUrl: action.relatedUrl,
              title: action.title,
            })
          )
      ),
      security: ignored.size > 0 ? liveSecurity : security,
      findings,
      primary,
      weak,
      ai: report.aiSummary,
      scanned: report.scannedUsernames?.length
        ? report.scannedUsernames
        : [report.subjectUsername],
    };
  }, [report, ignored]);

  const visual = ampelVisual(derived.security.ampel);

  return (
    <div className="relative isolate">
      <div className="relative z-[1] flex items-start gap-5 xl:gap-6">
        <div className="min-w-0 flex-1 space-y-6 xl:pr-2">
          <SectionReveal delayMs={0} enabled={revealSections}>
            <header
              id="user-security"
              className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0a1420] via-[#071018] to-transparent p-5 md:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/70">
                    USERNAME INTELLIGENCE REPORT
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/95 md:text-3xl">
                    Alias: {report.subjectUsername}
                  </h2>
                  <p className="mt-2 text-sm text-white/45">
                    Analyse abgeschlossen
                    {derived.scanned.length > 1
                      ? ` · ${derived.scanned.length} Benutzernamen gescannt`
                      : null}
                  </p>
                </div>
                <div
                  className={`min-w-[160px] rounded-2xl border px-4 py-4 text-center ${visual.ring}`}
                >
                  <p className="text-3xl" aria-hidden="true">
                    {visual.emoji}
                  </p>
                  <p className={`mt-2 text-sm font-medium ${visual.text}`}>
                    {derived.security.ampelLabel}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                    {derived.security.ampelDetail}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["Gefundene Profile", derived.security.foundProfiles],
                    [
                      "Verknüpfbare Identitäten",
                      derived.security.linkableIdentities,
                    ],
                    [
                      "Öffentliche Plattformen",
                      derived.security.publicPlatforms,
                    ],
                    ["Kritische Treffer", derived.security.criticalHits],
                    [
                      "Mögliche Fehltreffer",
                      derived.security.possibleFalsePositives,
                    ],
                    [
                      "Empfohlene Maßnahmen",
                      derived.security.recommendedActions,
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.08] bg-black/30 px-4 py-4"
                  >
                    <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                      {label.toUpperCase()}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white/90">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </header>
          </SectionReveal>

          <SectionReveal delayMs={60} enabled={revealSections}>
            <section
              id="user-ai"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                ZUSAMMENFASSUNG
              </p>
              {derived.ai ? (
                <div className="prose-username mt-4 max-w-none text-sm leading-relaxed text-white/65">
                  <AiSummaryWithLinks text={derived.ai} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/40">
                  {derived.overview.headline}
                </p>
              )}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={100} enabled={revealSections}>
            <section
              id="user-identity"
              className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 md:p-6"
            >
              <h3 className="text-lg font-medium text-white/90">
                Was konnte über diesen Benutzernamen herausgefunden werden?
              </h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <FindingChip
                  label="Name gefunden"
                  value={derived.findings.nameFound}
                />
                <FindingChip
                  label="Wohnort gefunden"
                  value={derived.findings.locationFound}
                />
                <FindingChip
                  label="E-Mail gefunden"
                  value={derived.findings.emailFound}
                />
                <FindingChip
                  label="Telefon gefunden"
                  value={derived.findings.phoneFound}
                />
                <FindingChip
                  label="Datingprofil gefunden"
                  value={derived.findings.datingFound}
                />
                <FindingChip
                  label="Gamingprofile"
                  value={derived.findings.gamingCount}
                />
                <FindingChip
                  label="Foren"
                  value={derived.findings.forumCount}
                />
                <FindingChip
                  label="Social Media"
                  value={derived.findings.socialCount}
                />
                <FindingChip
                  label="Entwicklerplattformen"
                  value={derived.findings.developerCount}
                />
                <FindingChip
                  label="öffentliche Kommentare"
                  value={derived.findings.publicComments}
                />
              </div>
              {derived.findings.interests.length > 0 ? (
                <div className="mt-5">
                  <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                    INTERESSEN ERKANNT
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {derived.findings.interests.map((interest) => (
                      <li
                        key={interest}
                        className="rounded-full border border-cyber-cyan/25 bg-cyber-cyan/[0.06] px-3 py-1 text-xs text-cyber-cyan/85"
                      >
                        {interest}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </SectionReveal>

          <SectionReveal delayMs={140} enabled={revealSections}>
            <section id="user-hits" className="scroll-mt-28 space-y-4">
              <div>
                <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                  WICHTIGSTE TREFFER · NACH RISIKO
                </p>
                <p className="mt-1 text-sm text-white/40">
                  {derived.primary.length} belastbare Treffer
                </p>
              </div>
              <div className="space-y-3">
                {derived.primary.map((hit) => (
                  <PlatformHitCard
                    key={hit.id}
                    hit={hit}
                    ignored={ignored.has(fingerprintFor(hit))}
                  />
                ))}
                {derived.primary.length === 0 ? (
                  <p className="rounded-xl border border-white/[0.06] px-4 py-6 text-sm text-white/40">
                    Keine belastbaren Treffer mit ausreichender Übereinstimmung.
                  </p>
                ) : null}
              </div>
            </section>
          </SectionReveal>

          <SectionReveal delayMs={180} enabled={revealSections}>
            <section
              id="user-weak"
              className="scroll-mt-28 rounded-2xl border border-white/[0.07] bg-black/20 p-5"
            >
              <details>
                <summary className="cursor-pointer list-none">
                  <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
                    WEITERE MÖGLICHE TREFFER
                  </p>
                  <p className="mt-2 text-sm text-white/50">
                    {derived.weak.length} weitere Treffer wurden gefunden,
                    besitzen jedoch nur geringe Übereinstimmung.
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-cyber-cyan/60">
                    Auf Wunsch anzeigen ↓
                  </p>
                </summary>
                <div className="mt-4 space-y-3">
                  {derived.weak.map((hit) => (
                    <PlatformHitCard
                      key={hit.id}
                      hit={hit}
                      ignored={ignored.has(fingerprintFor(hit))}
                    />
                  ))}
                </div>
              </details>
            </section>
          </SectionReveal>

          <SectionReveal delayMs={220} enabled={revealSections}>
            <section id="user-actions" className="scroll-mt-28 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                    MASSNAHMENPLAN
                  </p>
                  <p className="mt-1 text-sm text-white/40">
                    Ignorieren · Selbst erledigen · SynSight-Auftrag
                  </p>
                </div>
                <a
                  href="/dashboard/orders"
                  className="font-mono text-[10px] tracking-[.12em] text-emerald-100/70 underline-offset-4 hover:underline"
                >
                  Meine Aufträge →
                </a>
              </div>
              <div className="space-y-3">
                {derived.actions.map((action) => (
                  <ActionPlanCard
                    key={`${action.title}-${action.relatedPlatform}`}
                    action={action}
                    analysisId={report.analysisId}
                    onIgnored={(platform, url, title) => {
                      setIgnored((prev) => {
                        const next = new Set(prev);
                        next.add(
                          fingerprintFor({
                            platform,
                            profileUrl: url,
                            title,
                          })
                        );
                        return next;
                      });
                    }}
                    onOrdered={() => undefined}
                  />
                ))}
              </div>
            </section>
          </SectionReveal>
        </div>

        <aside className="sticky top-24 hidden w-[72px] shrink-0 xl:block">
          <SystemRail sections={RAIL} />
        </aside>
      </div>
    </div>
  );
}
