/**
 * Load filtered analysis reports and build the prioritised threats list.
 */
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import { getLatestDigitalExposureReport } from "@/lib/analysis/digital-exposure/repository";
import { getLatestReverseImageReport } from "@/lib/analysis/reverse-image/repository";
import { getLatestUsernameReport } from "@/lib/analysis/username/repository";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import {
  buildThreatsFromReports,
  type PlatformThreat,
} from "@/lib/dashboard/build-threats-from-reports";
import { extractActiveAnalysisKeys } from "@/lib/credits/resolve-active-analyses";
import {
  filterIgnoredFromDigitalExposureReport,
  filterIgnoredFromGoogleReport,
  filterIgnoredFromReverseImageReport,
  filterIgnoredFromUsernameReport,
} from "@/lib/services/report-stats-filter";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";

export async function loadUserThreatBundle(userId: number): Promise<{
  threats: PlatformThreat[];
  activeKeys: string[];
  hasAnyReport: boolean;
}> {
  let activeKeys: string[] = [];
  try {
    const catalog = await getPublicPricingCatalog();
    activeKeys = extractActiveAnalysisKeys(catalog.analyses ?? []);
  } catch (error) {
    console.error("[threats] pricing catalog failed", error);
  }

  let google = null;
  let exposure = null;
  let username = null;
  let reverseImage = null;
  let hasAnyReport = false;

  if (activeKeys.includes("google_search")) {
    try {
      const raw = await getIntelligenceReport(userId, "google_search");
      const report = raw ? normalizeIntelligenceReport(raw) : null;
      google = await filterIgnoredFromGoogleReport(userId, report);
      if (google) hasAnyReport = true;
    } catch (error) {
      console.error("[threats] google load failed", error);
    }
  }
  if (activeKeys.includes("digital_leak_exposure")) {
    try {
      const raw = await getLatestDigitalExposureReport(userId);
      exposure = await filterIgnoredFromDigitalExposureReport(userId, raw);
      if (exposure) hasAnyReport = true;
    } catch (error) {
      console.error("[threats] exposure load failed", error);
    }
  }
  if (activeKeys.includes("username_intelligence")) {
    try {
      const raw = await getLatestUsernameReport(userId);
      username = await filterIgnoredFromUsernameReport(userId, raw);
      if (username) hasAnyReport = true;
    } catch (error) {
      console.error("[threats] username load failed", error);
    }
  }
  if (
    activeKeys.includes("public_image_exposure_scan") ||
    activeKeys.includes("face_identity_verification") ||
    activeKeys.includes("reverse_image_discovery") ||
    activeKeys.includes("reverse_image_search")
  ) {
    try {
      const raw = await getLatestReverseImageReport(userId);
      reverseImage = await filterIgnoredFromReverseImageReport(userId, raw);
      if (reverseImage) hasAnyReport = true;
    } catch (error) {
      console.error("[threats] reverse-image load failed", error);
    }
  }

  const threats = buildThreatsFromReports({
    google,
    exposure,
    username,
    reverseImage,
  });
  return { threats, activeKeys, hasAnyReport };
}
