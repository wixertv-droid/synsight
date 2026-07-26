import type { IntelligenceHit } from "@/lib/analysis/types";
import type { DigitalExposureFinding } from "@/lib/analysis/digital-exposure/types";
import type { SynSightOrderType } from "@/lib/analysis/username/types";

function mapRisk(
  level: DigitalExposureFinding["riskLevel"]
): IntelligenceHit["risk"] {
  if (level === "high") return "action";
  if (level === "medium") return "review";
  return "watch";
}

function mapSeverity(
  finding: DigitalExposureFinding
): NonNullable<IntelligenceHit["severity"]> {
  if (finding.riskLevel === "high" || finding.type === "PASSWORD_EXPOSURE") {
    return "critical";
  }
  if (finding.riskLevel === "medium") return "high";
  return "medium";
}

export function digitalExposureFindingKey(
  finding: DigitalExposureFinding
): string {
  return [
    finding.type,
    finding.sourceName ?? "",
    finding.title,
    finding.sourceUrl ?? "",
    finding.identifierMasked ?? "",
  ].join("|");
}

export function orderTypeForDigitalExposureFinding(
  finding: DigitalExposureFinding
): SynSightOrderType {
  if (finding.type === "PASSWORD_EXPOSURE" || finding.riskLevel === "high") {
    return "gdpr";
  }
  if (finding.type === "BREACH") return "privacy_request";
  return "cache_removal";
}

export function selfGuideForDigitalExposureFinding(
  finding: DigitalExposureFinding
): string[] {
  const source = finding.sourceName ?? "der Leak-Quelle";
  if (finding.type === "PASSWORD_EXPOSURE") {
    return [
      "Alle betroffenen Passwörter sofort ändern (nicht wiederverwenden).",
      "Zwei-Faktor-Authentifizierung auf wichtigen Konten aktivieren.",
      "Auf verdächtige Logins und Phishing-Mails achten.",
      "Danach „Als gelöst markieren“, wenn die Konten abgesichert sind.",
    ];
  }
  return [
    `Leak-Details zu ${source} prüfen und betroffene Konten identifizieren.`,
    "Passwörter und Sicherheitsfragen der betroffenen Dienste ändern.",
    "Benachrichtigungen / Credit-Monitoring prüfen, falls verfügbar.",
    "Analyse erneut starten und bei Erledigung „Als gelöst markieren“.",
  ];
}

/**
 * Maps Digital Leak findings into the shared IntelligenceHit card model.
 */
export function digitalExposureFindingToIntelligenceHit(
  finding: DigitalExposureFinding
): IntelligenceHit {
  const confidence = finding.confidence ?? 85;
  const severity = mapSeverity(finding);
  const now = new Date().toISOString();
  const attrs =
    finding.attributes?.filter((a) => a.present).map((a) => a.label) ??
    finding.dataClasses;
  const whyFound = attrs.length
    ? `In Leak-Metadaten gefunden: ${attrs.slice(0, 4).join(", ")}.`
    : `Über Digital Leak & Exposure Scan in ${finding.sourceName ?? "einer Quelle"} gefunden.`;
  const recommendation =
    finding.recommendation ||
    (finding.riskLevel === "high"
      ? "Sofort Passwörter ändern und betroffene Konten absichern."
      : "Leak prüfen und bei Bedarf SynSight mit der Bearbeitung beauftragen.");

  return {
    id: digitalExposureFindingKey(finding),
    query: finding.identifierMasked ?? finding.type,
    title: finding.title,
    url: finding.sourceUrl ?? "",
    snippet: finding.description || "Kein Beschreibungstext verfügbar.",
    category: finding.type.toLowerCase(),
    fetchedAt: now,
    source: finding.sourceName ?? "DeHashed",
    sourceType: "dehashed_leak",
    visibility: "public_index",
    relevance: finding.riskLevel === "low" ? "neutral" : "relevant",
    risk: mapRisk(finding.riskLevel),
    status: "verified",
    whyFound,
    whyRelevant:
      finding.riskLevel === "high"
        ? "Hohes Exposure-Risiko — Daten aus einem bestätigten Leak."
        : "Öffentliche Leak-Metadaten können für Phishing oder Account-Übernahme genutzt werden.",
    visibleData: attrs.length ? attrs.join(", ") : "Leak-Metadaten",
    isPublic: true,
    isProblematic:
      finding.riskLevel === "high" || finding.type === "PASSWORD_EXPOSURE",
    risks:
      finding.type === "PASSWORD_EXPOSURE"
        ? "Passwort-Exposition / Credential Stuffing"
        : "Identitäts- und Account-Risiko durch Leak-Daten",
    canIgnore: true,
    shouldAct: finding.riskLevel !== "low",
    recommendation,
    displayCategory:
      finding.type === "BREACH"
        ? "Leak"
        : finding.type === "PASSWORD_EXPOSURE"
          ? "Passwort"
          : finding.type,
    filterCategory: "email",
    severity,
    riskPercent:
      severity === "critical"
        ? 94
        : severity === "high"
          ? 78
          : severity === "medium"
            ? 55
            : 30,
    identityConfidence: confidence,
    identityConfidenceLabel:
      confidence >= 90
        ? "Bestätigt"
        : confidence >= 70
          ? "Hohe Übereinstimmung"
          : "Möglicher Treffer",
    confidenceChecks: attrs.slice(0, 6).map((label) => ({
      label,
      found: true,
    })),
    firstSeenAt: finding.firstSeen ?? finding.sourceDate ?? now,
    lastSeenAt: finding.lastSeen ?? finding.sourceDate ?? now,
    whyFoundPlain: whyFound,
    whyRelevantPlain:
      "Dieser Fund stammt aus geprüften Leak-Metadaten und sollte bewertet werden.",
    belongsToYou:
      confidence >= 90
        ? "Bestätigt"
        : confidence >= 70
          ? "Hohe Übereinstimmung"
          : "Möglicher Treffer",
    isDangerous:
      finding.riskLevel === "high" || finding.type === "PASSWORD_EXPOSURE"
        ? "Ja"
        : finding.riskLevel === "medium"
          ? "Erhöht"
          : "Gering",
    needsAction:
      finding.riskLevel === "high" || finding.type === "PASSWORD_EXPOSURE"
        ? "Ja"
        : finding.riskLevel === "medium"
          ? "Empfohlen"
          : "Optional",
    aiEvaluation: {
      stars:
        confidence >= 90 ? 5 : confidence >= 70 ? 4 : confidence >= 50 ? 3 : 2,
      headline:
        finding.riskLevel === "high"
          ? `Leak bei ${finding.sourceName ?? "unbekannter Quelle"} betrifft Sie mit hoher Wahrscheinlichkeit.`
          : `Exposure-Hinweis zu ${finding.sourceName ?? "einer Quelle"} — bitte prüfen.`,
      reasons: [
        `Typ · ${finding.type}`,
        finding.sourceName
          ? `Quelle · ${finding.sourceName}`
          : "Leak-Metadaten",
        `Confidence ${confidence}%`,
        attrs[0] ? `Merkmal · ${attrs[0]}` : "API-verifiziert",
      ].slice(0, 4),
      dangers: [
        finding.type === "PASSWORD_EXPOSURE"
          ? "Credential Stuffing / Account-Übernahme"
          : "Phishing und Identitätsmissbrauch",
        ...attrs.slice(0, 2),
      ].slice(0, 3),
      recommendation,
    },
  };
}
