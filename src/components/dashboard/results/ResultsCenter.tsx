import AnalysisResultBox from "@/components/dashboard/results/AnalysisResultBox";
import GoogleIntelligenceReport from "@/components/analysis/google/GoogleIntelligenceReport";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import Link from "next/link";

export default async function ResultsCenter() {
  const [user, catalog] = await Promise.all([
    getCurrentUser(),
    getPublicPricingCatalog(),
  ]);

  const modules = resolveActiveAnalyses(catalog.analyses);
  const userId = user ? Number.parseInt(user.id, 10) : NaN;
  const googleReport = Number.isFinite(userId)
    ? getIntelligenceReport(userId, "google_search")
    : null;

  return (
    <main id="results-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Ergebnisse"
        title="Ergebnis Center"
        description="Jede aktive Suchfunktion hat eine eigene Box. Nur Analysen, die im Admin aktiv sind, erscheinen hier. Nach einer Analyse öffnen Sie die Box und sehen den Report direkt darin."
        helpLabel="Wie funktioniert das Ergebnis Center?"
        helpText="Google Suche zeigt den Intelligence Report nach einem abgeschlossenen Lauf. Alle anderen Boxen füllen sich, sobald Sie die jeweilige Analyse starten."
      />

      {modules.length === 0 ? (
        <section className="glass-strong hardware-panel rounded-[1.4rem] border border-amber-300/20 p-6 md:p-8">
          <p className="font-mono text-[9px] tracking-[.16em] text-amber-100/55">
            KEINE AKTIVEN ANALYSEN
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Im Admin unter SynCredits / Preise müssen Analysen aktiviert sein,
            damit sie im Ergebnis Center erscheinen.
          </p>
        </section>
      ) : (
        <div className="mt-6 space-y-4">
          {modules.map((module) => {
            const isGoogle = module.id === "google_search";
            const hasGoogleReport = isGoogle && googleReport != null;

            if (hasGoogleReport) {
              return (
                <AnalysisResultBox
                  key={module.id}
                  id={module.id}
                  title="Google Intelligence Report"
                  help={module.help}
                  tagline="Was Google öffentlich über Sie anzeigt — API-verifiziert"
                  status="completed"
                  statusLabel={`${googleReport.executive.totalPublicHits} API-Treffer · Risiko ${googleReport.riskLevel} · ${googleReport.generatedAtLabel}`}
                  riskScore={googleReport.riskScore}
                  riskLevel={googleReport.riskLevel}
                  defaultOpen
                >
                  <GoogleIntelligenceReport
                    report={googleReport}
                    revealSections={false}
                  />
                  <Link
                    href="/dashboard/analysis/google"
                    className="mt-4 inline-flex rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/[0.06] px-4 py-2 text-xs font-medium text-cyber-cyan transition hover:border-cyber-cyan/50"
                  >
                    Vollständigen Report mit Scan-Ansicht öffnen →
                  </Link>
                </AnalysisResultBox>
              );
            }

            if (isGoogle) {
              return (
                <AnalysisResultBox
                  key={module.id}
                  id={module.id}
                  title="Google Intelligence Report"
                  help={module.help}
                  tagline={module.tagline}
                  status="ready"
                  statusLabel="Bereit — starten Sie die Google-Analyse im Intelligence Center"
                >
                  <Link
                    href="/dashboard/analysis/google?start=1"
                    className="inline-flex rounded-lg border border-cyber-cyan/50 bg-[linear-gradient(110deg,rgba(114,231,255,.16),rgba(41,182,246,.1))] px-4 py-2.5 text-sm font-semibold text-cyber-cyan transition hover:border-cyber-cyan/55"
                  >
                    Google Analyse starten
                  </Link>
                </AnalysisResultBox>
              );
            }

            return (
              <AnalysisResultBox
                key={module.id}
                id={module.id}
                title={module.title}
                help={module.help}
                tagline={module.tagline}
                status="empty"
                statusLabel="Noch keine Analyse durchgeführt — Start im Analyse Center"
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
