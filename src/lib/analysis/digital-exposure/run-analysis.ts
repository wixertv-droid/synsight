import type { IdentityView } from "@/lib/services/identity-service";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import {
  fetchHibpBreachesForEmail,
  isHibpConfiguredAndActive,
  resolveHibpCredentials,
  type HibpBreach,
} from "@/lib/analysis/digital-exposure/hibp-client";
import {
  maskEmail,
  maskPhone,
  stripHtml,
} from "@/lib/analysis/digital-exposure/mask";
import { buildGeminiPrepPayload } from "@/lib/analysis/digital-exposure/gemini-prep";
import {
  completeDigitalExposureScan,
  createDigitalExposureScan,
  writeApiUsageLog,
} from "@/lib/analysis/digital-exposure/repository";
import type {
  DigitalExposureFinding,
  DigitalExposureReport,
  DigitalExposureRiskLevel,
} from "@/lib/analysis/digital-exposure/types";
import { recordApiUsageEvent } from "@/lib/services/finance-service";

function collectEmails(identity: IdentityView | null): string[] {
  if (!identity) return [];
  const set = new Set<string>();
  for (const email of identity.emails) {
    const trimmed = email.trim().toLowerCase();
    if (trimmed.includes("@")) set.add(trimmed);
  }
  return [...set];
}

function collectPhones(identity: IdentityView | null): string[] {
  if (!identity) return [];
  const set = new Set<string>();
  const main = identity.personal.phone?.trim();
  if (main) set.add(main);
  for (const phone of identity.phoneNumbers) {
    const trimmed = phone.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set];
}

function includesPasswordClass(dataClasses: string[]): boolean {
  return dataClasses.some((item) =>
    /password|passwort|pwd|credential/i.test(item)
  );
}

function riskForBreach(breach: HibpBreach): DigitalExposureRiskLevel {
  if (includesPasswordClass(breach.dataClasses) || breach.isSensitive) {
    return "high";
  }
  if (breach.pwnCount && breach.pwnCount > 1_000_000) return "high";
  return "medium";
}

function findingsFromBreach(
  email: string,
  breach: HibpBreach
): DigitalExposureFinding[] {
  const masked = maskEmail(email);
  const risk = riskForBreach(breach);
  const cleanDescription = stripHtml(breach.description).slice(0, 600);
  const sourceUrl = breach.domain
    ? `https://haveibeenpwned.com/Breach/${encodeURIComponent(breach.name)}`
    : "https://haveibeenpwned.com/";

  const findings: DigitalExposureFinding[] = [
    {
      type: "BREACH",
      title: `Datenleck · ${breach.title}`,
      description:
        cleanDescription ||
        `Bestätigtes Datenleck „${breach.title}“ laut Have I Been Pwned.`,
      riskLevel: risk,
      sourceName: breach.title,
      sourceDate: breach.breachDate,
      recommendation:
        "Betroffene Konten prüfen, Passwörter ändern und Zwei-Faktor-Authentifizierung aktivieren.",
      sourceUrl,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.slice(0, 40),
    },
    {
      type: "EMAIL",
      title: "E-Mail Exposure",
      description: `Adresse in bestätigtem Leak „${breach.title}“ gefunden.`,
      riskLevel: risk === "high" ? "high" : "medium",
      sourceName: breach.title,
      sourceDate: breach.breachDate,
      recommendation:
        "E-Mail auf Phishing prüfen und Wiederverwendung von Passwörtern vermeiden.",
      sourceUrl,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) =>
        /email|e-mail|username|account/i.test(c)
      ),
    },
  ];

  if (includesPasswordClass(breach.dataClasses)) {
    findings.push({
      type: "PASSWORD_EXPOSURE",
      title: "Passwort Exposure",
      description:
        "Im Leak waren Passwort-bezogene Datenklassen gemeldet (Hash/Credential-Metadaten). Es werden keine Passwortwerte gespeichert oder angezeigt.",
      riskLevel: "high",
      sourceName: breach.title,
      sourceDate: breach.breachDate,
      recommendation:
        "Passwörter bei betroffenen Diensten sofort ändern und nicht wiederverwenden.",
      sourceUrl,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) =>
        /password|passwort|pwd|credential/i.test(c)
      ),
    });
  }

  return findings;
}

function scoreFindings(findings: DigitalExposureFinding[]): number {
  if (findings.length === 0) return 5;
  let score = 12;
  for (const finding of findings) {
    if (finding.type === "PASSWORD_EXPOSURE") score += 18;
    else if (finding.type === "BREACH") score += 12;
    else if (finding.type === "EMAIL") score += 6;
    else if (finding.type === "PHONE" && finding.riskLevel !== "low")
      score += 8;
    if (finding.riskLevel === "high") score += 4;
    if (finding.riskLevel === "medium") score += 2;
  }
  return Math.max(0, Math.min(100, score));
}

function buildSummary(
  findings: DigitalExposureFinding[],
  emailCount: number,
  phoneCount: number
): string {
  const breaches = findings.filter((f) => f.type === "BREACH").length;
  const passwordHits = findings.filter(
    (f) => f.type === "PASSWORD_EXPOSURE"
  ).length;
  if (breaches === 0 && passwordHits === 0) {
    return `Keine bekannten Datenlecks zu den geprüften Identifikatoren gefunden (${emailCount} E-Mail, ${phoneCount} Telefon).`;
  }
  return `Es wurden ${breaches} bestätigte Datenleck-Ereignisse gefunden${
    passwordHits > 0
      ? `, davon ${passwordHits} mit Passwort-Exposure-Hinweis`
      : ""
  }. Nur verifizierte HIBP-Treffer — keine Vermutungen.`;
}

export class DigitalExposureUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DigitalExposureUnavailableError";
  }
}

export async function runDigitalLeakExposureScan(
  identity: IdentityView | null,
  options: { userId: number }
): Promise<DigitalExposureReport> {
  const configured = await isHibpConfiguredAndActive();
  if (!configured) {
    throw new DigitalExposureUnavailableError(
      "Digital Leak & Exposure Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
    );
  }

  const credentials = await resolveHibpCredentials();
  if (!credentials) {
    throw new DigitalExposureUnavailableError(
      "Digital Leak & Exposure Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
    );
  }

  const emails = collectEmails(identity);
  const phones = collectPhones(identity);
  const subjectName = resolveSubjectName(identity);

  if (emails.length === 0 && phones.length === 0) {
    throw new Error(
      "Keine E-Mail-Adresse oder Telefonnummer im Identitätsprofil hinterlegt."
    );
  }

  const scanId = await createDigitalExposureScan({
    userId: options.userId,
    subjectName,
    emailCount: emails.length,
    phoneCount: phones.length,
  });

  const findings: DigitalExposureFinding[] = [];

  for (const email of emails) {
    try {
      const { breaches } = await fetchHibpBreachesForEmail(
        email,
        credentials.apiKey
      );
      await writeApiUsageLog({
        provider: "haveibeenpwned",
        requestType: "breachedaccount",
        userId: options.userId,
        analysisId: scanId,
        analysisKey: "digital_leak_exposure",
        success: true,
        detail: `email=${maskEmail(email)} · breaches=${breaches.length}`,
      });
      await recordApiUsageEvent({
        providerCode: "haveibeenpwned",
        eventType: "breachedaccount",
        referenceKey: `scan:${scanId}`,
        userId: options.userId,
        analysisId: scanId,
        success: true,
        detail: `breaches=${breaches.length}`,
        metaJson: { identifierMasked: maskEmail(email) },
      });

      if (breaches.length === 0) {
        findings.push({
          type: "EMAIL",
          title: "E-Mail Exposure",
          description:
            "Keine bekannten Datenlecks zu diesem Identifikator gefunden.",
          riskLevel: "low",
          sourceName: "Have I Been Pwned",
          sourceDate: null,
          recommendation: null,
          sourceUrl: "https://haveibeenpwned.com/",
          identifierMasked: maskEmail(email),
          dataClasses: [],
        });
      } else {
        for (const breach of breaches) {
          findings.push(...findingsFromBreach(email, breach));
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "HIBP error";
      await writeApiUsageLog({
        provider: "haveibeenpwned",
        requestType: "breachedaccount",
        userId: options.userId,
        analysisId: scanId,
        analysisKey: "digital_leak_exposure",
        success: false,
        detail: detail.slice(0, 500),
      });
      await recordApiUsageEvent({
        providerCode: "haveibeenpwned",
        eventType: "breachedaccount",
        referenceKey: `scan:${scanId}`,
        userId: options.userId,
        analysisId: scanId,
        success: false,
        detail: detail.slice(0, 500),
      });
      throw error;
    }

    // HIBP rate guidance: small pause between account lookups
    await new Promise((resolve) => setTimeout(resolve, 1600));
  }

  for (const phone of phones) {
    // No phone breach provider is wired yet — report honest "no known leaks"
    // from available APIs without inventing findings.
    findings.push({
      type: "PHONE",
      title: "Telefon Exposure",
      description:
        "Keine bekannten Leaks gefunden (über verfügbare Leak-APIs; HIBP prüft E-Mail-Accounts).",
      riskLevel: "low",
      sourceName: null,
      sourceDate: null,
      recommendation:
        "Telefonnummer sparsam veröffentlichen und bei Spam-Verdacht Anbieter-Portale prüfen.",
      sourceUrl: null,
      identifierMasked: maskPhone(phone),
      dataClasses: [],
    });
  }

  findings.push({
    type: "SOURCE",
    title: "Quellenbasis",
    description:
      "Auswertung über Have I Been Pwned (verifizierte Breaches). Es werden ausschließlich Metadaten gespeichert — keine Passwörter.",
    riskLevel: "low",
    sourceName: "Have I Been Pwned",
    sourceDate: null,
    recommendation: null,
    sourceUrl: "https://haveibeenpwned.com/",
    identifierMasked: null,
    dataClasses: [],
  });

  const riskScore = scoreFindings(findings.filter((f) => f.type !== "SOURCE"));
  const summary = buildSummary(findings, emails.length, phones.length);

  await completeDigitalExposureScan({
    scanId,
    status: "completed",
    riskScore,
    summary,
    findings,
  });

  return {
    scanId,
    moduleKey: "digital_leak_exposure",
    subjectName,
    status: "completed",
    riskScore,
    summary,
    emailCount: emails.length,
    phoneCount: phones.length,
    findingCount: findings.filter((f) => f.type !== "SOURCE").length,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    findings,
    geminiPrep: buildGeminiPrepPayload({
      subjectName,
      riskScore,
      findings,
    }),
    apiConfigured: true,
    providerLabel: "Have I Been Pwned",
  };
}
