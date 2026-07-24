import type { IntelligenceHit } from "@/lib/analysis/types";

export interface ThreatMatrix {
  identityRisk: number;
  socialEngineeringRisk: number;
  privacyRisk: number;
  reputationRisk: number;
  leakRisk: number;
  fraudRisk: number;
  impersonationRisk: number;
  overall: number;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * ThreatEvaluator — einzelne Risikodimensionen aus belegten Treffern.
 */
export function evaluateThreatMatrix(hits: IntelligenceHit[]): ThreatMatrix {
  const live = hits.filter((h) => h.sourceType === "serpapi_google");
  const verified = live.filter((h) => (h.identityConfidence ?? 0) >= 70);
  const blob = verified
    .map((h) => `${h.title} ${h.snippet} ${h.url}`.toLowerCase())
    .join(" ");

  const hasEmail = /@|e-?mail/.test(blob);
  const hasPhone = /\+?\d[\d\s/-]{6,}/.test(blob);
  const hasAddress = /straße|strasse|plz|\b\d{5}\b|wohnort|adresse/.test(blob);
  const hasDating = /dating|tinder|badoo|parship|elitepartner|lovescout/.test(
    blob
  );
  const hasAdult =
    /porn|xxx|escort|adult|sexcam|onlyfans|pornhub|xhamster/.test(blob);
  const hasLeak = /leak|pastebin|breach|dump|geleakt|datenleck/.test(blob);
  const hasFraud = /betrug|scam|inkasso|schuldner|abofalle/.test(blob);
  const hasSocial = /linkedin|facebook|instagram|xing|twitter|forum/.test(blob);
  const hasImpersonation =
    /fake|imposter|nachahm|profil kopie|identitätsdiebstahl/.test(blob);
  const docCount = verified.filter((h) =>
    /\.pdf|dokument|urteil|bescheid/i.test(`${h.url} ${h.title}`)
  ).length;

  const identityRisk = clamp(
    verified.length * 4 +
      (hasEmail ? 18 : 0) +
      (hasPhone ? 22 : 0) +
      (hasAddress ? 20 : 0)
  );
  const socialEngineeringRisk = clamp(
    (hasSocial ? 25 : 0) +
      (hasEmail ? 20 : 0) +
      (hasPhone ? 25 : 0) +
      verified.length * 2
  );
  const privacyRisk = clamp(
    (hasEmail ? 30 : 0) +
      (hasPhone ? 30 : 0) +
      (hasAddress ? 35 : 0) +
      docCount * 8
  );
  const reputationRisk = clamp(
    (hasAdult ? 55 : 0) +
      (hasDating ? 25 : 0) +
      (hasFraud ? 40 : 0) +
      verified.filter((h) => h.severity === "critical").length * 12
  );
  const leakRisk = clamp((hasLeak ? 70 : 0) + docCount * 10);
  const fraudRisk = clamp(
    (hasFraud ? 65 : 0) + (hasPhone && hasEmail ? 15 : 0)
  );
  const impersonationRisk = clamp(
    (hasImpersonation ? 60 : 0) + (hasSocial ? 15 : 0) + verified.length
  );

  const overall = clamp(
    identityRisk * 0.2 +
      socialEngineeringRisk * 0.15 +
      privacyRisk * 0.2 +
      reputationRisk * 0.15 +
      leakRisk * 0.1 +
      fraudRisk * 0.1 +
      impersonationRisk * 0.1
  );

  return {
    identityRisk,
    socialEngineeringRisk,
    privacyRisk,
    reputationRisk,
    leakRisk,
    fraudRisk,
    impersonationRisk,
    overall,
  };
}

export function detectSensitiveCategories(hits: IntelligenceHit[]): string[] {
  const found = new Set<string>();
  for (const hit of hits) {
    const blob = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
    if (/porn|xxx|escort|adult|onlyfans|pornhub|xhamster/.test(blob)) {
      found.add("Pornografische / Adult-Inhalte");
    }
    if (/dating|tinder|badoo|parship|elitepartner|lovescout/.test(blob)) {
      found.add("Datingportale");
    }
    if (/escort/.test(blob)) found.add("Escortseiten");
    if (/leak|pastebin|breach|datenleck/.test(blob)) found.add("Leaks");
    if (/betrug|scam|inkasso/.test(blob)) found.add("Betrug / Inkasso");
    if (/\.pdf|urteil|bescheid|dokument/.test(blob)) {
      found.add("Öffentliche Dokumente");
    }
  }
  return [...found];
}
