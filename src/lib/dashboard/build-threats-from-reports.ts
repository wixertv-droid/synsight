import type { DigitalExposureReport } from "@/lib/analysis/digital-exposure/types";
import {
  orderTypeForDigitalExposureFinding,
  selfGuideForDigitalExposureFinding,
  digitalExposureFindingToIntelligenceHit,
} from "@/lib/analysis/digital-exposure/to-intelligence-hit";
import type { IntelligenceReport } from "@/lib/analysis/types";
import { isLiveSerpSource } from "@/lib/analysis/types";
import type { ReverseImageReport } from "@/lib/analysis/reverse-image/types";
import {
  orderTypeForReverseImageHit,
  reverseImageHitToIntelligenceHit,
  selfGuideForReverseImageHit,
} from "@/lib/analysis/reverse-image/to-intelligence-hit";
import type { UsernameReport } from "@/lib/analysis/username/types";
import type { SynSightOrderType } from "@/lib/analysis/username/types";
import {
  orderTypeForUsernameHit,
  selfGuideForUsernameHit,
} from "@/lib/analysis/username/to-intelligence-hit";
import type { RiskLevel } from "@/types/platform";

export type ThreatModuleKey =
  | "google_search"
  | "digital_leak_exposure"
  | "username_intelligence"
  | "reverse_image_search"
  | "public_image_exposure_scan"
  | "face_identity_verification";

export interface PlatformThreat {
  id: string;
  level: RiskLevel;
  title: string;
  found: string;
  whyItMatters: string;
  userAction: string;
  source: string;
  /** Analysis module that produced this threat. */
  moduleKey: ThreatModuleKey;
  /** Human label for filters / tabs. */
  moduleLabel: string;
  /** Original hit URL for „Original öffnen“ + action fingerprint. */
  url: string | null;
  /** Platform label used by hit-actions fingerprint (must match analysis cards). */
  actionPlatform: string;
  /** Original hit title for fingerprint (must match analysis cards). */
  actionTitle: string;
  /** SynSight order type — null hides „SynSight soll das übernehmen“. */
  orderType: SynSightOrderType | null;
  /** Steps for „Erledige ich selbst“. */
  selfGuide: string[];
  /** Short plain-language blocks for „KI erklären“. */
  aiExplain: {
    whyFound: string;
    whyRelevant: string;
  };
}

export const THREAT_MODULE_META: Record<
  ThreatModuleKey,
  { label: string; short: string }
> = {
  google_search: { label: "Google Analyse", short: "GOOGLE" },
  digital_leak_exposure: {
    label: "Digital Leak & Exposure",
    short: "LEAK",
  },
  username_intelligence: {
    label: "Username Intelligence",
    short: "USERNAME",
  },
  reverse_image_search: {
    label: "Reverse Image Search",
    short: "BILD",
  },
  public_image_exposure_scan: {
    label: "Public Image Exposure Scan",
    short: "BILD",
  },
  face_identity_verification: {
    label: "Face Identity Verification",
    short: "FACE",
  },
};

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

const DEFAULT_SELF_GUIDE = [
  "Originaltreffer öffnen und prüfen.",
  "Persönliche Angaben entfernen oder Profil privat / löschen.",
  "Sichtbarkeit und öffentliche Beiträge prüfen.",
  "Analyse erneut starten und bei Erledigung „Als gelöst markieren“.",
];

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

function orderTypeForGoogle(hit: {
  isProblematic?: boolean;
  severity?: string;
  category: string;
  source: string;
}): SynSightOrderType {
  if (hit.isProblematic || hit.severity === "critical") return "gdpr";
  if (/forum|community/i.test(hit.category + hit.source))
    return "forum_contact";
  return "google_removal";
}

/**
 * Build prioritised threats from real analysis reports.
 * Returns an empty list when no actionable findings exist.
 */
export function buildThreatsFromReports(input: {
  google?: IntelligenceReport | null;
  exposure?: DigitalExposureReport | null;
  username?: UsernameReport | null;
  reverseImage?: ReverseImageReport | null;
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
      const asHit = digitalExposureFindingToIntelligenceHit(finding);
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
        moduleKey: "digital_leak_exposure",
        moduleLabel: THREAT_MODULE_META.digital_leak_exposure.label,
        url: finding.sourceUrl?.startsWith("http") ? finding.sourceUrl : null,
        actionPlatform:
          asHit.source || asHit.displayCategory || asHit.category || "DeHashed",
        actionTitle: asHit.title,
        orderType: orderTypeForDigitalExposureFinding(finding),
        selfGuide: selfGuideForDigitalExposureFinding(finding),
        aiExplain: {
          whyFound: asHit.whyFoundPlain ?? asHit.whyFound,
          whyRelevant: asHit.whyRelevantPlain ?? asHit.whyRelevant,
        },
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
        moduleKey: "google_search",
        moduleLabel: THREAT_MODULE_META.google_search.label,
        url: hit.url?.startsWith("http") ? hit.url : null,
        actionPlatform: hit.source || hit.displayCategory || hit.category,
        actionTitle: hit.title,
        orderType: orderTypeForGoogle(hit),
        selfGuide: DEFAULT_SELF_GUIDE,
        aiExplain: {
          whyFound: hit.whyFoundPlain ?? hit.whyFound,
          whyRelevant: hit.whyRelevantPlain ?? hit.whyRelevant,
        },
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
        moduleKey: "username_intelligence",
        moduleLabel: THREAT_MODULE_META.username_intelligence.label,
        url: hit.profileUrl?.startsWith("http") ? hit.profileUrl : null,
        actionPlatform: hit.platform,
        actionTitle: hit.title,
        orderType: orderTypeForUsernameHit(hit),
        selfGuide: selfGuideForUsernameHit(hit),
        aiExplain: {
          whyFound:
            hit.matchChecks
              ?.filter((c) => c.matched)
              .map((c) => c.label)
              .slice(0, 4)
              .join(", ") ||
            hit.snippet ||
            `Username-Treffer auf ${hit.platform}.`,
          whyRelevant:
            action?.why ||
            (hit.isProblematic
              ? "Problematischer öffentlicher Profiltreffer mit Identitätsbezug."
              : "Öffentlicher Username-Treffer kann Ihre digitale Auffindbarkeit erhöhen."),
        },
      });
    }
  }

  const reverseImage = input.reverseImage ?? null;
  if (reverseImage) {
    const hotHits = (reverseImage.hits ?? [])
      .filter((h) => h.similarity >= 0.7)
      .slice(0, 4);
    for (const hit of hotHits) {
      const intel = reverseImageHitToIntelligenceHit(hit);
      const pct = Math.round(hit.similarity * 100);
      threats.push({
        id: `threat-reverse-${hit.id}`,
        level:
          hit.riskLevel === "high"
            ? "high"
            : hit.riskLevel === "medium"
              ? "medium"
              : "low",
        title: (hit.title || "Visueller Treffer").slice(0, 100),
        found:
          `${pct} % Übereinstimmung · ${hit.sourceHost || "Öffentliche Quelle"}`.slice(
            0,
            220
          ),
        whyItMatters:
          "Öffentliche Bildtreffer mit Gesichtsübereinstimmung können Identitätszuordnung und Missbrauch erleichtern.",
        userAction:
          "Quelle prüfen, unerwünschte Veröffentlichung melden oder entfernen lassen.",
        source: hit.sourceHost || "Public Image Exposure Scan",
        moduleKey: "public_image_exposure_scan",
        moduleLabel: THREAT_MODULE_META.public_image_exposure_scan.label,
        url: hit.sourceUrl?.startsWith("http")
          ? hit.sourceUrl
          : hit.imageUrl?.startsWith("http")
            ? hit.imageUrl
            : null,
        actionPlatform: hit.sourceHost || "Reverse Image",
        actionTitle: hit.title,
        orderType: orderTypeForReverseImageHit(),
        selfGuide: selfGuideForReverseImageHit(hit),
        aiExplain: {
          whyFound: intel.whyFoundPlain ?? intel.whyFound,
          whyRelevant: intel.whyRelevantPlain ?? intel.whyRelevant,
        },
      });
    }
  }

  threats.sort((a, b) => levelRank(a.level) - levelRank(b.level));
  return threats;
}
