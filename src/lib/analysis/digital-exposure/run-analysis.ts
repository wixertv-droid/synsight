import type { IdentityView } from "@/lib/services/identity-service";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import {
  isDehashedConfiguredAndActive,
  resolveDehashedCredentials,
  searchDehashedByEmail,
  searchDehashedByPhone,
  type DehashedBreachSummary,
} from "@/lib/analysis/digital-exposure/dehashed-client";
import { maskEmail, maskPhone } from "@/lib/analysis/digital-exposure/mask";
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

const DEHASHED_URL = "https://dehashed.com/";

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

function riskForBreach(
  breach: DehashedBreachSummary
): DigitalExposureRiskLevel {
  if (breach.hasPasswordExposure || breach.hasHashedPasswordExposure) {
    return "high";
  }
  if (breach.recordCount >= 5) return "high";
  return "medium";
}

function findingsFromEmailBreach(
  email: string,
  breach: DehashedBreachSummary
): DigitalExposureFinding[] {
  const masked = maskEmail(email);
  const risk = riskForBreach(breach);
  const findings: DigitalExposureFinding[] = [
    {
      type: "BREACH",
      title: `Datenleck · ${breach.databaseName}`,
      description: `Bestätigter DeHashed-Treffer in „${breach.databaseName}“ (${breach.recordCount} Datensatz/Datensätze). Keine Passwortwerte gespeichert.`,
      riskLevel: risk,
      sourceName: breach.databaseName,
      sourceDate: null,
      recommendation:
        "Betroffene Konten prüfen, Passwörter ändern und Zwei-Faktor-Authentifizierung aktivieren.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.slice(0, 40),
    },
    {
      type: "EMAIL",
      title: "E-Mail Exposure",
      description: `Adresse in Leak „${breach.databaseName}“ gefunden.`,
      riskLevel: risk === "high" ? "high" : "medium",
      sourceName: breach.databaseName,
      sourceDate: null,
      recommendation:
        "E-Mail auf Phishing prüfen und Wiederverwendung von Passwörtern vermeiden.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) =>
        /e-mail|email|benutzername/i.test(c)
      ),
    },
  ];

  if (breach.hasPasswordExposure || breach.hasHashedPasswordExposure) {
    findings.push({
      type: "PASSWORD_EXPOSURE",
      title: "Passwort Exposure",
      description:
        "Im Leak war ein Passwort bzw. Passwort-Hash gemeldet. Es werden keine Passwortwerte oder Hashes gespeichert oder angezeigt.",
      riskLevel: "high",
      sourceName: breach.databaseName,
      sourceDate: null,
      recommendation:
        "Passwörter bei betroffenen Diensten sofort ändern und nicht wiederverwenden.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) => /passwort/i.test(c)),
    });
  }

  return findings;
}

function findingsFromPhoneBreach(
  phone: string,
  breach: DehashedBreachSummary
): DigitalExposureFinding[] {
  const masked = maskPhone(phone);
  const risk = riskForBreach(breach);
  const findings: DigitalExposureFinding[] = [
    {
      type: "BREACH",
      title: `Datenleck · ${breach.databaseName}`,
      description: `Bestätigter DeHashed-Treffer zur Telefonnummer in „${breach.databaseName}“.`,
      riskLevel: risk,
      sourceName: breach.databaseName,
      sourceDate: null,
      recommendation:
        "Nummer auf Spam-Listen prüfen und sparsam veröffentlichen.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.slice(0, 40),
    },
    {
      type: "PHONE",
      title: "Telefon Exposure",
      description: `Nummer in Leak „${breach.databaseName}“ gefunden.`,
      riskLevel: risk === "high" ? "high" : "medium",
      sourceName: breach.databaseName,
      sourceDate: null,
      recommendation:
        "Bei verdächtigen Anrufen Rufnummer-Sperre und Anbieter-Portale nutzen.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) => /telefon/i.test(c)),
    },
  ];

  if (breach.hasPasswordExposure || breach.hasHashedPasswordExposure) {
    findings.push({
      type: "PASSWORD_EXPOSURE",
      title: "Passwort Exposure",
      description:
        "Im zugehörigen Leak waren Passwort-Daten gemeldet (Werte werden nicht gespeichert).",
      riskLevel: "high",
      sourceName: breach.databaseName,
      sourceDate: null,
      recommendation:
        "Passwörter bei betroffenen Diensten ändern und 2FA aktivieren.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) => /passwort/i.test(c)),
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
  }. Nur echte DeHashed-Treffer — keine Vermutungen, keine Passwortwerte.`;
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
  const configured = await isDehashedConfiguredAndActive();
  if (!configured) {
    throw new DigitalExposureUnavailableError(
      "Digital Leak & Exposure Scan ist aktuell nicht verfügbar. Bitte wenden Sie sich an den Administrator."
    );
  }

  const credentials = await resolveDehashedCredentials();
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

  // Ensure scan tables exist before first insert (migrate may have been skipped)
  const { ensureDigitalExposureSchema } =
    await import("@/lib/analysis/digital-exposure/ensure-schema");
  const schemaOk = await ensureDigitalExposureSchema(true);
  if (!schemaOk) {
    throw new Error(
      "Digital-Leak-Datenbanktabellen fehlen. Bitte auf dem Server `npm run db:ensure-catalog` ausführen."
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
      const result = await searchDehashedByEmail(email, credentials.apiKey);
      await writeApiUsageLog({
        provider: "dehashed",
        requestType: "search_email",
        userId: options.userId,
        analysisId: scanId,
        analysisKey: "digital_leak_exposure",
        success: true,
        detail: `email=${maskEmail(email)} · breaches=${result.breaches.length}`,
      });
      await recordApiUsageEvent({
        providerCode: "dehashed",
        eventType: "search_email",
        referenceKey: `scan:${scanId}`,
        userId: options.userId,
        analysisId: scanId,
        success: true,
        detail: `breaches=${result.breaches.length}`,
        metaJson: { identifierMasked: maskEmail(email) },
      });

      if (result.breaches.length === 0) {
        findings.push({
          type: "EMAIL",
          title: "E-Mail Exposure",
          description:
            "Keine bekannten Datenlecks zu diesem Identifikator gefunden.",
          riskLevel: "low",
          sourceName: "DeHashed",
          sourceDate: null,
          recommendation: null,
          sourceUrl: DEHASHED_URL,
          identifierMasked: maskEmail(email),
          dataClasses: [],
        });
      } else {
        for (const breach of result.breaches) {
          findings.push(...findingsFromEmailBreach(email, breach));
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "DeHashed error";
      await writeApiUsageLog({
        provider: "dehashed",
        requestType: "search_email",
        userId: options.userId,
        analysisId: scanId,
        analysisKey: "digital_leak_exposure",
        success: false,
        detail: detail.slice(0, 500),
      });
      await recordApiUsageEvent({
        providerCode: "dehashed",
        eventType: "search_email",
        referenceKey: `scan:${scanId}`,
        userId: options.userId,
        analysisId: scanId,
        success: false,
        detail: detail.slice(0, 500),
      });
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  for (const phone of phones) {
    try {
      const result = await searchDehashedByPhone(phone, credentials.apiKey);
      await writeApiUsageLog({
        provider: "dehashed",
        requestType: "search_phone",
        userId: options.userId,
        analysisId: scanId,
        analysisKey: "digital_leak_exposure",
        success: true,
        detail: `phone=${maskPhone(phone)} · breaches=${result.breaches.length}`,
      });
      await recordApiUsageEvent({
        providerCode: "dehashed",
        eventType: "search_phone",
        referenceKey: `scan:${scanId}`,
        userId: options.userId,
        analysisId: scanId,
        success: true,
        detail: `breaches=${result.breaches.length}`,
        metaJson: { identifierMasked: maskPhone(phone) },
      });

      if (result.breaches.length === 0) {
        findings.push({
          type: "PHONE",
          title: "Telefon Exposure",
          description:
            "Keine bekannten Datenlecks zu diesem Identifikator gefunden.",
          riskLevel: "low",
          sourceName: "DeHashed",
          sourceDate: null,
          recommendation:
            "Telefonnummer sparsam veröffentlichen und bei Spam-Verdacht Anbieter-Portale prüfen.",
          sourceUrl: DEHASHED_URL,
          identifierMasked: maskPhone(phone),
          dataClasses: [],
        });
      } else {
        for (const breach of result.breaches) {
          findings.push(...findingsFromPhoneBreach(phone, breach));
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "DeHashed error";
      await writeApiUsageLog({
        provider: "dehashed",
        requestType: "search_phone",
        userId: options.userId,
        analysisId: scanId,
        analysisKey: "digital_leak_exposure",
        success: false,
        detail: detail.slice(0, 500),
      });
      await recordApiUsageEvent({
        providerCode: "dehashed",
        eventType: "search_phone",
        referenceKey: `scan:${scanId}`,
        userId: options.userId,
        analysisId: scanId,
        success: false,
        detail: detail.slice(0, 500),
      });
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  findings.push({
    type: "SOURCE",
    title: "Quellenbasis",
    description:
      "Auswertung über DeHashed.com Search API. Es werden ausschließlich Metadaten gespeichert — keine Passwörter und keine Passwort-Hashes.",
    riskLevel: "low",
    sourceName: "DeHashed",
    sourceDate: null,
    recommendation: null,
    sourceUrl: DEHASHED_URL,
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
    providerLabel: "DeHashed",
  };
}
