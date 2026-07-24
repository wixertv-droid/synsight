import { Suspense } from "react";
import ResultsCenterClient, {
  type ResultsTabModule,
} from "@/components/dashboard/results/ResultsCenterClient";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getLatestDigitalExposureReport } from "@/lib/analysis/digital-exposure/repository";
import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import type { IntelligenceReport } from "@/lib/analysis/types";

const EXTRA_TABS: ResultsTabModule[] = [
  {
    id: "darknet",
    title: "Darknet Analyse",
    help: "Darknet-Hinweise",
    tagline: "Folgt in einem späteren Sprint",
    available: false,
  },
];

const FALLBACK_TABS: ResultsTabModule[] = [
  {
    id: "google_search",
    title: "Google Analyse",
    help: "Öffentliche Google-Suchtreffer",
    tagline: "OSINT Google Report",
    available: true,
  },
  {
    id: "digital_leak_exposure",
    title: "Digital Leak & Exposure Scan",
    help: "Datenlecks zu E-Mail und Telefon (DeHashed)",
    tagline: "Leak & Exposure",
    available: true,
  },
];

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
    case "phone_analysis":
      return "Telefon Analyse";
    case "email_analysis":
      return "E-Mail Analyse";
    case "social_media":
      return "Social Analyse";
    case "reverse_image_search":
      return "Bildanalyse";
    default:
      return fallback;
  }
}

async function loadResultsData(): Promise<{
  tabs: ResultsTabModule[];
  googleReport: IntelligenceReport | null;
  exposureReport: DigitalExposureReport | null;
  subjectName: string;
}> {
  let tabs: ResultsTabModule[] = FALLBACK_TABS;
  let googleReport: IntelligenceReport | null = null;
  let exposureReport: DigitalExposureReport | null = null;
  let subjectName = "Unbekannt";

  try {
    const user = await getCurrentUser().catch((error) => {
      console.error("[ResultsCenter] getCurrentUser failed", error);
      return null;
    });

    try {
      const catalog = await getPublicPricingCatalog();
      const modules = resolveActiveAnalyses(catalog.analyses ?? []);
      if (modules.length > 0) {
        tabs = [
          ...modules.map((module) => ({
            id: module.id,
            title: tabTitle(module.id, module.title),
            help: module.help,
            tagline: module.tagline,
            available:
              module.id === "google_search" ||
              module.id === "digital_leak_exposure",
          })),
          ...EXTRA_TABS.filter(
            (extra) => !modules.some((module) => module.id === extra.id)
          ),
        ];
      }
    } catch (error) {
      console.error("[ResultsCenter] pricing catalog failed", error);
      tabs = FALLBACK_TABS;
    }

    const userId = user ? Number.parseInt(user.id, 10) : NaN;
    if (!Number.isFinite(userId)) {
      return { tabs, googleReport, exposureReport, subjectName };
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

    return { tabs, googleReport, exposureReport, subjectName };
  } catch (error) {
    console.error("[ResultsCenter] unexpected load failure", error);
    return {
      tabs: FALLBACK_TABS,
      googleReport: null,
      exposureReport: null,
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
        subjectName={props.subjectName}
      />
    </Suspense>
  );
}
