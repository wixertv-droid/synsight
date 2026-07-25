import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import type { IntelligenceReport } from "@/lib/analysis/types";
import { isLiveSerpSource } from "@/lib/analysis/types";
import type { UsernameReport } from "@/lib/analysis/username/types";
import type { RiskLevel } from "@/types/platform";

export interface PlatformThreat {
  id: string;
  level: RiskLevel;
  title: string;
  found: string;
  whyItMatters: string;
  userAction: string;
  source: string;
}

export const threatLevelMeta: Record<
  RiskLevel,
  { label: string; short: string; description: string }
> = {
  low: {
    label: "Niedrig",
    short: "LOW",
    description: "Auffälligkeiten mit geringem Handlungsdruck.",
  },
  medium: {
    label: "Mittel",
    short: "MED",
    description: "Sichtbare Risiken — zeitnah prüfen empfohlen.",
  },
  high: {
    label: "Hoch",
    short: "HIGH",
    description: "Kritische Funde — priorisierte Schutzmaßnahmen.",
  },
};

function levelRank(level: RiskLevel): number {
  if (level === "high") return 0;
  if (level === "medium") return 1;
  return 2;
}

function mapGoogleRisk(
  severity: string | undefined,
  risk: string | undefined
): RiskLevel {
  if (severity === "critical" || risk === "action") return "high";
  if (severity === "high" || risk === "review") return "medium";
  if (severity === "medium" || risk === "watch") return "medium";
  return "low";
}

/**
 * Build prioritised threats from real analysis reports.
 * Returns an empty list when no actionable findings exist.
 */
export function buildThreatsFromReports(input: {
  google?: IntelligenceReport | null;
  exposure?: DigitalExposureReport | null;
  username?: UsernameReport | null;
}): PlatformThreat[] {
  const threats: PlatformThreat[] = [];

  const exposure = input.exposure ?? null;
  if (exposure) {
    const leakFindings = exposure.findings.filter(
      (f) => f.type === "BREACH" || f.type === "PASSWORD_EXPOSURE"
    );
    for (const finding of leakFindings.slice(0, 5)) {
      const actions = exposure.actions ?? [];
      const action =
        actions.find(
          (a) =>
            a.relatedSource &&
            finding.sourceName &&
            a.relatedSource
              .toLowerCase()
              .includes(finding.sourceName.toLowerCase())
        ) ?? actions[0];
      threats.push({
        id: `threat-leak-${finding.sourceName ?? finding.title}-${finding.type}`,
        level: finding.riskLevel === "high" ? "high" : finding.riskLevel,
        title:
          finding.type === "PASSWORD_EXPOSURE"
            ? "Passwort-Exposure erkannt"
            : finding.title || "Datenleck erkannt",
        found:
          finding.description ||
          `${finding.sourceName ?? "Unbekannte Quelle"} · ${finding.identifierMasked ?? "Identifikator"}`,
        whyItMatters:
          action?.why ||
          "Kompromittierte Identifikatoren erhöhen Phishing- und Account-Übernahme-Risiken.",
        userAction:
          action?.how ||
          finding.recommendation ||
          "Passwort ändern, 2FA aktivieren und betroffene Konten prüfen.",
        source: finding.sourceName || "Digital Leak Scan",
      });
    }
  }

  const google = input.google ?? null;
  if (google) {
    const liveHits = google.hits.filter((hit) =>
      isLiveSerpSource(hit.sourceType)
    );
    const prioritized = liveHits
      .filter(
        (h) =>
          h.severity === "critical" ||
          h.severity === "high" ||
          h.risk === "action" ||
          h.risk === "review" ||
          h.shouldAct
      )
      .slice(0, 5);

    for (const hit of prioritized) {
      const related = google.recommendations.find((r) =>
        r.relatedHitIds?.includes(hit.id)
      );
      threats.push({
        id: `threat-google-${hit.id}`,
        level: mapGoogleRisk(hit.severity, hit.risk),
        title: hit.title.slice(0, 100),
        found: (hit.snippet || hit.visibleData || hit.whyFound || "").slice(
          0,
          220
        ),
        whyItMatters: (
          hit.whyRelevantPlain ||
          hit.whyRelevant ||
          hit.risks ||
          "Öffentlich indexierte Informationen können Ihre digitale Auffindbarkeit erhöhen."
        ).slice(0, 220),
        userAction: (
          related?.howToFix ||
          hit.recommendation ||
          "Treffer prüfen und Sichtbarkeit bei der Quelle reduzieren."
        ).slice(0, 220),
        source: hit.source || "Google Analyse",
      });
    }
  }

  const username = input.username ?? null;
  if (username) {
    const hotHits = (username.hits ?? [])
      .filter((h) => h.isProblematic || h.riskLevel === "high")
      .slice(0, 4);
    for (const hit of hotHits) {
      const action =
        username.actions.find(
          (a) =>
            a.relatedPlatform &&
            a.relatedPlatform.toLowerCase() === hit.platform.toLowerCase()
        ) ?? username.actions[0];
      threats.push({
        id: `threat-username-${hit.id}`,
        level: hit.riskLevel === "low" ? "medium" : hit.riskLevel,
        title: `${hit.platform}: ${(hit.title || hit.profileName || "Profiltreffer").slice(0, 80)}`,
        found: (
          hit.snippet ||
          hit.visibleInfo.join(", ") ||
          hit.profileUrl ||
          ""
        ).slice(0, 220),
        whyItMatters: (
          action?.why ||
          (hit.problemTags.length
            ? `Problematische Signale: ${hit.problemTags.join(", ")}.`
            : "Öffentliche Username-Treffer können Identitätszuordnung erleichtern.")
        ).slice(0, 220),
        userAction: (
          action?.how ||
          "Profil privat stellen, löschen oder Benutzernamen ändern."
        ).slice(0, 220),
        source: hit.platform || "Username Intelligence",
      });
    }
  }

  threats.sort((a, b) => levelRank(a.level) - levelRank(b.level));
  return threats;
}
