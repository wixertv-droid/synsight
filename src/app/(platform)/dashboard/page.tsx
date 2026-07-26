import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AnalysisWidget from "@/components/dashboard/AnalysisWidget";
import RecommendationsPanel from "@/components/dashboard/RecommendationsPanel";
import RiskCard from "@/components/dashboard/RiskCard";
import SecurityPanel from "@/components/dashboard/SecurityPanel";
import StatusCard from "@/components/dashboard/StatusCard";
import CreditsPanel from "@/components/dashboard/CreditsPanel";
import PromotionWelcomeBanner from "@/components/dashboard/PromotionWelcomeBanner";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getProfileRepository } from "@/lib/repositories";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getLatestDigitalExposureReport } from "@/lib/analysis/digital-exposure/repository";
import { getLatestUsernameReport } from "@/lib/analysis/username/repository";
import {
  filterIgnoredFromDigitalExposureReport,
  filterIgnoredFromGoogleReport,
  filterIgnoredFromUsernameReport,
} from "@/lib/services/report-stats-filter";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import {
  buildDashboardOverview,
  type DashboardModuleInput,
} from "@/lib/dashboard/build-dashboard-overview";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";
import { extractLagebildFirstParagraph } from "@/lib/dashboard/extract-lagebild-paragraph";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import { getThreatsSummaryView } from "@/lib/services/threats-summary-service";

export const metadata: Metadata = {
  title: "Dashboard — SynSight Command Center",
  description: "Ihre persönliche SynSight Sicherheitszentrale.",
};

const IMPLEMENTED_REPORT_KEYS = new Set([
  "google_search",
  "digital_leak_exposure",
  "username_intelligence",
]);

async function loadModuleReport(
  userId: number,
  key: string
): Promise<unknown | null> {
  if (key === "google_search") {
    const raw = await getIntelligenceReport(userId, "google_search");
    const report = raw ? normalizeIntelligenceReport(raw) : null;
    return filterIgnoredFromGoogleReport(userId, report);
  }
  if (key === "digital_leak_exposure") {
    const report = await getLatestDigitalExposureReport(userId);
    return filterIgnoredFromDigitalExposureReport(userId, report);
  }
  if (key === "username_intelligence") {
    const report = await getLatestUsernameReport(userId);
    return filterIgnoredFromUsernameReport(userId, report);
  }
  return null;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user?.displayName.split(" ")[0] ?? "Gast";
  const userId = user ? Number(user.id) : 0;

  if (user) {
    await getProfileRepository().ensureDraft(userId, {
      firstName: user.displayName.split(" ")[0] || "User",
      lastName: user.displayName.split(" ").slice(1).join(" ") || "Account",
    });
  }

  const identity = user ? await getIdentityForUser(userId) : null;
  const completeness = identity?.completenessPercent ?? 0;

  let activeModules: Awaited<ReturnType<typeof resolveActiveAnalyses>> = [];
  try {
    const catalog = await getPublicPricingCatalog();
    activeModules = resolveActiveAnalyses(catalog.analyses ?? []);
  } catch (error) {
    console.error("[Dashboard] pricing catalog failed", error);
  }

  const modules: DashboardModuleInput[] = [];
  for (const activeModule of activeModules) {
    const key = String(activeModule.id);
    let report: unknown | null = null;
    if (user && IMPLEMENTED_REPORT_KEYS.has(key)) {
      try {
        report = await loadModuleReport(userId, key);
      } catch (error) {
        console.error(`[Dashboard] report load failed for ${key}`, error);
        report = null;
      }
    }
    modules.push({
      key,
      label: activeModule.title,
      report,
    });
  }

  const overview = buildDashboardOverview({ modules });

  let lagebildParagraph = "";
  if (userId > 0) {
    try {
      const threatsView = await getThreatsSummaryView(userId);
      lagebildParagraph = extractLagebildFirstParagraph(
        threatsView.summary?.summaryText
      );
    } catch {
      lagebildParagraph = "";
    }
  }

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Berlin",
  }).format(now);
  const formattedTime = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(now);

  return (
    <main id="synsight-dashboard" className="mx-auto max-w-[1500px]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="hud-label">Command Center / Übersicht</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
            Guten Tag, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-white/32">
            Ihre digitale Sicherheitslage auf einen Blick.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[.13em] text-white/22">
          <span>{formattedDate}</span>
          <span className="h-3 w-px bg-white/[0.07]" />
          <span>{formattedTime} UTC</span>
        </div>
      </div>

      <PromotionWelcomeBanner />

      <section className="mb-6 rounded-[1.4rem] border border-cyber-blue/15 bg-cyber-blue/[0.04] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
              WILLKOMMEN
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-[-.02em] text-white/85">
              Vervollständigen Sie Ihr Identitätsprofil, um genauere Ergebnisse
              zu erhalten.
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/35">
              Es gibt keine Pflichtfelder. Jede freiwillige Angabe verbessert
              spätere Such- und Vergleichsfunktionen.
            </p>
          </div>
          <div className="min-w-[180px]">
            <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
              PROFIL
            </p>
            <p className="mt-2 text-3xl font-semibold text-cyber-cyan/80">
              {completeness} %
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <Link
              href="/profile"
              className="mt-4 inline-flex text-xs text-cyber-blue/80 transition hover:text-cyber-cyan"
            >
              Zum Identitätsprofil →
            </Link>
            <div className="mt-4">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/25">
                REFERENZBILDER {identity?.images.length ?? 0}/4
              </p>
              <div className="mt-2 flex gap-2">
                {identity?.images.map((image) => (
                  <Image
                    key={image.imageType}
                    src={`/api/identity/images/${image.imageType}/thumbnail?v=${image.contentHash ?? ""}`}
                    alt={`Referenzbild ${image.imageType}`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-lg border border-white/10 object-cover"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!overview.hasAnyReport ? (
        <p
          className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-[11px] leading-relaxed text-amber-50/70"
          role="status"
        >
          <span className="inline-flex items-center gap-2">
            Noch keine Analyseberichte
            <InfoTooltip label="Beispieldaten">
              {guidance.dashboard.demoData}
            </InfoTooltip>
          </span>
          <span>
            Kennzahlen erscheinen nach der ersten Analyse im Analysecenter.
          </span>
        </p>
      ) : null}

      <SecurityPanel status={overview.security} />

      {user ? <CreditsPanel userId={userId} /> : null}

      <section
        id="digital-traces"
        className="relative z-0 mt-6 grid gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Sicherheitskennzahlen"
      >
        {overview.metrics.map((metric, index) => (
          <StatusCard key={metric.label} metric={metric} index={index} />
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <AnalysisWidget
          sources={overview.analysisSources}
          signalCount={overview.signalCount}
          activeModuleCount={activeModules.length}
          hasAnyReport={overview.hasAnyReport}
          overallRiskScore={
            overview.hasAnyReport
              ? Math.max(0, Math.min(100, 100 - overview.security.score))
              : 0
          }
          lagebildParagraph={lagebildParagraph}
        />

        <div className="space-y-6">
          <section
            id="risk-analysis"
            className="glass hardware-panel rounded-[1.4rem] p-5 md:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] tracking-[.17em] text-cyber-cyan/50">
                  RISIKOANALYSE
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-white/28">
                  Nach Priorität geordnet
                  <InfoTooltip label="Risikoanalyse">
                    {guidance.dashboard.riskAnalysis}
                  </InfoTooltip>
                </p>
              </div>
              <span className="rounded border border-rose-300/10 bg-rose-300/[0.02] px-2 py-1 font-mono text-[7px] tracking-[.1em] text-rose-100/55">
                {overview.riskSignalCount} SIGNALE
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {overview.riskSignals.map((risk) => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>
          </section>

          <RecommendationsPanel items={overview.recommendations} />
        </div>
      </div>

      <section
        id="monitoring"
        className="mt-6 grid gap-px overflow-hidden rounded-[1.4rem] border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
      >
        {overview.monitoring.map((tile) => (
          <article key={tile.label} className="bg-[#050a13]/95 p-5 md:p-6">
            <p className="font-mono text-[8px] tracking-[.16em] text-white/22">
              {tile.label}
            </p>
            <p className="mt-3 text-lg font-medium text-white/75">
              {tile.value}
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/25">
              {tile.detail}
            </p>
          </article>
        ))}
      </section>
      <span id="reports" className="block scroll-mt-24" />
    </main>
  );
}
