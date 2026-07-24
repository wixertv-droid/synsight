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
  buildActionPlan,
  buildManagementOverview,
  buildProfessionalSummary,
  buildThreatMatrix,
} from "@/lib/analysis/digital-exposure/report-metrics";
import {
  completeDigitalExposureScan,
  createDigitalExposureScan,
  failDigitalExposureScan,
  writeApiUsageLog,
} from "@/lib/analysis/digital-exposure/repository";
import {
  AI_SUMMARY_FINDING_TITLE,
  type DigitalExposureFinding,
  type DigitalExposureReport,
  type DigitalExposureRiskLevel,
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
  const confidence =
    breach.hasPasswordExposure || breach.hasHashedPasswordExposure ? 98 : 92;
  const findings: DigitalExposureFinding[] = [
    {
      type: "BREACH",
      title: breach.databaseName,
      description: `Bestätigter DeHashed-Treffer in „${breach.databaseName}“ (${breach.recordCount} Datensatz/Datensätze). Alle angezeigten Merkmale stammen aus der API — keine Passwortwerte gespeichert.`,
      riskLevel: risk,
      sourceName: breach.databaseName,
      sourceDate: breach.sourceDate,
      recommendation:
        "Betroffene Konten prüfen, Passwörter ändern und Zwei-Faktor-Authentifizierung aktivieren.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.slice(),
      attributes: breach.attributes,
      recordCount: breach.recordCount,
      confidence,
      hashType: breach.hashType,
      collection: breach.collection,
      firstSeen: breach.firstSeen,
      lastSeen: breach.lastSeen,
      obtainedFrom: breach.obtainedFrom,
    },
    {
      type: "EMAIL",
      title: "E-Mail Exposure",
      description: `Adresse in Leak „${breach.databaseName}“ gefunden.`,
      riskLevel: risk === "high" ? "high" : "medium",
      sourceName: breach.databaseName,
      sourceDate: breach.sourceDate,
      recommendation:
        "E-Mail auf Phishing prüfen und Wiederverwendung von Passwörtern vermeiden.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) =>
        /e-mail|email|benutzername/i.test(c)
      ),
      attributes: breach.attributes.filter((a) =>
        ["email", "username", "alias"].includes(a.key)
      ),
      recordCount: breach.recordCount,
      confidence,
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
      sourceDate: breach.sourceDate,
      recommendation:
        "Passwörter bei betroffenen Diensten sofort ändern und nicht wiederverwenden.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) => /passwort|hash/i.test(c)),
      attributes: breach.attributes.filter((a) =>
        ["password", "hashed_password", "hash_type"].includes(a.key)
      ),
      recordCount: breach.recordCount,
      confidence: 99,
      hashType: breach.hashType,
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
  const confidence =
    breach.hasPasswordExposure || breach.hasHashedPasswordExposure ? 98 : 92;
  const findings: DigitalExposureFinding[] = [
    {
      type: "BREACH",
      title: breach.databaseName,
      description: `Bestätigter DeHashed-Treffer zur Telefonnummer in „${breach.databaseName}“ (${breach.recordCount} Datensatz/Datensätze).`,
      riskLevel: risk,
      sourceName: breach.databaseName,
      sourceDate: breach.sourceDate,
      recommendation:
        "Nummer auf Spam-Listen prüfen und sparsam veröffentlichen.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.slice(),
      attributes: breach.attributes,
      recordCount: breach.recordCount,
      confidence,
      hashType: breach.hashType,
      collection: breach.collection,
      firstSeen: breach.firstSeen,
      lastSeen: breach.lastSeen,
      obtainedFrom: breach.obtainedFrom,
    },
    {
      type: "PHONE",
      title: "Telefon Exposure",
      description: `Nummer in Leak „${breach.databaseName}“ gefunden.`,
      riskLevel: risk === "high" ? "high" : "medium",
      sourceName: breach.databaseName,
      sourceDate: breach.sourceDate,
      recommendation:
        "Bei verdächtigen Anrufen Rufnummer-Sperre und Anbieter-Portale nutzen.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) => /telefon/i.test(c)),
      attributes: breach.attributes.filter((a) => a.key === "phone"),
      recordCount: breach.recordCount,
      confidence,
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
      sourceDate: breach.sourceDate,
      recommendation:
        "Passwörter bei betroffenen Diensten ändern und 2FA aktivieren.",
      sourceUrl: DEHASHED_URL,
      identifierMasked: masked,
      dataClasses: breach.dataClasses.filter((c) => /passwort|hash/i.test(c)),
      attributes: breach.attributes.filter((a) =>
        ["password", "hashed_password", "hash_type"].includes(a.key)
      ),
      recordCount: breach.recordCount,
      confidence: 99,
      hashType: breach.hashType,
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

function buildSummary(findings: DigitalExposureFinding[]): string {
  const riskScore = scoreFindings(findings.filter((f) => f.type !== "SOURCE"));
  return buildProfessionalSummary(buildManagementOverview(findings, riskScore));
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

  try {
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
        const detail =
          error instanceof Error ? error.message : "DeHashed error";
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
        // Continue with remaining identifiers — one bad lookup must not abort all
        findings.push({
          type: "EMAIL",
          title: "E-Mail Abfrage fehlgeschlagen",
          description: `DeHashed-Abfrage für diesen Identifikator ist fehlgeschlagen: ${detail.slice(0, 180)}`,
          riskLevel: "medium",
          sourceName: "DeHashed",
          sourceDate: null,
          recommendation:
            "Später erneut prüfen. Admin-API-Test kann trotz einzelner Query-Fehler grün sein.",
          sourceUrl: DEHASHED_URL,
          identifierMasked: maskEmail(email),
          dataClasses: [],
        });
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
        const detail =
          error instanceof Error ? error.message : "DeHashed error";
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
        findings.push({
          type: "PHONE",
          title: "Telefon Abfrage fehlgeschlagen",
          description: `DeHashed-Abfrage für diesen Identifikator ist fehlgeschlagen: ${detail.slice(0, 180)}`,
          riskLevel: "medium",
          sourceName: "DeHashed",
          sourceDate: null,
          recommendation: "Später erneut prüfen.",
          sourceUrl: DEHASHED_URL,
          identifierMasked: maskPhone(phone),
          dataClasses: [],
        });
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

    const riskScore = scoreFindings(
      findings.filter((f) => f.type !== "SOURCE")
    );
    const managementOverview = buildManagementOverview(findings, riskScore);
    const threatMatrix = buildThreatMatrix(findings, riskScore);
    const actions = buildActionPlan(findings, managementOverview);
    const summary = buildSummary(findings);
    const geminiPrep = buildGeminiPrepPayload({
      subjectName,
      riskScore,
      findings,
      managementOverview,
      threatMatrix,
    });

    let aiSummary: string | null = null;
    try {
      const { summarizeDigitalExposureWithGemini } =
        await import("@/lib/analysis/digital-exposure/gemini-prep");
      aiSummary = await summarizeDigitalExposureWithGemini(geminiPrep, {
        userId: options.userId,
        analysisId: scanId,
      });
    } catch (error) {
      console.error("[digital-exposure] gemini summary failed", error);
      aiSummary = null;
    }

    if (aiSummary) {
      findings.push({
        type: "SOURCE",
        title: AI_SUMMARY_FINDING_TITLE,
        description: aiSummary.slice(0, 60000),
        riskLevel: "low",
        sourceName: "Gemini Digital Forensics",
        sourceDate: null,
        recommendation: null,
        sourceUrl: null,
        identifierMasked: null,
        dataClasses: [],
      });
    }

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
      findingCount: findings.filter(
        (f) => f.type !== "SOURCE" && f.title !== AI_SUMMARY_FINDING_TITLE
      ).length,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      findings,
      geminiPrep,
      aiSummary,
      managementOverview,
      actions,
      threatMatrix,
      apiConfigured: true,
      providerLabel: "DeHashed",
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Scan fehlgeschlagen";
    await failDigitalExposureScan(scanId, detail);
    throw error;
  }
}
