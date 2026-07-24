import { getDatabase } from "@/lib/database/client";
import { apiCredentials } from "@/lib/database/schema";
import { decryptSecret } from "@/lib/security/secret-vault";
import { eq } from "drizzle-orm";
import type { ApiCredentialTestResult } from "@/lib/services/api-credentials-service";

export const HIBP_PROVIDER = "haveibeenpwned" as const;

export interface HibpCredentials {
  apiKey: string;
  source: "database" | "env" | "draft";
}

export interface HibpBreach {
  name: string;
  title: string;
  domain: string | null;
  breachDate: string | null;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
  isSensitive: boolean;
  pwnCount: number | null;
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

export async function resolveHibpCredentials(): Promise<HibpCredentials | null> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(apiCredentials)
        .where(eq(apiCredentials.provider, HIBP_PROVIDER))
        .limit(1);
      const row = rows[0];
      if (row?.isActive) {
        const decrypted = tryDecrypt(row.encryptedSecret);
        if (decrypted.ok && decrypted.value.trim()) {
          return { apiKey: decrypted.value.trim(), source: "database" };
        }
      }
    } catch (error) {
      console.error("[hibp] resolve failed", error);
    }
  }

  const envKey = process.env.HIBP_API_KEY?.trim();
  if (envKey) return { apiKey: envKey, source: "env" };
  return null;
}

export async function isHibpConfiguredAndActive(): Promise<boolean> {
  return Boolean(await resolveHibpCredentials());
}

async function markHibpStatus(ok: boolean, message?: string): Promise<void> {
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
        .where(eq(apiCredentials.provider, HIBP_PROVIDER));
    } else {
      await db
        .update(apiCredentials)
        .set({
          lastErrorAt: now,
          lastErrorMessage: (message ?? "HIBP error").slice(0, 1000),
        })
        .where(eq(apiCredentials.provider, HIBP_PROVIDER));
    }
  } catch (error) {
    console.error("[hibp] mark status failed", error);
  }
}

function mapBreach(raw: Record<string, unknown>): HibpBreach | null {
  const name = typeof raw.Name === "string" ? raw.Name.trim() : "";
  const title = typeof raw.Title === "string" ? raw.Title.trim() : name;
  if (!name && !title) return null;
  const dataClasses = Array.isArray(raw.DataClasses)
    ? raw.DataClasses.filter((item): item is string => typeof item === "string")
    : [];
  return {
    name: name || title,
    title: title || name,
    domain: typeof raw.Domain === "string" ? raw.Domain : null,
    breachDate: typeof raw.BreachDate === "string" ? raw.BreachDate : null,
    description: typeof raw.Description === "string" ? raw.Description : "",
    dataClasses,
    isVerified: Boolean(raw.IsVerified),
    isSensitive: Boolean(raw.IsSensitive),
    pwnCount: typeof raw.PwnCount === "number" ? raw.PwnCount : null,
  };
}

/**
 * Live HIBP breachedaccount lookup. 404 = no breaches (success, empty).
 * Never returns password values — only breach metadata.
 */
export async function fetchHibpBreachesForEmail(
  email: string,
  apiKey: string
): Promise<{ breaches: HibpBreach[]; status: number }> {
  const account = encodeURIComponent(email.trim().toLowerCase());
  const response = await fetch(
    `https://haveibeenpwned.com/api/v3/breachedaccount/${account}?truncateResponse=false`,
    {
      method: "GET",
      headers: {
        "hibp-api-key": apiKey,
        "user-agent": "SynSight-DigitalExposure/1.0",
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return { breaches: [], status: 404 };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `HIBP HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ""}`
    );
  }

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) return { breaches: [], status: response.status };

  const breaches = body
    .map((item) =>
      item && typeof item === "object"
        ? mapBreach(item as Record<string, unknown>)
        : null
    )
    .filter((item): item is HibpBreach => Boolean(item))
    // Only confirmed/verified breaches — no speculation
    .filter((item) => item.isVerified);

  return { breaches, status: response.status };
}

/** Admin connectivity probe — uses subscription status endpoint. */
export async function testHibpConnection(input: {
  secret?: string | null;
}): Promise<ApiCredentialTestResult> {
  const started = Date.now();
  let apiKey = input.secret?.trim() || "";
  let source = "draft";

  if (!apiKey) {
    const resolved = await resolveHibpCredentials();
    if (!resolved) {
      return {
        provider: HIBP_PROVIDER,
        ok: false,
        message: "✕ API Verbindung fehlgeschlagen",
        detail: "Kein Have I Been Pwned API-Key hinterlegt.",
        latencyMs: Date.now() - started,
      };
    }
    apiKey = resolved.apiKey;
    source = resolved.source;
  }

  try {
    // Subscription status is a lightweight authenticated probe
    const response = await fetch(
      "https://haveibeenpwned.com/api/v3/subscription/status",
      {
        method: "GET",
        headers: {
          "hibp-api-key": apiKey,
          "user-agent": "SynSight-DigitalExposure/1.0",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
    const latencyMs = Date.now() - started;
    const bodyText = await response.text().catch(() => "");

    if (!response.ok) {
      const detail = `HTTP ${response.status}${bodyText ? ` · ${bodyText.slice(0, 120)}` : ""}`;
      await markHibpStatus(false, detail);
      console.error("[hibp] admin test failed", detail);
      return {
        provider: HIBP_PROVIDER,
        ok: false,
        message: "✕ API Verbindung fehlgeschlagen",
        detail,
        latencyMs,
      };
    }

    await markHibpStatus(true);
    return {
      provider: HIBP_PROVIDER,
      ok: true,
      message: "✓ Have I Been Pwned API Verbindung erfolgreich",
      detail: `Quelle=${source} · ${latencyMs} ms`,
      latencyMs,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Netzwerkfehler";
    await markHibpStatus(false, detail);
    console.error("[hibp] admin test error", detail);
    return {
      provider: HIBP_PROVIDER,
      ok: false,
      message: "✕ API Verbindung fehlgeschlagen",
      detail,
      latencyMs: Date.now() - started,
    };
  }
}
