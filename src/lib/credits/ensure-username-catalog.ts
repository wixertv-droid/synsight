/**
 * Runtime catalog self-heal for Username Intelligence Scan.
 */
import { sql, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { analysisPricing } from "@/lib/database/schema";
import { ensureUsernameSchema } from "@/lib/analysis/username/ensure-schema";

const KEY = "username_intelligence";
const LABEL = "Username Intelligence Scan";
const DESCRIPTION =
  "Öffentliche Profile, Foren und Communities zu Benutzernamen — mit Identity Confidence.";
const CREDITS = 10;

let ensurePromise: Promise<boolean> | null = null;
let lastSuccessAt = 0;
const SUCCESS_TTL_MS = 30_000;

export function resetUsernameCatalogEnsureForTests(): void {
  ensurePromise = null;
  lastSuccessAt = 0;
}

export async function ensureUsernameCatalog(force = false): Promise<boolean> {
  if (
    !force &&
    lastSuccessAt > 0 &&
    Date.now() - lastSuccessAt < SUCCESS_TTL_MS
  ) {
    return true;
  }

  if (force) ensurePromise = null;

  if (!ensurePromise) {
    ensurePromise = runEnsure()
      .then((ok) => {
        if (ok) lastSuccessAt = Date.now();
        else ensurePromise = null;
        return ok;
      })
      .catch((error) => {
        ensurePromise = null;
        console.error("[ensureUsernameCatalog] failed", error);
        return false;
      });
  }

  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await ensureUsernameSchema();

  try {
    await db.execute(sql`
      INSERT INTO analysis_pricing
        (analysis_key, label, description, credits, sort_order,
         is_active, is_system_default, default_label,
         default_description, default_credits)
      VALUES
        (
          ${KEY},
          ${LABEL},
          ${DESCRIPTION},
          ${CREDITS},
          30,
          1,
          1,
          ${LABEL},
          ${DESCRIPTION},
          ${CREDITS}
        )
      ON DUPLICATE KEY UPDATE
        label = VALUES(label),
        description = VALUES(description),
        sort_order = VALUES(sort_order),
        is_system_default = 1,
        default_label = VALUES(default_label),
        default_description = VALUES(default_description),
        default_credits = VALUES(default_credits),
        is_active = IF(is_active IS NULL, 1, is_active)
    `);
  } catch (error) {
    console.error("[ensureUsernameCatalog] pricing upsert failed", error);
    return false;
  }

  const rows = await db
    .select({ id: analysisPricing.id })
    .from(analysisPricing)
    .where(eq(analysisPricing.analysisKey, KEY))
    .limit(1);

  return Boolean(rows[0]);
}
