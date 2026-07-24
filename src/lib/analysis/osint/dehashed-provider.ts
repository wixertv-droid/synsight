/**
 * DeHashed Search Provider — Google OSINT Pipeline.
 *
 * Auth: Header `DeHashed-Api-Key` (Admin-DB oder Env-Fallback)
 * Endpoint: POST https://api.dehashed.com/v2/search
 *
 * Bei API-Fehlern (401/429/leeres Guthaben/Netzwerk): leeres Array —
 * die SerpAPI Google/Bing-Analyse darf NICHT abstürzen.
 */

import { getDatabase } from "@/lib/database/client";
import { apiCredentials } from "@/lib/database/schema";
import { decryptSecret } from "@/lib/security/secret-vault";
import { eq } from "drizzle-orm";
import type { IdentityView } from "@/lib/services/identity-service";
import type { IntelligenceHit } from "@/lib/analysis/types";

export const DEHASHED_PROVIDER_ID = "dehashed" as const;

const DEHASHED_V2_SEARCH_URL = "https://api.dehashed.com/v2/search";

export interface DehashedLeakDetail {
  databaseName: string;
  identifier: string;
  identifierType: "email" | "phone" | "username";
  /** Cleartext passwords from DeHashed — nur für Gemini-Payload, nicht persistieren */
  passwords: string[];
  hashedPasswords: string[];
  usernames: string[];
  emails: string[];
  phones: string[];
  dataClasses: string[];
}

export interface DehashedSearchOutput {
  hits: IntelligenceHit[];
  leaksForGemini: DehashedLeakDetail[];
}

interface DehashedCredentials {
  apiKey: string;
  source: string;
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function tryDecrypt(
  encrypted: string
): { ok: true; value: string } | { ok: false } {
  try {
    return { ok: true, value: decryptSecret(encrypted) };
  } catch {
    return { ok: false };
  }
}

async function resolveDehashedApiKey(): Promise<DehashedCredentials | null> {
  // 1) Admin-DB zuerst (API-Key; Account-E-Mail ist nur Referenz)
  const db = getDatabase();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(apiCredentials)
        .where(eq(apiCredentials.provider, DEHASHED_PROVIDER_ID))
        .limit(1);
      const row = rows[0];
      if (row?.isActive) {
        const decrypted = tryDecrypt(row.encryptedSecret);
        if (decrypted.ok && decrypted.value.trim()) {
          return {
            apiKey: decrypted.value.trim(),
            source: "database",
          };
        }
      }
    } catch (error) {
      console.error("[dehashed-provider] resolve failed", error);
    }
  }

  // 2) Optionaler Env-Fallback (nur wenn Admin noch nicht gesetzt)
  const envKey =
    process.env.DEHASHED_API_KEY?.trim() ||
    process.env.DEHASHED_API_TOKEN?.trim() ||
    "";
  if (envKey) {
    return { apiKey: envKey, source: "env" };
  }
  return null;
}

/** Build optimized DeHashed query from identity profile. */
export function buildDehashedQueryFromIdentity(
  identity: IdentityView | null
): string | null {
  if (!identity) return null;
  const parts: string[] = [];

  for (const email of identity.emails) {
    const trimmed = email.trim().toLowerCase();
    if (trimmed.includes("@")) parts.push(`email:"${trimmed}"`);
  }

  const phones = [
    identity.personal.phone?.trim() ?? "",
    ...identity.phoneNumbers.map((p) => p.trim()),
  ].filter(Boolean);
  for (const phone of phones) {
    const normalized = phone.replace(/[^\d+]/g, "");
    if (normalized.length >= 6) parts.push(`phone:"${normalized}"`);
  }

  const aliases = [
    identity.aliases.publicAlias,
    ...identity.aliases.usernames,
    ...identity.aliases.nicknames,
    ...identity.aliases.gamingNames,
  ]
    .map((a) => a.trim())
    .filter((a) => a.length >= 3);

  for (const alias of aliases) {
    // Escape quotes in alias
    const safe = alias.replace(/"/g, "");
    parts.push(`username:"${safe}"`);
  }

  if (parts.length === 0) return null;
  // Cap OR-clauses to keep query size reasonable
  return parts.slice(0, 20).join(" OR ");
}

function databaseNameOf(row: Record<string, unknown>): string {
  if (typeof row.database_name === "string" && row.database_name.trim()) {
    return row.database_name.trim();
  }
  if (typeof row.db_name === "string" && row.db_name.trim()) {
    return row.db_name.trim();
  }
  return "Unbekannte Leak-Quelle";
}

function mapEntriesToHitsAndLeaks(
  entries: unknown[],
  query: string,
  generatedAt: string
): DehashedSearchOutput {
  const hits: IntelligenceHit[] = [];
  const leaksForGemini: DehashedLeakDetail[] = [];
  let seq = 0;

  for (const raw of entries) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const databaseName = databaseNameOf(row);
    const emails = asStringList(row.email);
    const phones = [
      ...asStringList(row.phone),
      ...asStringList(row.phone_number),
    ];
    const usernames = asStringList(row.username);
    const passwords = asStringList(row.password);
    const hashedPasswords = asStringList(row.hashed_password);
    const names = asStringList(row.name);

    const identifier =
      emails[0] || phones[0] || usernames[0] || names[0] || "unbekannt";
    const identifierType: DehashedLeakDetail["identifierType"] = emails[0]
      ? "email"
      : phones[0]
        ? "phone"
        : "username";

    const dataClasses: string[] = [];
    if (emails.length) dataClasses.push("E-Mail");
    if (phones.length) dataClasses.push("Telefon");
    if (usernames.length) dataClasses.push("Benutzername");
    if (names.length) dataClasses.push("Name");
    if (passwords.length) dataClasses.push("Passwort (Klartext)");
    if (hashedPasswords.length) dataClasses.push("Passwort-Hash");
    if (asStringList(row.ip_address).length) dataClasses.push("IP-Adresse");
    if (asStringList(row.address).length) dataClasses.push("Adresse");

    const hasPassword = passwords.length > 0 || hashedPasswords.length > 0;

    // Persistierbarer Hit — KEINE Klartext-Passwörter in title/snippet
    const snippetParts = [
      `Quelle: ${databaseName}`,
      dataClasses.length ? `Kompromittiert: ${dataClasses.join(", ")}` : null,
      hasPassword
        ? "Passwort/Hash in Leak vorhanden (Details nur im KI-Lagebild)."
        : null,
    ].filter(Boolean);

    hits.push({
      id: `dehashed-${++seq}`,
      query,
      title: `Datenleck / Breach · ${databaseName}`,
      url: `https://dehashed.com/search?query=${encodeURIComponent(identifier)}`,
      snippet: snippetParts.join(" — "),
      category: "Datenleck / Breach",
      fetchedAt: generatedAt,
      source: databaseName,
      sourceType: "dehashed_leak",
      visibility: "public_index",
      relevance: "relevant",
      risk: hasPassword ? "action" : "review",
      status: "verified",
      whyFound: `Bestätigter DeHashed-Treffer zu ${identifierType}.`,
      whyRelevant:
        "Verifiziertes Datenleck — direkte Exposition von Identifikatoren.",
      visibleData: dataClasses.join(", "),
      isPublic: true,
      isProblematic: true,
      risks: hasPassword
        ? "Zugangsdaten waren Teil eines Datenlecks."
        : "Identifikatoren waren Teil eines Datenlecks.",
      canIgnore: false,
      shouldAct: true,
      recommendation: hasPassword
        ? "Passwörter bei betroffenen Diensten sofort ändern und 2FA aktivieren."
        : "Konten mit diesem Identifikator prüfen und absichern.",
      displayCategory: "Datenleck / Breach",
      filterCategory: "leak",
      severity: hasPassword ? "critical" : "high",
      identityConfidence: 100,
      identityConfidenceLabel: "Verifiziertes Datenleck (DeHashed)",
    });

    leaksForGemini.push({
      databaseName,
      identifier,
      identifierType,
      passwords,
      hashedPasswords,
      usernames,
      emails,
      phones,
      dataClasses,
    });
  }

  return { hits, leaksForGemini };
}

/**
 * Live DeHashed search. Never throws to callers — returns empty on any failure.
 */
export async function searchDehashedForIdentity(
  identity: IdentityView | null,
  options?: { generatedAt?: string }
): Promise<DehashedSearchOutput> {
  const empty: DehashedSearchOutput = { hits: [], leaksForGemini: [] };

  try {
    const credentials = await resolveDehashedApiKey();
    if (!credentials) {
      console.warn("[dehashed-provider] not configured (API key missing)");
      return empty;
    }

    const query = buildDehashedQueryFromIdentity(identity);
    if (!query) return empty;

    const response = await fetch(DEHASHED_V2_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "DeHashed-Api-Key": credentials.apiKey,
        "User-Agent": "SynSight-OSINT/1.0",
      },
      body: JSON.stringify({
        query,
        page: 1,
        size: 100,
        wildcard: false,
        regex: false,
        de_dupe: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[dehashed-provider] HTTP ${response.status}`,
        body.slice(0, 200)
      );
      // 401 / 429 / empty balance / etc. → graceful empty
      return empty;
    }

    const json = (await response.json().catch(() => null)) as {
      entries?: unknown[];
      total?: number;
    } | null;

    const entries = Array.isArray(json?.entries) ? json.entries : [];
    const generatedAt = options?.generatedAt ?? new Date().toISOString();
    return mapEntriesToHitsAndLeaks(entries, query, generatedAt);
  } catch (error) {
    console.error("[dehashed-provider] search failed", error);
    return empty;
  }
}
