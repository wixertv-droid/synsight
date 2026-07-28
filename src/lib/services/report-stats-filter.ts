/**
 * Server-side exclusion of ignored/resolved hits from dashboard KPIs (RC-3 H-01).
 * Rebuilds scorecards / category stats so radar channels move back toward green
 * when hits are ignored or marked resolved.
 */
import { computeOverallRisk } from "@/lib/analysis/risk-assessment";
import {
  buildActionPlan,
  buildManagementOverview,
  buildThreatMatrix,
} from "@/lib/analysis/digital-exposure/report-metrics";
import { digitalExposureFindingToIntelligenceHit } from "@/lib/analysis/digital-exposure/to-intelligence-hit";
import {
  AI_SUMMARY_FINDING_TITLE,
  type DigitalExposureReport,
} from "@/lib/analysis/digital-exposure/types";
import { fingerprintForIntelligenceHit } from "@/lib/analysis/hit-action-state";
import { buildReportScorecard } from "@/lib/analysis/hit-intel";
import type { IntelligenceReport } from "@/lib/analysis/types";
import { rebuildGoogleCategoryStats } from "@/lib/dashboard/channel-risk";
import {
  filterIgnoredFromUsernameReport,
  listExcludedFromStatsFingerprints,
} from "@/lib/services/hit-actions-service";
import type { UsernameReport } from "@/lib/analysis/username/types";
import type { ReverseImageReport } from "@/lib/analysis/reverse-image/types";
import { reverseImageHitToIntelligenceHit } from "@/lib/analysis/reverse-image/to-intelligence-hit";
import { assembleReverseImageReport } from "@/lib/analysis/reverse-image/report-metrics";

export async function filterIgnoredFromGoogleReport(
  userId: number,
  report: IntelligenceReport | null
): Promise<IntelligenceReport | null> {
  if (!report) return null;
  const excluded = await listExcludedFromStatsFingerprints(
    userId,
    "google_search"
  );
  if (excluded.size === 0) return report;

  const hits = report.hits.filter((hit) => {
    const fp = fingerprintForIntelligenceHit("google_search", hit);
    return !excluded.has(fp);
  });
  const { riskScore, riskLevel } = computeOverallRisk(hits);
  const scorecard = buildReportScorecard(hits);
  const managementOverview = rebuildGoogleCategoryStats(hits);

  return {
    ...report,
    hits,
    riskScore,
    riskLevel,
    scorecard,
    managementOverview,
    buckets: {
      ...report.buckets,
      total: hits.length,
      relevant: hits.filter((h) => h.relevance === "relevant").length,
      neutral: hits.filter((h) => h.relevance === "neutral").length,
    },
  };
}

export async function filterIgnoredFromDigitalExposureReport(
  userId: number,
  report: DigitalExposureReport | null
): Promise<DigitalExposureReport | null> {
  if (!report) return null;
  const excluded = await listExcludedFromStatsFingerprints(
    userId,
    "digital_leak_exposure"
  );
  if (excluded.size === 0) return report;

  const findings = report.findings.filter((finding) => {
    if (
      finding.type === "SOURCE" ||
      finding.title === AI_SUMMARY_FINDING_TITLE
    ) {
      return true;
    }
    const hit = digitalExposureFindingToIntelligenceHit(finding);
    const fp = fingerprintForIntelligenceHit("digital_leak_exposure", hit);
    return !excluded.has(fp);
  });

  const scoredFindings = findings.filter(
    (f) => f.type !== "SOURCE" && f.title !== AI_SUMMARY_FINDING_TITLE
  );
  const riskScore =
    scoredFindings.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              scoredFindings.reduce((sum, f) => {
                if (f.riskLevel === "high") return sum + 85;
                if (f.riskLevel === "medium") return sum + 55;
                return sum + 25;
              }, 0) / scoredFindings.length
            )
          )
        );
  const managementOverview = buildManagementOverview(findings, riskScore);
  const threatMatrix = buildThreatMatrix(findings, riskScore);
  const actions = buildActionPlan(findings, managementOverview);

  return {
    ...report,
    findings,
    findingCount: scoredFindings.length,
    riskScore,
    managementOverview,
    threatMatrix,
    actions,
    summary: managementOverview.headline,
  };
}

export { filterIgnoredFromUsernameReport };

export async function filterIgnoredFromReverseImageReport(
  userId: number,
  report: ReverseImageReport | null
): Promise<ReverseImageReport | null> {
  if (!report) return null;
  const excluded = await listExcludedFromStatsFingerprints(
    userId,
    "reverse_image_search"
  );
  const faceExcluded = await listExcludedFromStatsFingerprints(
    userId,
    "face_identity_verification"
  );
  for (const fp of faceExcluded) excluded.add(fp);
  if (excluded.size === 0) return report;

  const hits = report.hits.filter((hit) => {
    const intel = reverseImageHitToIntelligenceHit(hit);
    const fp = fingerprintForIntelligenceHit("reverse_image_search", intel);
    return !excluded.has(fp);
  });

  return assembleReverseImageReport({
    scanId: report.scanId,
    status: report.status,
    subjectName: report.subjectName,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
    hits,
    queryCount: report.queryCount,
    candidateCount: report.candidateCount,
    referenceImageCount: report.referenceImageCount,
    retentionDays: report.retentionDays,
    expiresAt: report.expiresAt,
  });
}

export async function filterIgnoredFromUsernameReportSafe(
  userId: number,
  report: UsernameReport | null
): Promise<UsernameReport | null> {
  return filterIgnoredFromUsernameReport(userId, report);
}
