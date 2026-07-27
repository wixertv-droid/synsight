import { Suspense } from "react";
import ResultsCenterClient, {
  type ResultsTabModule,
} from "@/components/dashboard/results/ResultsCenterClient";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getLatestDigitalExposureReport } from "@/lib/analysis/digital-exposure/repository";
import { getLatestUsernameReport } from "@/lib/analysis/username/repository";
import { getLatestReverseImageReport } from "@/lib/analysis/reverse-image/repository";
import { filterIgnoredFromUsernameReport } from "@/lib/services/username-actions-service";
import { filterIgnoredFromReverseImageReport } from "@/lib/services/report-stats-filter";
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import type { UsernameReport } from "@/lib/analysis/username/types";
import type { ReverseImageReport } from "@/lib/analysis/reverse-image/types";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import type { IntelligenceReport } from "@/lib/analysis/types";

/** Keep live modules left-to-right: Google → Leak → Username, then others. */
function tabSortRank(id: string): number {
  if (id === "google_search") return 10;
  if (id === "digital_leak_exposure") return 20;
  if (id === "username_intelligence") return 30;
  if (id === "reverse_image_search") return 40;
  return 100;
}

/** Strip non-JSON values so Client Component props never crash RSC serialization. */
function safeClientProps<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    console.error("[ResultsCenter] props serialization failed", error);
    return value;
  }
}

function tabTitle(id: string, fallback: string): string {
  switch (id) {
    case "google_search":
      return "Google Analyse";
    case "digital_leak_exposure":
      return "Digital Leak & Exposure Scan";
    case "username_intelligence":
      return "Username Intelligence Scan";
    case "phone_analysis":
      return "Telefon Analyse";
    case "email_analysis":
      return "E-Mail Analyse";
    case "social_media":
      return "Social Analyse";
    case "reverse_image_search":
      return "Reverse Image Search";
    default:
      return fallback;
  }
}

function isAvailableModule(id: string): boolean {
  return (
    id === "google_search" ||
    id === "digital_leak_exposure" ||
    id === "username_intelligence" ||
    id === "reverse_image_search"
  );
}

async function loadResultsData(): Promise<{
  tabs: ResultsTabModule[];
  googleReport: IntelligenceReport | null;
  exposureReport: DigitalExposureReport | null;
  usernameReport: UsernameReport | null;
  reverseImageReport: ReverseImageReport | null;
  subjectName: string;
}> {
  // No hardcoded available FALLBACK — inactive/missing catalog → no tabs.
  let tabs: ResultsTabModule[] = [];
  let googleReport: IntelligenceReport | null = null;
  let exposureReport: DigitalExposureReport | null = null;
  let usernameReport: UsernameReport | null = null;
  let reverseImageReport: ReverseImageReport | null = null;
  let subjectName = "Unbekannt";

  try {
    const user = await getCurrentUser().catch((error) => {
      console.error("[ResultsCenter] getCurrentUser failed", error);
      return null;
    });

    try {
      const catalog = await getPublicPricingCatalog();
      const modules = resolveActiveAnalyses(catalog.analyses ?? []);
      tabs = modules
        .map((module) => ({
          id: module.id,
          title: tabTitle(module.id, module.title),
          help: module.help,
          tagline: module.tagline,
          available: isAvailableModule(module.id),
        }))
        .sort(
          (a, b) =>
            tabSortRank(a.id) - tabSortRank(b.id) ||
            a.title.localeCompare(b.title)
        );
    } catch (error) {
      console.error("[ResultsCenter] pricing catalog failed", error);
      tabs = [];
    }

    const userId = user ? Number.parseInt(user.id, 10) : NaN;
    if (!Number.isFinite(userId)) {
      return {
        tabs,
        googleReport,
        exposureReport,
        usernameReport,
        reverseImageReport,
        subjectName,
      };
    }

    try {
      const identity = await getIdentityForUser(userId);
      subjectName = resolveSubjectName(identity);
    } catch (error) {
      console.error("[ResultsCenter] identity load failed", error);
    }

    try {
      const raw = await getIntelligenceReport(userId, "google_search");
      googleReport = raw ? normalizeIntelligenceReport(raw) : null;
    } catch (error) {
      console.error("[ResultsCenter] google report load failed", error);
      googleReport = null;
    }

    try {
      exposureReport = await getLatestDigitalExposureReport(userId);
    } catch (error) {
      console.error("[ResultsCenter] exposure report load failed", error);
      exposureReport = null;
    }

    try {
      const rawUsername = await getLatestUsernameReport(userId);
      usernameReport = await filterIgnoredFromUsernameReport(
        userId,
        rawUsername
      );
    } catch (error) {
      console.error("[ResultsCenter] username report load failed", error);
      usernameReport = null;
    }

    try {
      const rawReverse = await getLatestReverseImageReport(userId);
      reverseImageReport = await filterIgnoredFromReverseImageReport(
        userId,
        rawReverse
      );
    } catch (error) {
      console.error("[ResultsCenter] reverse image report load failed", error);
      reverseImageReport = null;
    }

    return {
      tabs,
      googleReport,
      exposureReport,
      usernameReport,
      reverseImageReport,
      subjectName,
    };
  } catch (error) {
    console.error("[ResultsCenter] unexpected load failure", error);
    return {
      tabs: [],
      googleReport: null,
      exposureReport: null,
      usernameReport: null,
      reverseImageReport: null,
      subjectName,
    };
  }
}

export default async function ResultsCenter() {
  const data = await loadResultsData();
  const props = safeClientProps({
    modules: data.tabs,
    initialGoogleReport: data.googleReport,
    initialExposureReport: data.exposureReport,
    initialUsernameReport: data.usernameReport,
    initialReverseImageReport: data.reverseImageReport,
    subjectName: data.subjectName || "Unbekannt",
  });

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1500px] p-8 text-sm text-white/40">
          Ergebnis Center wird geladen…
        </div>
      }
    >
      <ResultsCenterClient
        modules={props.modules}
        initialGoogleReport={props.initialGoogleReport}
        initialExposureReport={props.initialExposureReport}
        initialUsernameReport={props.initialUsernameReport}
        initialReverseImageReport={props.initialReverseImageReport}
        subjectName={props.subjectName}
      />
    </Suspense>
  );
}
