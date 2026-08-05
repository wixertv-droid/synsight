import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { apiCredentials } from "@/lib/database/schema";
import { decryptSecret } from "@/lib/security/secret-vault";
import type { ApiCredentialTestResult } from "@/lib/services/api-credentials-service";
import {
  markApiCredentialError,
  markApiCredentialSuccess,
} from "@/lib/services/api-credentials-service";

export const DEMO_SCAN_PROVIDER = "demo_scan" as const;

const DEFAULT_SCAN_URL = "http://161.97.85.22:5000/api/scan";

export interface DemoScanCredentials {
  url: string;
  apiKey: string;
  source: "database" | "env" | "draft";
}

/** Strip accidental "Bearer " prefix / whitespace from admin-entered keys. */
export function normalizeDemoScanApiKey(raw: string): string {
  return raw
    .trim()
    .replace(/^bearer\s+/i, "")
    .trim();
}

function parseConfig(configJson: unknown): Record<string, unknown> {
  if (!configJson) return {};
  if (typeof configJson === "string") {
    try {
      const parsed = JSON.parse(configJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof configJson === "object" && !Array.isArray(configJson)) {
    return configJson as Record<string, unknown>;
  }
  return {};
}

export function readDemoScanApiUrl(configJson: unknown): string | null {
  const config = parseConfig(configJson);
  const url = config.url ?? config.apiUrl ?? config.scanUrl;
  return typeof url === "string" && /^https?:\/\//i.test(url.trim())
    ? url.trim().replace(/\/+$/, "")
    : null;
}

/** Derive Contabo /api/health from a /api/scan URL. */
export function healthUrlFromScanUrl(scanUrl: string): string {
  const trimmed = scanUrl.trim().replace(/\/+$/, "");
  if (/\/api\/scan$/i.test(trimmed)) {
    return trimmed.replace(/\/api\/scan$/i, "/api/health");
  }
  try {
    const u = new URL(trimmed);
    u.pathname = "/api/health";
    u.search = "";
    return u.toString();
  } catch {
    return trimmed.replace(/\/api\/scan.*/i, "/api/health");
  }
}

async function loadDemoScanRow() {
  const db = getDatabase();
  if (!db) return null;
  const rows = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.provider, DEMO_SCAN_PROVIDER))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve Contabo DemoScanner URL + Bearer key.
 * Prefers active DB credential, then env fallbacks.
 */
export async function resolveDemoScanCredentials(): Promise<DemoScanCredentials | null> {
  const row = await loadDemoScanRow();
  if (row?.isActive) {
    try {
      const apiKey = normalizeDemoScanApiKey(
        decryptSecret(row.encryptedSecret)
      );
      const url =
        readDemoScanApiUrl(row.configJson) ||
        process.env.DEMO_SCAN_API_URL?.trim() ||
        DEFAULT_SCAN_URL;
      if (apiKey) {
        return { url, apiKey, source: "database" };
      }
    } catch (error) {
      console.error(
        "[demo-scan] DB API-Key Entschlüsselung fehlgeschlagen — Env-Fallback:",
        error instanceof Error ? error.message : error
      );
      // fall through to env
    }
  }

  const envUrl = process.env.DEMO_SCAN_API_URL?.trim();
  const envKey = normalizeDemoScanApiKey(
    process.env.DEMO_SCAN_API_KEY?.trim() || ""
  );
  if (envUrl || envKey) {
    return {
      url: envUrl || DEFAULT_SCAN_URL,
      apiKey: envKey || "",
      source: "env",
    };
  }

  return {
    url: DEFAULT_SCAN_URL,
    apiKey: "",
    source: "env",
  };
}

export async function testDemoScanConnection(input: {
  secret?: string | null;
  apiUrl?: string | null;
}): Promise<ApiCredentialTestResult> {
  const started = Date.now();
  let apiKey = normalizeDemoScanApiKey(input.secret || "");
  let url = input.apiUrl?.trim() || "";
  let source: DemoScanCredentials["source"] = "draft";

  if (!apiKey || !url) {
    const row = await loadDemoScanRow();
    if (row) {
      if (!row.isActive) {
        return {
          provider: DEMO_SCAN_PROVIDER,
          ok: false,
          message: "DemoScanner ist inaktiv.",
          detail: "Bitte zuerst auf „Aktiv“ schalten.",
          latencyMs: Date.now() - started,
        };
      }
      if (!apiKey) {
        try {
          apiKey = normalizeDemoScanApiKey(decryptSecret(row.encryptedSecret));
          source = "database";
        } catch (error) {
          return {
            provider: DEMO_SCAN_PROVIDER,
            ok: false,
            message: "API-Key in der DB nicht lesbar.",
            detail:
              error instanceof Error
                ? error.message
                : "Schlüssel neu speichern.",
            latencyMs: Date.now() - started,
          };
        }
      }
      if (!url) {
        url = readDemoScanApiUrl(row.configJson) || "";
      }
    }
  }

  if (!url) {
    url = process.env.DEMO_SCAN_API_URL?.trim() || DEFAULT_SCAN_URL;
    if (!apiKey) {
      apiKey = normalizeDemoScanApiKey(
        process.env.DEMO_SCAN_API_KEY?.trim() || ""
      );
      if (apiKey) source = "env";
    }
  }

  apiKey = normalizeDemoScanApiKey(apiKey);

  if (!apiKey) {
    return {
      provider: DEMO_SCAN_PROVIDER,
      ok: false,
      message: "Kein API-Key vorhanden.",
      detail: "Bitte Contabo Bearer-Key speichern und erneut testen.",
      latencyMs: Date.now() - started,
    };
  }

  if (!/^https?:\/\//i.test(url)) {
    return {
      provider: DEMO_SCAN_PROVIDER,
      ok: false,
      message: "Ungültige API-URL.",
      detail: "Erwartet z. B. http://161.97.85.22:5000/api/scan",
      latencyMs: Date.now() - started,
    };
  }

  // Optional health — older Contabo api.py has no /api/health (404 is OK).
  const healthUrl = healthUrlFromScanUrl(url);
  let healthDetail = "Health übersprungen";
  let contaboKeyHint = "";
  try {
    const healthRes = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const healthBody = (await healthRes.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (healthRes.status === 404) {
      healthDetail = "kein /api/health (ok für ältere api.py)";
    } else if (!healthRes.ok) {
      healthDetail = `Health HTTP ${healthRes.status}`;
    } else {
      const modules = Array.isArray(healthBody?.modules)
        ? (healthBody.modules as string[]).join(",")
        : "";
      const ver =
        typeof healthBody?.api_version === "string"
          ? `version=${healthBody.api_version}`
          : "version=?";
      if (typeof healthBody?.api_key_hint === "string") {
        contaboKeyHint = healthBody.api_key_hint;
      }
      const missing = Array.isArray(healthBody?.tools_missing)
        ? (healthBody.tools_missing as string[]).join(",")
        : "";
      healthDetail =
        `Health OK · ${ver}` +
        (modules ? ` · modules=${modules}` : "") +
        (missing ? ` · tools_missing=${missing}` : "");
    }
  } catch {
    healthDetail = "Health nicht erreichbar (Auth-Probe folgt)";
  }

  const adminKeyHint =
    apiKey.length >= 4
      ? `${apiKey.slice(0, 2)}…${apiKey.slice(-2)} (len=${apiKey.length})`
      : `(len=${apiKey.length})`;

  // Auth probe: empty body → 400 if key OK, 401 if key wrong (fast, no scan).
  try {
    const authRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({}),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const latencyMs = Date.now() - started;

    if (authRes.status === 401) {
      await markApiCredentialError(DEMO_SCAN_PROVIDER, "Unauthorized");
      return {
        provider: DEMO_SCAN_PROVIDER,
        ok: false,
        message: "API-Key abgelehnt (401 Unauthorized).",
        detail:
          `${healthDetail} · Quelle=${source}. ` +
          `Admin-Key ${adminKeyHint}` +
          (contaboKeyHint ? ` · Contabo-Key ${contaboKeyHint}` : "") +
          ". Keys müssen exakt gleich sein (ohne „Bearer “). " +
          "Im Admin-Feld den Contabo-Key neu eintragen → Speichern → API TESTEN. " +
          "Aktueller Contabo-Default: demoscanner23061980!!",
        latencyMs,
      };
    }

    // 400 missing query / 200 success / 502 scan error still prove auth works
    if (
      authRes.status === 400 ||
      authRes.status === 200 ||
      authRes.status === 502 ||
      authRes.ok
    ) {
      await markApiCredentialSuccess(DEMO_SCAN_PROVIDER);
      return {
        provider: DEMO_SCAN_PROVIDER,
        ok: true,
        message: `DemoScanner erreichbar — Auth OK (${latencyMs} ms).`,
        detail: `${healthDetail} · Quelle=${source} · scan=${url}`,
        latencyMs,
      };
    }

    const body = (await authRes.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    const detail =
      body?.message || body?.error || `HTTP ${authRes.status} auf /api/scan`;
    await markApiCredentialError(DEMO_SCAN_PROVIDER, detail);
    return {
      provider: DEMO_SCAN_PROVIDER,
      ok: false,
      message: "Unerwartete Antwort vom DemoScanner.",
      detail: `${healthDetail} · ${detail}`,
      latencyMs,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Netzwerkfehler";
    await markApiCredentialError(DEMO_SCAN_PROVIDER, msg);
    return {
      provider: DEMO_SCAN_PROVIDER,
      ok: false,
      message: "Auth-Probe fehlgeschlagen.",
      detail: `${healthDetail} · ${msg}`,
      latencyMs: Date.now() - started,
    };
  }
}
