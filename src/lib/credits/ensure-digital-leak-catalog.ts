/**
 * Runtime catalog self-heal for Digital Leak & Exposure.
 *
 * Production Analyse Center / Admin pricing / Finanzen API-Kosten read only
 * from MySQL (`analysis_pricing`, `api_cost_settings`). Those rows historically
 * arrive solely via migrations 020–022. If migrate is skipped — or blocked by
 * a checksum mismatch on a rewritten 020 — the live DB stays on the 009 catalog
 * (phone/email active, no digital_leak_exposure, no dehashed cost row).
 *
 * `DEFAULT_ANALYSIS_PRICES` alone does not write MySQL (only the in-memory
 * repository). This ensure upserts the required rows on first catalog/cost
 * read (and optionally at boot) so deploy without migrate still activates
 * digital_leak_exposure, deactivates phone/email, and shows dehashed costs.
 */
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { analysisPricing, apiCostSettings } from "@/lib/database/schema";
import {
  DEFAULT_ANALYSIS_PRICES,
  REPLACED_ANALYSIS_KEYS,
  isAnalysisActiveByDefault,
} from "@/lib/credits/pricing";

const DEHASHED_COST = {
  providerCode: "dehashed",
  label: "DeHashed.com",
  costPerRequestEur: "0.000000",
  notes: "DeHashed Search API — optional cost override",
} as const;

let ensurePromise: Promise<void> | null = null;

export async function ensureDigitalLeakCatalog(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((error) => {
      ensurePromise = null;
      console.error("[ensureDigitalLeakCatalog] failed", error);
    });
  }
  await ensurePromise;
}

/** Test helper — clears the process-level once-lock. */
export function resetDigitalLeakCatalogEnsureForTests(): void {
  ensurePromise = null;
}

async function runEnsure(): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  for (const [index, entry] of DEFAULT_ANALYSIS_PRICES.entries()) {
    // Match migration 020/022 sort for digital_leak (between google=10 and legacy phone=20).
    const sortOrder =
      entry.key === "digital_leak_exposure" ? 25 : (index + 1) * 10;
    const isActive = isAnalysisActiveByDefault(entry.key);
    const existing = await db
      .select({ id: analysisPricing.id })
      .from(analysisPricing)
      .where(eq(analysisPricing.analysisKey, entry.key))
      .limit(1);

    if (!existing[0]) {
      await db.insert(analysisPricing).values({
        analysisKey: entry.key,
        label: entry.label,
        description: entry.description,
        credits: entry.credits,
        sortOrder,
        isActive,
        isSystemDefault: true,
        defaultLabel: entry.label,
        defaultDescription: entry.description,
        defaultCredits: entry.credits,
      });
      continue;
    }

    // Force Digital Leak active + system defaults without clobbering other
    // admin-tuned prices (only touch the replacement module's activation).
    if (entry.key === "digital_leak_exposure") {
      await db
        .update(analysisPricing)
        .set({
          label: entry.label,
          description: entry.description,
          credits: entry.credits,
          sortOrder: 25,
          isActive: true,
          isSystemDefault: true,
          defaultLabel: entry.label,
          defaultDescription: entry.description,
          defaultCredits: entry.credits,
        })
        .where(eq(analysisPricing.analysisKey, entry.key));
    }
  }

  await db
    .update(analysisPricing)
    .set({ isActive: false })
    .where(inArray(analysisPricing.analysisKey, [...REPLACED_ANALYSIS_KEYS]));

  await db
    .insert(apiCostSettings)
    .values({
      providerCode: DEHASHED_COST.providerCode,
      label: DEHASHED_COST.label,
      costPerRequestEur: DEHASHED_COST.costPerRequestEur,
      notes: DEHASHED_COST.notes,
      isActive: true,
    })
    .onDuplicateKeyUpdate({
      set: {
        label: DEHASHED_COST.label,
        notes: DEHASHED_COST.notes,
        isActive: true,
      },
    });
}
