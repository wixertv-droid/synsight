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
  /** Sprint 6D — presence/masked attributes only */
  attributes: Array<{
    key: string;
    label: string;
    present: boolean;
    maskedValue?: string | null;
  }>;
  hashType: string | null;
  collection: string | null;
  obtainedFrom: string | null;
  sourceDate: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
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

function firstString(value: unknown): string | null {
  const list = asStringList(value);
  return list[0] ?? null;
}

function maskSoft(value: string, kind: "email" | "phone" | "generic"): string {
  if (kind === "email" && value.includes("@")) {
    const [local, domain] = value.split("@");
    const keep = Math.min(2, local.length);
    return `${local.slice(0, keep)}${"*".repeat(Math.max(2, local.length - keep))}@${domain}`;
  }
  if (kind === "phone") {
    const digits = value.replace(/\D+/g, "");
    if (digits.length < 6) return "***";
    return `${digits.slice(0, 3)}${"*".repeat(Math.max(3, digits.length - 5))}${digits.slice(-2)}`;
  }
  if (value.length <= 3) return "***";
  return `${value.slice(0, 2)}${"*".repeat(Math.min(8, value.length - 2))}`;
}

function pickDate(row: Record<string, unknown>): string | null {
  for (const key of [
    "obtained_from",
    "breach_date",
    "date",
    "created",
    "created_at",
  ]) {
    const value = firstString(row[key]);
    if (value && /\d{4}/.test(value)) return value.slice(0, 32);
  }
  return null;
}

type Attr = DehashedBreachSummary["attributes"][number];

function pushAttr(
  attrs: Attr[],
  labels: Set<string>,
  key: string,
  label: string,
  present: boolean,
  maskedValue?: string | null
) {
  if (!present) return;
  attrs.push({ key, label, present: true, maskedValue: maskedValue ?? null });
  labels.add(label);
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
      (typeof row.database === "string" && row.database.trim()) ||
      "Unbekannte Quelle";

    const hasEmail = hasNonEmptyField(row.email);
    const hasPhone =
      hasNonEmptyField(row.phone) || hasNonEmptyField(row.phone_number);
    const hasUsername = hasNonEmptyField(row.username);
    // Presence only — never read or store the secret values
    const hasPasswordExposure = hasNonEmptyField(row.password);
    const hasHashedPasswordExposure = hasNonEmptyField(row.hashed_password);

    const labels = new Set<string>();
    const attributes: Attr[] = [];

    const emailRaw = firstString(row.email);
    pushAttr(
      attributes,
      labels,
      "email",
      "E-Mail-Adresse",
      hasEmail,
      emailRaw ? maskSoft(emailRaw, "email") : null
    );

    const phoneRaw = firstString(row.phone) ?? firstString(row.phone_number);
    pushAttr(
      attributes,
      labels,
      "phone",
      "Telefonnummer",
      hasPhone,
      phoneRaw ? maskSoft(phoneRaw, "phone") : null
    );

    const usernameRaw = firstString(row.username);
    pushAttr(
      attributes,
      labels,
      "username",
      "Benutzername",
      hasUsername,
      usernameRaw ? maskSoft(usernameRaw, "generic") : null
    );

    const nameRaw = firstString(row.name);
    pushAttr(
      attributes,
      labels,
      "name",
      "Name",
      Boolean(nameRaw),
      nameRaw ? maskSoft(nameRaw, "generic") : null
    );

    const firstName = firstString(row.first_name) ?? firstString(row.firstname);
    pushAttr(
      attributes,
      labels,
      "first_name",
      "Vorname",
      Boolean(firstName),
      firstName ? maskSoft(firstName, "generic") : null
    );

    const lastName = firstString(row.last_name) ?? firstString(row.lastname);
    pushAttr(
      attributes,
      labels,
      "last_name",
      "Nachname",
      Boolean(lastName),
      lastName ? maskSoft(lastName, "generic") : null
    );

    const alias =
      firstString(row.alias) ??
      firstString(row.nickname) ??
      firstString(row.screen_name);
    pushAttr(
      attributes,
      labels,
      "alias",
      "Alias",
      Boolean(alias),
      alias ? maskSoft(alias, "generic") : null
    );

    const address = firstString(row.address) ?? firstString(row.address_1);
    pushAttr(
      attributes,
      labels,
      "address",
      "Straße / Anschrift",
      Boolean(address),
      address ? maskSoft(address, "generic") : null
    );

    const zip =
      firstString(row.zip) ??
      firstString(row.zip_code) ??
      firstString(row.postal_code);
    pushAttr(attributes, labels, "zip", "PLZ", Boolean(zip), zip);

    const city = firstString(row.city) ?? firstString(row.town);
    pushAttr(attributes, labels, "city", "Ort", Boolean(city), city);

    const country =
      firstString(row.country) ??
      firstString(row.country_code) ??
      firstString(row.nation);
    pushAttr(attributes, labels, "country", "Land", Boolean(country), country);

    const dob =
      firstString(row.dob) ??
      firstString(row.date_of_birth) ??
      firstString(row.birth_date);
    pushAttr(
      attributes,
      labels,
      "dob",
      "Geburtsdatum",
      Boolean(dob),
      dob ? "***" : null
    );

    const ip = firstString(row.ip_address) ?? firstString(row.ip);
    pushAttr(
      attributes,
      labels,
      "ip_address",
      "IP-Adresse",
      Boolean(ip),
      ip ? maskSoft(ip, "generic") : null
    );

    const company =
      firstString(row.company) ??
      firstString(row.organization) ??
      firstString(row.employer);
    pushAttr(
      attributes,
      labels,
      "company",
      "Unternehmen",
      Boolean(company),
      company
    );

    const domain =
      firstString(row.domain) ??
      firstString(row.url) ??
      firstString(row.website);
    pushAttr(attributes, labels, "domain", "Domain", Boolean(domain), domain);

    pushAttr(
      attributes,
      labels,
      "password",
      "Passwort vorhanden",
      hasPasswordExposure,
      null
    );
    pushAttr(
      attributes,
      labels,
      "hashed_password",
      "Passwort-Hash vorhanden",
      hasHashedPasswordExposure,
      null
    );

    const hashType =
      firstString(row.hash_type) ??
      firstString(row.hashed_password_type) ??
      firstString(row.password_hash_type);
    if (hashType) {
      pushAttr(attributes, labels, "hash_type", "Hashtyp", true, hashType);
    }

    const collection =
      firstString(row.collection) ??
      firstString(row.source) ??
      firstString(row.leak_name);
    const obtainedFrom = firstString(row.obtained_from);
    const sourceDate = pickDate(row);

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
        dataClasses: [...labels],
        attributes,
        hashType,
        collection,
        obtainedFrom,
        sourceDate,
        firstSeen: sourceDate,
        lastSeen: sourceDate,
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
    existing.hashType = existing.hashType || hashType;
    existing.collection = existing.collection || collection;
    existing.obtainedFrom = existing.obtainedFrom || obtainedFrom;
    existing.sourceDate = existing.sourceDate || sourceDate;
    if (sourceDate) {
      existing.firstSeen = existing.firstSeen || sourceDate;
      existing.lastSeen = sourceDate;
    }
    for (const item of labels) {
      if (!existing.dataClasses.includes(item)) existing.dataClasses.push(item);
    }
    for (const attr of attributes) {
      const prev = existing.attributes.find((a) => a.key === attr.key);
      if (!prev) existing.attributes.push(attr);
      else if (!prev.maskedValue && attr.maskedValue) {
        prev.maskedValue = attr.maskedValue;
      }
    }
  }

  return [...byDb.values()].sort((a, b) =>
    a.databaseName.localeCompare(b.databaseName)
  );
}

/** Map DeHashed HTTP errors to actionable German admin messages. */
export function formatDehashedHttpError(
  status: number,
  bodyText: string
): string {
  const raw = bodyText.trim();
  let apiMessage = "";
  try {
    const parsed = raw
      ? (JSON.parse(raw) as { error?: unknown; message?: unknown })
      : null;
    if (parsed && typeof parsed.error === "string") apiMessage = parsed.error;
    else if (parsed && typeof parsed.message === "string")
      apiMessage = parsed.message;
  } catch {
    apiMessage = "";
  }
  const lower = `${apiMessage} ${raw}`.toLowerCase();

  if (
    status === 401 &&
    (lower.includes("search subscription") ||
      lower.includes("api credits") ||
      lower.includes("purchase a search"))
  ) {
    return (
      "DeHashed verlangt ein aktives Search-Abo (Status „Active“) plus API-Credits. " +
      "Credits allein reichen nicht, solange Search auf „Not Active“ steht. " +
      "Bitte unter https://app.dehashed.com/subscriptions das Search-Abo aktivieren, " +
      "danach erneut „API TESTEN“."
    );
  }
  if (status === 401 || status === 403) {
    return (
      "DeHashed API-Key ungültig oder ohne Berechtigung" +
      (apiMessage ? ` — ${apiMessage.slice(0, 140)}` : "")
    );
  }
  if (status === 429) {
    return "DeHashed Rate-Limit erreicht — bitte kurz warten und erneut versuchen.";
  }
  return `DeHashed HTTP ${status}${raw ? `: ${raw.slice(0, 160)}` : ""}`;
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
    throw new Error(formatDehashedHttpError(response.status, text));
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
