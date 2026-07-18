import AnalysisResultBox from "@/components/dashboard/results/AnalysisResultBox";
import GoogleSearchReportPanel from "@/components/dashboard/results/GoogleSearchReportPanel";
import DashboardSectionHeader from "@/components/dashboard/DashboardSectionHeader";
import { buildGoogleSearchReport } from "@/lib/dashboard/google-search-report";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";

export default async function ResultsCenter() {
  const [user, catalog] = await Promise.all([
    getCurrentUser(),
    getPublicPricingCatalog(),
  ]);

  const modules = resolveActiveAnalyses(catalog.analyses);
  const userId = user ? Number.parseInt(user.id, 10) : NaN;
  const identity = Number.isFinite(userId)
    ? await getIdentityForUser(userId)
    : null;
  const googleReport = buildGoogleSearchReport(identity);

  return (
    <main id="results-center-page" className="mx-auto max-w-[1500px]">
      <DashboardSectionHeader
        eyebrow="Command Center / Ergebnisse"
        title="Ergebnis Center"
        description="Jede aktive Suchfunktion hat eine eigene Box. Nur Analysen, die im Admin aktiv sind, erscheinen hier. Nach einer Analyse öffnen Sie die Box und sehen den Report direkt darin."
        helpLabel="Wie funktioniert das Ergebnis Center?"
        helpText="Die Liste kommt aus der Admin-Preisverwaltung (nur aktive Einträge). Google Suche zeigt bereits einen vollständigen Präsenz-Report auf Basis Ihres Identitätsprofils. Alle anderen Boxen füllen sich, sobald Sie die jeweilige Analyse im Analyse Center starten."
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

            if (isGoogle) {
              return (
                <AnalysisResultBox
                  key={module.id}
                  id={module.id}
                  title={module.title}
                  help={module.help}
                  tagline={module.tagline}
                  status="completed"
                  statusLabel={`${googleReport.hits.length} Google-Treffer · ${googleReport.queries.length} Suchanfragen · Profil ${googleReport.profileCompleteness} %`}
                  riskScore={googleReport.riskScore}
                  riskLevel={googleReport.riskLevel}
                  defaultOpen
                >
                  <GoogleSearchReportPanel report={googleReport} />
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
