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
import { dashboardMetrics, riskSignals } from "@/lib/platform-data";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getProfileRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Dashboard — SynSight Command Center",
  description: "Ihre persönliche SynSight Sicherheitszentrale.",
};

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

      <p
        className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-[11px] leading-relaxed text-amber-50/70"
        role="status"
      >
        <span className="inline-flex items-center gap-2">
          Hinweis zu Beispieldaten
          <InfoTooltip label="Beispieldaten">
            {guidance.dashboard.demoData}
          </InfoTooltip>
        </span>
        <span>
          Kennzahlen und Risikosignale auf dieser Übersicht sind derzeit
          Illustrationsdaten zur Produktvorschau.
        </span>
      </p>

      <SecurityPanel />

      <section
        aria-label="Schnellzugriff Analyse Bereiche"
        className="mt-6 grid gap-3 md:grid-cols-3"
      >
        {[
          {
            href: "/dashboard/analysis",
            code: "02",
            title: "Analyse Center",
            detail: "Module starten · UI-Vorbereitung",
            help: "Vier Analyse-Karten mit Dauer- und SynCredits-Platzhaltern. Noch keine Live-Pipeline.",
          },
          {
            href: "/dashboard/results",
            code: "03",
            title: "Ergebnisse",
            detail: "Status · Funde · Empfehlungen",
            help: "Demo-Ergebnisse mit Risiko Bewertung. Später echte Reports.",
          },
          {
            href: "/dashboard/threats",
            code: "04",
            title: "Bedrohungen",
            detail: "Risiko-Level · Schutzmaßnahmen",
            help: "Niedrig / Mittel / Hoch mit konkreten Handlungsschritten.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass hardware-panel group rounded-[1.4rem] border border-white/[0.07] p-5 transition duration-300 hover:border-cyber-blue/25 hover:bg-cyber-blue/[0.03]"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/45">
                {item.code}
              </span>
              <InfoTooltip label={`Hinweis ${item.title}`}>
                {item.help}
              </InfoTooltip>
            </div>
            <h2 className="mt-3 text-base font-medium text-white/85 transition group-hover:text-white">
              {item.title}
            </h2>
            <p className="mt-2 text-[11px] text-white/32">{item.detail}</p>
          </Link>
        ))}
      </section>

      {user ? <CreditsPanel userId={userId} /> : null}

      <section
        id="digital-traces"
        className="relative z-0 mt-6 grid gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Sicherheitskennzahlen"
      >
        {dashboardMetrics.map((metric, index) => (
          <StatusCard key={metric.label} metric={metric} index={index} />
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <AnalysisWidget />

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
                3 SIGNALE
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {riskSignals.map((risk) => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>
          </section>

          <RecommendationsPanel />
        </div>
      </div>

      <section
        id="monitoring"
        className="mt-6 grid gap-px overflow-hidden rounded-[1.4rem] border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
      >
        {[
          [
            "MONITORING",
            "Aktiv",
            "Neue Signale werden kontinuierlich bewertet.",
          ],
          [
            "BERICHTE",
            "1 verfügbar",
            "Ihr monatlicher Schutzbericht ist bereit.",
          ],
          [
            "NÄCHSTER SCAN",
            "In 06:42 h",
            "Automatischer Analysezyklus geplant.",
          ],
        ].map(([label, value, detail]) => (
          <article key={label} className="bg-[#050a13]/95 p-5 md:p-6">
            <p className="font-mono text-[8px] tracking-[.16em] text-white/22">
              {label}
            </p>
            <p className="mt-3 text-lg font-medium text-white/75">{value}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/25">
              {detail}
            </p>
          </article>
        ))}
      </section>
      <span id="reports" className="block scroll-mt-24" />
    </main>
  );
}
