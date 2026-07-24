import { getDatabase } from "@/lib/database/client";
import { apiCredentials } from "@/lib/database/schema";
import { decryptSecret } from "@/lib/security/secret-vault";
import { eq } from "drizzle-orm";
import type { ApiCredentialTestResult } from "@/lib/services/api-credentials-service";

export const DEHASHED_PROVIDER = "dehashed" as const;

export interface DehashedCredentials {
  apiKey: string;
  source: "database" | "env" | "draft";
}

/** Aggregated breach metadata — never contains password values. */
export interface DehashedBreachSummary {
  databaseName: string;
  recordCount: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasUsername: boolean;
  hasPasswordExposure: boolean;
  hasHashedPasswordExposure: boolean;
  dataClasses: string[];
}

export interface DehashedSearchResult {
  status: number;
  total: number;
  balance: number | null;
  breaches: DehashedBreachSummary[];
}

function tryDecrypt(
  encrypted: string
): { ok: true; value: string } | { ok: false; error: string } {
  try {
    return { ok: true, value: decryptSecret(encrypted) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "decrypt failed",
    };
  }
}

export async function resolveDehashedCredentials(): Promise<DehashedCredentials | null> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(apiCredentials)
        .where(eq(apiCredentials.provider, DEHASHED_PROVIDER))
        .limit(1);
      const row = rows[0];
      if (row?.isActive) {
        const decrypted = tryDecrypt(row.encryptedSecret);
        if (decrypted.ok && decrypted.value.trim()) {
          return { apiKey: decrypted.value.trim(), source: "database" };
        }
      }
    } catch (error) {
      console.error("[dehashed] resolve failed", error);
    }
  }

  const envKey =
    process.env.DEHASHED_API_KEY?.trim() ||
    process.env.DEHASHED_API_TOKEN?.trim();
  if (envKey) return { apiKey: envKey, source: "env" };
  return null;
}

export async function isDehashedConfiguredAndActive(): Promise<boolean> {
  return Boolean(await resolveDehashedCredentials());
}

async function markDehashedStatus(
  ok: boolean,
  message?: string
): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  const now = new Date().toISOString().slice(0, 23).replace("T", " ");
  try {
    if (ok) {
      await db
        .update(apiCredentials)
        .set({
          lastSuccessAt: now,
          lastErrorAt: null,
          lastErrorMessage: null,
        })
        .where(eq(apiCredentials.provider, DEHASHED_PROVIDER));
    } else {
      await db
        .update(apiCredentials)
        .set({
          lastErrorAt: now,
          lastErrorMessage: (message ?? "DeHashed error").slice(0, 1000),
        })
        .where(eq(apiCredentials.provider, DEHASHED_PROVIDER));
    }
  } catch (error) {
    console.error("[dehashed] mark status failed", error);
  }
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasNonEmptyField(value: unknown): boolean {
  return asStringList(value).length > 0;
}

/**
 * Map raw DeHashed entries → breach summaries.
 * Password / hashed_password values are NEVER copied — only boolean exposure flags.
 */
export function summarizeDehashedEntries(
  entries: unknown[]
): DehashedBreachSummary[] {
  const byDb = new Map<string, DehashedBreachSummary>();

  for (const raw of entries) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;

    const databaseName =
      (typeof row.database_name === "string" && row.database_name.trim()) ||
      (typeof row.db_name === "string" && row.db_name.trim()) ||
      "Unbekannte Quelle";

    const hasEmail = hasNonEmptyField(row.email);
    const hasPhone =
      hasNonEmptyField(row.phone) || hasNonEmptyField(row.phone_number);
    const hasUsername = hasNonEmptyField(row.username);
    // Presence only — never read or store the secret values
    const hasPasswordExposure = hasNonEmptyField(row.password);
    const hasHashedPasswordExposure = hasNonEmptyField(row.hashed_password);

    const dataClasses = new Set<string>();
    if (hasEmail) dataClasses.add("E-Mail-Adresse");
    if (hasPhone) dataClasses.add("Telefonnummer");
    if (hasUsername) dataClasses.add("Benutzername");
    if (hasNonEmptyField(row.name)) dataClasses.add("Name");
    if (hasNonEmptyField(row.ip_address)) dataClasses.add("IP-Adresse");
    if (hasPasswordExposure)
      dataClasses.add("Passwort vorhanden (nicht gespeichert)");
    if (hasHashedPasswordExposure) {
      dataClasses.add("Passwort-Hash vorhanden (nicht gespeichert)");
    }

    const existing = byDb.get(databaseName);
    if (!existing) {
      byDb.set(databaseName, {
        databaseName,
        recordCount: 1,
        hasEmail,
        hasPhone,
        hasUsername,
        hasPasswordExposure,
        hasHashedPasswordExposure,
        dataClasses: [...dataClasses],
      });
      continue;
    }

    existing.recordCount += 1;
    existing.hasEmail = existing.hasEmail || hasEmail;
    existing.hasPhone = existing.hasPhone || hasPhone;
    existing.hasUsername = existing.hasUsername || hasUsername;
    existing.hasPasswordExposure =
      existing.hasPasswordExposure || hasPasswordExposure;
    existing.hasHashedPasswordExposure =
      existing.hasHashedPasswordExposure || hasHashedPasswordExposure;
    for (const item of dataClasses) {
      if (!existing.dataClasses.includes(item)) existing.dataClasses.push(item);
    }
  }

  return [...byDb.values()].sort((a, b) =>
    a.databaseName.localeCompare(b.databaseName)
  );
}

async function dehashedSearch(
  apiKey: string,
  query: string,
  size = 100
): Promise<{
  status: number;
  total: number;
  balance: number | null;
  entries: unknown[];
}> {
  const response = await fetch("https://api.dehashed.com/v2/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "DeHashed-Api-Key": apiKey,
      "User-Agent": "SynSight-DigitalExposure/1.0",
    },
    body: JSON.stringify({
      query,
      page: 1,
      size: Math.max(1, Math.min(size, 100)),
      wildcard: false,
      regex: false,
      de_dupe: true,
    }),
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(
      `DeHashed HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ""}`
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  const total =
    typeof body.total === "number"
      ? body.total
      : typeof body.took === "number"
        ? entries.length
        : entries.length;
  const balance = typeof body.balance === "number" ? body.balance : null;

  return { status: response.status, total, balance, entries };
}

/** Email lookup via DeHashed Search API. */
export async function searchDehashedByEmail(
  email: string,
  apiKey: string
): Promise<DehashedSearchResult> {
  const query = `email:"${email.trim().toLowerCase()}"`;
  const { status, total, balance, entries } = await dehashedSearch(
    apiKey,
    query,
    100
  );
  return {
    status,
    total,
    balance,
    breaches: summarizeDehashedEntries(entries),
  };
}

/** Phone lookup via DeHashed Search API. */
export async function searchDehashedByPhone(
  phone: string,
  apiKey: string
): Promise<DehashedSearchResult> {
  const normalized = phone.replace(/[^\d+]/g, "");
  const query = `phone:"${normalized}"`;
  const { status, total, balance, entries } = await dehashedSearch(
    apiKey,
    query,
    100
  );
  return {
    status,
    total,
    balance,
    breaches: summarizeDehashedEntries(entries),
  };
}

/**
 * Admin connectivity probe — DeHashed Search API v2.
 * Auth: header `DeHashed-Api-Key` (Account-E-Mail nur Admin-Referenz, nicht für Auth).
 */
export async function testDehashedConnection(input: {
  secret?: string | null;
  accountEmail?: string | null;
}): Promise<ApiCredentialTestResult> {
  const started = Date.now();
  let apiKey = input.secret?.trim() || "";
  let source = "draft";

  if (!apiKey) {
    const resolved = await resolveDehashedCredentials();
    if (resolved) {
      apiKey = resolved.apiKey;
      source = resolved.source;
    }
  }

  if (!apiKey) {
    return {
      provider: DEHASHED_PROVIDER,
      ok: false,
      message: "✕ API Verbindung fehlgeschlagen",
      detail: "Bitte DeHashed API-Key im Admin speichern.",
      latencyMs: Date.now() - started,
    };
  }

  try {
    // Probe with a non-matching address — success = auth + endpoint OK (0 hits fine)
    const result = await dehashedSearch(
      apiKey,
      'email:"synsight-api-probe@example.invalid"',
      1
    );
    const latencyMs = Date.now() - started;
    await markDehashedStatus(true);
    const balancePart =
      result.balance != null ? ` · Balance=${result.balance}` : "";
    const emailHint = input.accountEmail?.trim()
      ? ` · Account=${input.accountEmail.trim()}`
      : "";
    return {
      provider: DEHASHED_PROVIDER,
      ok: true,
      message: "✓ DeHashed.com API Verbindung erfolgreich",
      detail: `Quelle=${source} · v2/search · ${latencyMs} ms${balancePart}${emailHint}`,
      latencyMs,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Netzwerkfehler";
    await markDehashedStatus(false, detail);
    console.error("[dehashed] admin test error", detail);
    return {
      provider: DEHASHED_PROVIDER,
      ok: false,
      message: "✕ API Verbindung fehlgeschlagen",
      detail,
      latencyMs: Date.now() - started,
    };
  }
}
