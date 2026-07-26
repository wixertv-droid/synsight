import type { IntelligenceHit } from "@/lib/analysis/types";
import type {
  SynSightOrderType,
  UsernameHit,
} from "@/lib/analysis/username/types";

function mapRisk(level: UsernameHit["riskLevel"]): IntelligenceHit["risk"] {
  if (level === "high") return "action";
  if (level === "medium") return "review";
  return "watch";
}

function mapRelevance(confidence: number): IntelligenceHit["relevance"] {
  if (confidence >= 70) return "relevant";
  if (confidence >= 45) return "neutral";
  return "low";
}

function mapSeverity(
  hit: UsernameHit
): NonNullable<IntelligenceHit["severity"]> {
  if (hit.isProblematic || hit.riskLevel === "high") return "critical";
  if (hit.riskLevel === "medium") return "high";
  if (hit.confidence >= 70) return "medium";
  return "low";
}

/** SynSight order type for a username hit (shared action system). */
export function orderTypeForUsernameHit(
  hit: UsernameHit
): SynSightOrderType | null {
  const cat = hit.category.toLowerCase();
  const platform = hit.platform.toLowerCase();
  if (/dating|forum|social|community|gaming/.test(cat)) return "profile_delete";
  if (/google|bing|suche/.test(platform)) return "google_removal";
  if (/forum|community/.test(cat)) return "forum_contact";
  if (hit.isProblematic) return "gdpr";
  if (hit.confidence >= 80) return "privacy_request";
  return "cache_removal";
}

/** Step-by-step guide for „Erledige ich selbst“. */
export function selfGuideForUsernameHit(hit: UsernameHit): string[] {
  const p = hit.platform || "der Plattform";
  if (hit.isProblematic || hit.riskLevel === "high") {
    return [
      `Auf ${p} einloggen bzw. das Profil öffnen.`,
      "Profil löschen, anonymisieren oder privat schalten.",
      "Öffentliche Beiträge, Kommentare und Bilder prüfen.",
      "Danach Username Intelligence erneut starten und „Als gelöst markieren“.",
    ];
  }
  return [
    `Kontext auf ${p} öffnen und prüfen, ob der Eintrag zu dir gehört.`,
    "Persönliche Angaben entfernen oder Sichtbarkeit einschränken.",
    "Öffentliche Kommentare und verknüpfte Accounts kontrollieren.",
    "Scan erneut ausführen und bei Bedarf „Als gelöst markieren“.",
  ];
}

/**
 * Maps Username Intelligence hits into the shared IntelligenceHit card model
 * so Username and Google Analysis render the same UI/actions.
 */
export function usernameHitToIntelligenceHit(
  hit: UsernameHit
): IntelligenceHit {
  const confidence = hit.confidence;
  const severity = mapSeverity(hit);
  const confidenceLabel =
    confidence >= 90
      ? "Bestätigt"
      : confidence >= 70
        ? "Hohe Übereinstimmung"
        : confidence >= 50
          ? "Möglicher Treffer"
          : "Schwache Übereinstimmung";

  const whyFound =
    hit.matchChecks
      ?.filter((c) => c.matched)
      .map((c) => c.label)
      .join(" · ") ||
    `Über Username-Suche nach „${hit.queriedUsername ?? hit.queryUsed}“ gefunden.`;

  const whyRelevant =
    confidence >= 70
      ? `Dieser Treffer auf ${hit.platform} passt stark zu deinem Username und sollte geprüft werden.`
      : confidence >= 45
        ? `Dieser Treffer könnte zu dir gehören — prüfe Kontext und Profil auf ${hit.platform}.`
        : `Schwächerer Treffer auf ${hit.platform} — nur bei klarem Bezug relevant.`;

  const recommendation =
    hit.riskLevel === "high" || hit.isProblematic
      ? "Profil prüfen und bei Bedarf Entfernung anstoßen oder SynSight beauftragen."
      : hit.riskLevel === "medium"
        ? "Eintrag bewerten und entscheiden, ob du selbst handelst oder SynSight übernimmt."
        : "Zur Sicherheit prüfen und bei Unsicherheit ignorieren.";

  const now = new Date().toISOString();

  return {
    id: hit.id,
    query: hit.queryUsed || hit.queriedUsername || "",
    title: hit.title || `${hit.platform} · ${hit.profileName ?? "Profil"}`,
    url: hit.profileUrl ?? "",
    snippet: hit.snippet || "Kein Snippet verfügbar.",
    category: hit.category || "social",
    fetchedAt: now,
    source: hit.platform,
    sourceType: "serpapi_google",
    visibility: "public_index",
    relevance: mapRelevance(confidence),
    risk: mapRisk(hit.riskLevel),
    status: confidence >= 70 ? "verified" : "profile_only",
    whyFound,
    whyRelevant,
    visibleData:
      hit.visibleInfo?.length > 0
        ? hit.visibleInfo.join(", ")
        : "Öffentliche Profilinformationen",
    isPublic: true,
    isProblematic: hit.isProblematic,
    risks:
      hit.problemTags?.length > 0
        ? hit.problemTags.join(", ")
        : hit.riskLevel === "high"
          ? "Hohe öffentliche Sichtbarkeit"
          : "Öffentliche Sichtbarkeit",
    canIgnore: true,
    shouldAct: hit.riskLevel !== "low" || hit.isProblematic,
    recommendation,
    displayCategory: hit.category,
    filterCategory: hit.category.toLowerCase().includes("forum")
      ? "forum"
      : hit.category.toLowerCase().includes("social")
        ? "social"
        : "website",
    severity,
    riskPercent:
      severity === "critical"
        ? 92
        : severity === "high"
          ? 75
          : severity === "medium"
            ? 55
            : 28,
    identityConfidence: confidence,
    identityConfidenceLabel: confidenceLabel,
    confidenceChecks: (hit.matchChecks ?? []).map((c) => ({
      label: c.label,
      found: c.matched,
    })),
    firstSeenAt: hit.firstSeen ?? now,
    lastSeenAt: now,
    whyFoundPlain: whyFound,
    whyRelevantPlain: whyRelevant,
    belongsToYou: confidenceLabel,
    isDangerous: hit.isProblematic
      ? "Ja"
      : hit.riskLevel === "high"
        ? "Erhöht"
        : "Gering",
    needsAction:
      hit.riskLevel === "high" || hit.isProblematic
        ? "Ja"
        : hit.riskLevel === "medium"
          ? "Empfohlen"
          : "Optional",
    aiEvaluation: {
      stars:
        confidence >= 90 ? 5 : confidence >= 70 ? 4 : confidence >= 50 ? 3 : 2,
      headline:
        confidence >= 70
          ? `Treffer auf ${hit.platform} gehört mit hoher Wahrscheinlichkeit zu Ihrer Person.`
          : `Bezug zu ${hit.platform} ist unsicher — bitte manuell prüfen.`,
      reasons: (hit.matchChecks ?? [])
        .filter((c) => c.matched)
        .map((c) => c.label)
        .slice(0, 4)
        .concat(
          confidence >= 70
            ? [`Confidence ${confidence}%`]
            : [`Confidence ${confidence}% · unsicher`]
        )
        .slice(0, 4),
      dangers: [
        hit.isProblematic
          ? "Problematischer Inhalt / sensible Daten"
          : "Öffentliche Sichtbarkeit des Profils",
        ...(hit.problemTags ?? []).slice(0, 2),
      ].slice(0, 3),
      recommendation,
    },
  };
}
