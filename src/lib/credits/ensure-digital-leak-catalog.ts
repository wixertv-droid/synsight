/**
 * Runtime catalog self-heal for Digital Leak & Exposure.
 *
 * Production Analyse Center / Admin pricing / Finanzen API-Kosten read only
 * from MySQL (`analysis_pricing`, `api_cost_settings`). Those rows historically
 * arrive solely via migrations 020–022. If migrate is skipped — or blocked by
 * a checksum mismatch on a rewritten 020 — the live DB stays on the 009 catalog
 * (phone/email active, no digital_leak_exposure, no dehashed cost row).
 *
 * This module upserts required rows on every catalog/cost read (with a short
 * process cache) using raw SQL so Drizzle boolean quirks cannot block activation.
 */
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { analysisPricing, apiCostSettings } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

const DIGITAL_LEAK_KEY = "digital_leak_exposure";
const DIGITAL_LEAK_LABEL = "Digital Leak & Exposure Scan";
const DIGITAL_LEAK_DESCRIPTION =
  "Öffentlich bekannte Datenlecks und kompromittierte Identifikatoren (E-Mail & Telefon).";
const DIGITAL_LEAK_CREDITS = 8;

let ensurePromise: Promise<boolean> | null = null;
let lastSuccessAt = 0;
const SUCCESS_TTL_MS = 30_000;

export type EnsureCatalogResult = {
  ok: boolean;
  digitalLeakActive: boolean;
  phoneEmailInactive: boolean;
  dehashedCostPresent: boolean;
  detail?: string;
};

/** Test helper — clears the process-level once-lock. */
export function resetDigitalLeakCatalogEnsureForTests(): void {
  ensurePromise = null;
  lastSuccessAt = 0;
}

/**
 * Ensure Digital Leak is active, phone/email inactive, DeHashed cost row present.
 * @param force Bypass short success TTL and re-run writes.
 */
export async function ensureDigitalLeakCatalog(
  force = false
): Promise<boolean> {
  if (
    !force &&
    lastSuccessAt > 0 &&
    Date.now() - lastSuccessAt < SUCCESS_TTL_MS
  ) {
    return true;
  }

  if (force) {
    ensurePromise = null;
  }

  if (!ensurePromise) {
    ensurePromise = runEnsure()
      .then((ok) => {
        if (ok) lastSuccessAt = Date.now();
        else ensurePromise = null;
        return ok;
      })
      .catch((error) => {
        ensurePromise = null;
        console.error("[ensureDigitalLeakCatalog] failed", error);
        return false;
      });
  }

  return ensurePromise;
}

export async function verifyDigitalLeakCatalog(): Promise<EnsureCatalogResult> {
  const db = getDatabase();
  if (!db) {
    return {
      ok: false,
      digitalLeakActive: false,
      phoneEmailInactive: false,
      dehashedCostPresent: false,
      detail: "DATABASE_URL nicht gesetzt",
    };
  }

  const leakRows = await db
    .select({
      isActive: analysisPricing.isActive,
    })
    .from(analysisPricing)
    .where(eq(analysisPricing.analysisKey, DIGITAL_LEAK_KEY))
    .limit(1);

  const legacyRows = await db
    .select({
      analysisKey: analysisPricing.analysisKey,
      isActive: analysisPricing.isActive,
    })
    .from(analysisPricing)
    .where(
      sql`${analysisPricing.analysisKey} IN ('phone_analysis', 'email_analysis')`
    );

  const costRows = await db
    .select({ id: apiCostSettings.id })
    .from(apiCostSettings)
    .where(eq(apiCostSettings.providerCode, "dehashed"))
    .limit(1);

  const digitalLeakActive = Boolean(leakRows[0]?.isActive);
  const phoneEmailInactive = legacyRows.every((row) => !row.isActive);
  const dehashedCostPresent = Boolean(costRows[0]);
  const ok = digitalLeakActive && phoneEmailInactive && dehashedCostPresent;

  return {
    ok,
    digitalLeakActive,
    phoneEmailInactive,
    dehashedCostPresent,
    detail: ok
      ? "Katalog OK"
      : `leakActive=${digitalLeakActive} legacyOff=${phoneEmailInactive} dehashedCost=${dehashedCostPresent}`,
  };
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  // 1) Pricing catalog — independent of api_cost_settings
  try {
    await db.execute(sql`
      INSERT INTO analysis_pricing
        (analysis_key, label, description, credits, sort_order,
         is_active, is_system_default, default_label,
         default_description, default_credits)
      VALUES
        (
          ${DIGITAL_LEAK_KEY},
          ${DIGITAL_LEAK_LABEL},
          ${DIGITAL_LEAK_DESCRIPTION},
          ${DIGITAL_LEAK_CREDITS},
          25,
          1,
          1,
          ${DIGITAL_LEAK_LABEL},
          ${DIGITAL_LEAK_DESCRIPTION},
          ${DIGITAL_LEAK_CREDITS}
        )
      ON DUPLICATE KEY UPDATE
        label = VALUES(label),
        description = VALUES(description),
        credits = VALUES(credits),
        sort_order = VALUES(sort_order),
        is_active = 1,
        is_system_default = 1,
        default_label = VALUES(default_label),
        default_description = VALUES(default_description),
        default_credits = VALUES(default_credits)
    `);

    await db.execute(sql`
      UPDATE analysis_pricing
      SET is_active = 0
      WHERE analysis_key IN ('phone_analysis', 'email_analysis')
    `);
  } catch (error) {
    console.error("[ensureDigitalLeakCatalog] pricing upsert failed", error);
    return false;
  }

  // 2) DeHashed cost row — must not block pricing heal
  try {
    await db.execute(sql`
      INSERT INTO api_cost_settings
        (provider_code, label, cost_per_request_eur, notes, is_active)
      VALUES
        ('dehashed', 'DeHashed.com', 0.000000, 'DeHashed Search API — optional cost override', 1)
      ON DUPLICATE KEY UPDATE
        label = VALUES(label),
        notes = VALUES(notes),
        is_active = 1
    `);
  } catch (error) {
    console.error(
      "[ensureDigitalLeakCatalog] dehashed cost upsert failed",
      error
    );
  }

  const verified = await verifyDigitalLeakCatalog().catch((error) => {
    console.error("[ensureDigitalLeakCatalog] verify threw", error);
    return {
      ok: false,
      digitalLeakActive: false,
      phoneEmailInactive: false,
      dehashedCostPresent: false,
      detail: "verify threw",
    } satisfies EnsureCatalogResult;
  });
  if (!verified.digitalLeakActive || !verified.phoneEmailInactive) {
    console.error(
      "[ensureDigitalLeakCatalog] verify failed after write",
      verified.detail
    );
    return false;
  }

  if (!verified.dehashedCostPresent) {
    console.warn(
      "[ensureDigitalLeakCatalog] pricing OK but dehashed cost row missing"
    );
  }

  return true;
}
