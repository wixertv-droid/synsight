import { Suspense } from "react";
import ResultsCenterClient, {
  type ResultsTabModule,
} from "@/components/dashboard/results/ResultsCenterClient";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";

const EXTRA_TABS: ResultsTabModule[] = [
  {
    id: "darknet",
    title: "Darknet Analyse",
    help: "Darknet-Hinweise",
    tagline: "Folgt in einem späteren Sprint",
    available: false,
  },
];

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
  const googleReport = Number.isFinite(userId)
    ? await getIntelligenceReport(userId, "google_search")
    : null;

  const tabs: ResultsTabModule[] = [
    ...modules.map((module) => ({
      id: module.id,
      title:
        module.id === "google_search"
          ? "Google Analyse"
          : module.id === "phone_analysis"
            ? "Telefon Analyse"
            : module.id === "email_analysis"
              ? "E-Mail Analyse"
              : module.id === "social_media"
                ? "Social Analyse"
                : module.id === "reverse_image_search"
                  ? "Bildanalyse"
                  : module.title,
      help: module.help,
      tagline: module.tagline,
      available: module.id === "google_search",
    })),
    ...EXTRA_TABS.filter(
      (extra) => !modules.some((module) => module.id === extra.id)
    ),
  ];

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
          Ergebnis Center wird geladen…
        </div>
      }
    >
      <ResultsCenterClient
        modules={tabs}
        initialGoogleReport={
          googleReport ? normalizeIntelligenceReport(googleReport) : null
        }
        subjectName={resolveSubjectName(identity)}
      />
    </Suspense>
  );
}
