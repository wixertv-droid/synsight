import type { Metadata } from "next";
import ThreatsCenter from "@/components/dashboard/threats/ThreatsCenter";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getLatestDigitalExposureReport } from "@/lib/analysis/digital-exposure/repository";
import { getLatestUsernameReport } from "@/lib/analysis/username/repository";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import { buildThreatsFromReports } from "@/lib/dashboard/build-threats-from-reports";
import { getCurrentUser } from "@/lib/auth/session";

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

  if (user && Number.isFinite(userId) && userId > 0) {
    try {
      const raw = await getIntelligenceReport(userId, "google_search");
      google = raw ? normalizeIntelligenceReport(raw) : null;
    } catch (error) {
      console.error("[Threats] google report load failed", error);
    }
    try {
      exposure = await getLatestDigitalExposureReport(userId);
    } catch (error) {
      console.error("[Threats] exposure report load failed", error);
    }
    try {
      username = await getLatestUsernameReport(userId);
    } catch (error) {
      console.error("[Threats] username report load failed", error);
    }
  }

  const threats = buildThreatsFromReports({ google, exposure, username });

  return <ThreatsCenter threats={threats} />;
}
