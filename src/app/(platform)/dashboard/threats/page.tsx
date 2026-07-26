import type { Metadata } from "next";
import ThreatsCenter from "@/components/dashboard/threats/ThreatsCenter";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getLatestDigitalExposureReport } from "@/lib/analysis/digital-exposure/repository";
import { getLatestUsernameReport } from "@/lib/analysis/username/repository";
import {
  filterIgnoredFromDigitalExposureReport,
  filterIgnoredFromGoogleReport,
  filterIgnoredFromUsernameReport,
} from "@/lib/services/report-stats-filter";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import { buildThreatsFromReports } from "@/lib/dashboard/build-threats-from-reports";
import { extractActiveAnalysisKeys } from "@/lib/credits/resolve-active-analyses";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";

export const metadata: Metadata = {
  title: "Bedrohungen — SynSight Command Center",
  description:
    "Bedrohungen und Schutzmaßnahmen für Ihre digitale Identität im SynSight Command Center.",
};

export default async function DashboardThreatsPage() {
  const user = await getCurrentUser();
  const userId = user ? Number(user.id) : 0;

  let google = null;
  let exposure = null;
  let username = null;
  let activeKeys: string[] = [];

  try {
    const catalog = await getPublicPricingCatalog();
    activeKeys = extractActiveAnalysisKeys(catalog.analyses ?? []);
  } catch (error) {
    console.error("[Threats] pricing catalog failed", error);
  }

  if (user && Number.isFinite(userId) && userId > 0) {
    if (activeKeys.includes("google_search")) {
      try {
        const raw = await getIntelligenceReport(userId, "google_search");
        const report = raw ? normalizeIntelligenceReport(raw) : null;
        google = await filterIgnoredFromGoogleReport(userId, report);
      } catch (error) {
        console.error("[Threats] google report load failed", error);
      }
    }
    if (activeKeys.includes("digital_leak_exposure")) {
      try {
        const raw = await getLatestDigitalExposureReport(userId);
        exposure = await filterIgnoredFromDigitalExposureReport(userId, raw);
      } catch (error) {
        console.error("[Threats] exposure report load failed", error);
      }
    }
    if (activeKeys.includes("username_intelligence")) {
      try {
        const rawUsername = await getLatestUsernameReport(userId);
        username = await filterIgnoredFromUsernameReport(userId, rawUsername);
      } catch (error) {
        console.error("[Threats] username report load failed", error);
      }
    }
  }

  const threats = buildThreatsFromReports({ google, exposure, username });

  return <ThreatsCenter threats={threats} />;
}
