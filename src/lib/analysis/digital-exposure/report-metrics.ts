import type {
  DigitalExposureActionItem,
  DigitalExposureFinding,
  DigitalExposureManagementOverview,
  DigitalExposureRiskLevel,
  DigitalExposureThreatMatrix,
} from "@/lib/analysis/digital-exposure/types";
import { AI_SUMMARY_FINDING_TITLE } from "@/lib/analysis/digital-exposure/types";

export function isAiSummaryFinding(finding: DigitalExposureFinding): boolean {
  return (
    finding.type === "SOURCE" && finding.title === AI_SUMMARY_FINDING_TITLE
  );
}

export function extractAiSummary(
  findings: DigitalExposureFinding[]
): string | null {
  const hit = findings.find(isAiSummaryFinding);
  const text = hit?.description?.trim();
  return text && text.length > 40 ? text : null;
}

export function visibleFindings(
  findings: DigitalExposureFinding[]
): DigitalExposureFinding[] {
  return findings.filter((f) => f.type !== "SOURCE" && !isAiSummaryFinding(f));
}

export function breachFindings(
  findings: DigitalExposureFinding[]
): DigitalExposureFinding[] {
  return visibleFindings(findings).filter((f) => f.type === "BREACH");
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(key);
  }
  return out;
}

export function buildManagementOverview(
  findings: DigitalExposureFinding[],
  riskScore: number
): DigitalExposureManagementOverview {
  const visible = visibleFindings(findings);
  const breaches = visible.filter((f) => f.type === "BREACH");
  const sources = uniqueLabels(
    breaches.map((f) => f.sourceName ?? f.title).filter(Boolean) as string[]
  );

  const categorySet = new Set<string>();
  let attributeCount = 0;
  let hasPasswordHints = false;
  let hasPublicEmail = false;
  let hasPublicPhone = false;

  for (const finding of visible) {
    for (const label of finding.dataClasses) {
      categorySet.add(label);
      if (/passwort/i.test(label)) hasPasswordHints = true;
      if (/e-?mail/i.test(label)) hasPublicEmail = true;
      if (/telefon/i.test(label)) hasPublicPhone = true;
    }
    if (finding.attributes?.length) {
      for (const attr of finding.attributes) {
        if (!attr.present) continue;
        attributeCount += 1;
        categorySet.add(attr.label);
        if (attr.key === "password" || attr.key === "hashed_password") {
          hasPasswordHints = true;
        }
        if (attr.key === "email") hasPublicEmail = true;
        if (attr.key === "phone") hasPublicPhone = true;
      }
    } else {
      attributeCount += finding.dataClasses.length;
    }
  }

  const overallRisk: DigitalExposureRiskLevel =
    riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";
  const overallRiskLabel =
    overallRisk === "high"
      ? "HOCH"
      : overallRisk === "medium"
        ? "MITTEL"
        : "NIEDRIG";
  const threatLevel =
    overallRisk === "high"
      ? "HIGH"
      : overallRisk === "medium"
        ? "MEDIUM"
        : "LOW";

  const confidence =
    breaches.length === 0
      ? 40
      : Math.min(
          99,
          88 +
            Math.min(
              10,
              breaches.filter((b) => (b.confidence ?? 90) >= 90).length
            )
        );

  const exposedCategories = uniqueLabels([
    ...categorySet,
    ...(hasPublicEmail ? ["E-Mail-Adressen"] : []),
    ...(hasPublicPhone ? ["Telefonnummern"] : []),
    ...(hasPasswordHints ? ["Passwort-Hinweise"] : []),
  ]).slice(0, 16);

  const headline =
    sources.length === 0
      ? "Für die analysierte Identität wurden in den geprüften DeHashed-Quellen keine bestätigten Datenlecks gefunden."
      : sources.length === 1
        ? `Für die analysierte Identität wurden bestätigte Datenspuren in der Quelle „${sources[0]}“ gefunden.`
        : `Für die analysierte Identität wurden bestätigte Datenspuren in mehreren bekannten Datenquellen gefunden.`;

  return {
    headline,
    overallRisk,
    overallRiskLabel,
    identityExposure: riskScore,
    threatLevel,
    confidence,
    confirmedSources: sources.length,
    exposedAttributeCount: attributeCount,
    exposedCategories,
    hasPasswordHints,
    hasPublicEmail,
    hasPublicPhone,
  };
}

export function buildThreatMatrix(
  findings: DigitalExposureFinding[],
  riskScore: number
): DigitalExposureThreatMatrix {
  const visible = visibleFindings(findings);
  const hasPassword = visible.some(
    (f) =>
      f.type === "PASSWORD_EXPOSURE" ||
      f.dataClasses.some((c) => /passwort/i.test(c)) ||
      f.attributes?.some(
        (a) =>
          a.present && (a.key === "password" || a.key === "hashed_password")
      )
  );
  const hasEmail = visible.some(
    (f) =>
      f.type === "EMAIL" ||
      f.dataClasses.some((c) => /e-?mail/i.test(c)) ||
      f.attributes?.some((a) => a.present && a.key === "email")
  );
  const hasPhone = visible.some(
    (f) =>
      f.type === "PHONE" ||
      f.dataClasses.some((c) => /telefon/i.test(c)) ||
      f.attributes?.some((a) => a.present && a.key === "phone")
  );
  const breachCount = visible.filter((f) => f.type === "BREACH").length;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const credentialStuffing = clamp(
    (hasPassword ? 55 : 10) + breachCount * 8 + (hasEmail ? 12 : 0)
  );
  const phishing = clamp(
    (hasEmail ? 40 : 8) + breachCount * 6 + riskScore * 0.15
  );
  const spam = clamp((hasEmail || hasPhone ? 35 : 5) + breachCount * 5);
  const socialEngineering = clamp(
    (hasEmail ? 25 : 5) + (hasPhone ? 20 : 0) + breachCount * 7
  );
  const identityTheft = clamp(
    riskScore * 0.55 + (hasPassword ? 20 : 0) + breachCount * 5
  );
  const accountTakeover = clamp(
    (hasPassword ? 50 : 8) + (hasEmail ? 15 : 0) + breachCount * 8
  );
  const simSwapping = clamp((hasPhone ? 45 : 5) + (hasPassword ? 10 : 0));

  const overall = clamp(
    (credentialStuffing +
      phishing +
      spam +
      socialEngineering +
      identityTheft +
      accountTakeover +
      simSwapping) /
      7
  );

  return {
    credentialStuffing,
    phishing,
    spam,
    socialEngineering,
    identityTheft,
    accountTakeover,
    simSwapping,
    overall,
  };
}

export function buildActionPlan(
  findings: DigitalExposureFinding[],
  overview: DigitalExposureManagementOverview
): DigitalExposureActionItem[] {
  const actions: DigitalExposureActionItem[] = [];
  const breaches = breachFindings(findings);
  const passwordSources = uniqueLabels(
    findings
      .filter(
        (f) =>
          f.type === "PASSWORD_EXPOSURE" ||
          f.dataClasses.some((c) => /passwort/i.test(c))
      )
      .map((f) => f.sourceName ?? "")
      .filter(Boolean)
  );

  if (passwordSources.length > 0) {
    actions.push({
      priority: "SOFORT",
      title: "Passwörter der betroffenen Dienste ändern",
      why: `In ${passwordSources.length} Quelle(n) wurden Passwort-Hinweise gemeldet (${passwordSources.slice(0, 3).join(", ")}).`,
      riskReduced: "Credential Stuffing und Account-Übernahme",
      how: "Pro betroffenem Dienst ein neues, einzigartiges Passwort setzen und Passwort-Manager nutzen. Alte Passwörter nirgends wiederverwenden.",
      effort: "15–45 Min.",
      difficulty: "Niedrig",
      benefit: "Sperrt geleakte Zugangsdaten sofort aus.",
      relatedSource: passwordSources[0] ?? null,
    });
    actions.push({
      priority: "SOFORT",
      title: "Zwei-Faktor-Authentifizierung aktivieren",
      why: "Passwort-Exposure allein reicht Angreifern oft nicht, wenn 2FA aktiv ist.",
      riskReduced: "Account-Übernahme trotz geleaktem Passwort",
      how: "2FA (App oder Hardware-Key) bei E-Mail, Cloud, Social und Banking aktivieren. SMS-2FA nur als Fallback.",
      effort: "10–30 Min.",
      difficulty: "Niedrig",
      benefit: "Blockiert Login ohne zweiten Faktor.",
      relatedSource: passwordSources[0] ?? null,
    });
  }

  if (overview.hasPublicEmail) {
    actions.push({
      priority: passwordSources.length > 0 ? "HOCH" : "SOFORT",
      title: "E-Mail auf Phishing und Weiterleitung prüfen",
      why: "Geleakte E-Mail-Adressen werden gezielt für Phishing und Credential Stuffing genutzt.",
      riskReduced: "Phishing und Social Engineering",
      how: "Posteingang/Spam auf verdächtige Reset-Mails prüfen, Weiterleitungsregeln kontrollieren, verdächtige Absender melden.",
      effort: "10–20 Min.",
      difficulty: "Niedrig",
      benefit: "Früherkennung von Übernahmeversuchen.",
      relatedSource: breaches[0]?.sourceName ?? null,
    });
  }

  if (overview.hasPublicPhone) {
    actions.push({
      priority: "HOCH",
      title: "Telefonnummer gegen SIM-Swap und Spam absichern",
      why: "Telefonnummern in Leaks erhöhen SIM-Swapping- und Spam-Risiko.",
      riskReduced: "SIM-Swapping und Spam",
      how: "PIN/Passwort beim Mobilfunkanbieter setzen, Rufnummernmitnahme absichern, Spam-Filter aktivieren.",
      effort: "15–40 Min.",
      difficulty: "Mittel",
      benefit: "Erschwert Rufnummern-Übernahme.",
      relatedSource:
        findings.find((f) => f.type === "PHONE")?.sourceName ?? null,
    });
  }

  if (breaches.length > 0) {
    actions.push({
      priority: "MITTEL",
      title: "Betroffene Accounts inventarisieren",
      why: `${breaches.length} bestätigte Leak-Quelle(n) können weitere Konten betreffen, die dieselbe Identität nutzen.`,
      riskReduced: "Identitätsdiebstahl und laterale Account-Übernahme",
      how: "Liste aller Dienste mit gleicher E-Mail/Telefon erstellen und Login-Historie prüfen.",
      effort: "20–60 Min.",
      difficulty: "Mittel",
      benefit: "Vollständige Abdeckung statt punktuellem Fix.",
      relatedSource: breaches[0]?.sourceName ?? null,
    });
  }

  actions.push({
    priority: "OPTIONAL",
    title: "Digitale Exposure regelmäßig neu scannen",
    why: "Neue Collections können nachträglich Identifikatoren aufnehmen.",
    riskReduced: "Späte Entdeckung neuer Leaks",
    how: "Digital Leak & Exposure Scan nach größeren Profiländerungen oder quartalsweise wiederholen.",
    effort: "5 Min.",
    difficulty: "Niedrig",
    benefit: "Frühwarnung bei neuen Treffern.",
    relatedSource: null,
  });

  const order: Record<DigitalExposureActionItem["priority"], number> = {
    SOFORT: 0,
    HOCH: 1,
    MITTEL: 2,
    OPTIONAL: 3,
  };
  return actions.sort((a, b) => order[a.priority] - order[b.priority]);
}

export function buildProfessionalSummary(
  overview: DigitalExposureManagementOverview
): string {
  return overview.headline;
}
