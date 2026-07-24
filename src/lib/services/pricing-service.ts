import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  ensureDigitalLeakCatalog,
  verifyDigitalLeakCatalog,
} from "@/lib/credits/ensure-digital-leak-catalog";
import {
  DEFAULT_ANALYSIS_PRICES,
  formatEuroFromCents,
  isAnalysisActiveByDefault,
  isReplacedAnalysisKey,
} from "@/lib/credits/pricing";
import {
  getAuditRepository,
  getCreditsRepository,
  getPricingRepository,
} from "@/lib/repositories";

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function presentPackage(pack: {
  id: number;
  code: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceCents: number;
  currency: string;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  isPopular?: boolean;
}) {
  return {
    ...pack,
    totalCredits: pack.credits + pack.bonusCredits,
    priceLabel: formatEuroFromCents(pack.priceCents),
    isPopular: pack.isPopular ?? pack.code === "pack_3600",
  };
}

const DIGITAL_LEAK_DEFAULT = DEFAULT_ANALYSIS_PRICES.find(
  (row) => row.key === "digital_leak_exposure"
)!;

/**
 * After DB ensure: drop replaced phone/email; inject digital_leak if still missing.
 * Injection is a last-resort UI safety net — ensure should have written the row.
 */
function normalizePublicAnalyses(
  analyses: Array<{
    key: string;
    label: string;
    description: string;
    credits: number;
    sortOrder: number;
  }>
) {
  const withoutLegacy = analyses.filter(
    (row) => !isReplacedAnalysisKey(row.key)
  );
  if (withoutLegacy.some((row) => row.key === "digital_leak_exposure")) {
    return withoutLegacy;
  }
  return [
    ...withoutLegacy,
    {
      key: DIGITAL_LEAK_DEFAULT.key,
      label: DIGITAL_LEAK_DEFAULT.label,
      description: DIGITAL_LEAK_DEFAULT.description,
      credits: DIGITAL_LEAK_DEFAULT.credits,
      sortOrder: 25,
    },
  ].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export async function getPublicPricingCatalog() {
  try {
    await ensureDigitalLeakCatalog(false);
    const repository = getPricingRepository();
    let analyses = await repository.listAnalyses(true);
    let mapped = analyses.map((entry) => ({
      key: entry.analysisKey,
      label: entry.label,
      description: entry.description ?? "",
      credits: entry.credits,
      sortOrder: entry.sortOrder,
    }));

    const needsRepair =
      !mapped.some((row) => row.key === "digital_leak_exposure") ||
      mapped.some((row) => isReplacedAnalysisKey(row.key));

    if (needsRepair) {
      await ensureDigitalLeakCatalog(true);
      analyses = await repository.listAnalyses(true);
      mapped = analyses.map((entry) => ({
        key: entry.analysisKey,
        label: entry.label,
        description: entry.description ?? "",
        credits: entry.credits,
        sortOrder: entry.sortOrder,
      }));
    }

    const packages = await repository.listManagedPackages(true);
    return {
      analyses: normalizePublicAnalyses(mapped),
      packages: packages.map(presentPackage),
    };
  } catch (error) {
    console.error("[getPublicPricingCatalog] failed — using defaults", error);
    return {
      analyses: normalizePublicAnalyses(
        DEFAULT_ANALYSIS_PRICES.filter((row) =>
          isAnalysisActiveByDefault(row.key)
        ).map((row, index) => ({
          key: row.key,
          label: row.label,
          description: row.description,
          credits: row.credits,
          sortOrder:
            row.key === "digital_leak_exposure" ? 25 : (index + 1) * 10,
        }))
      ),
      packages: [],
    };
  }
}

export async function getAnalysisQuote(userId: number, analysisKey: string) {
  await ensureDigitalLeakCatalog(false);
  const pricing = await getPricingRepository().findAnalysisByKey(analysisKey);
  if (!pricing || !pricing.isActive) return null;
  const account = await getCreditsRepository().ensureAccount(userId);
  return {
    analysisKey: pricing.analysisKey,
    label: pricing.label,
    credits: pricing.credits,
    currentBalance: account.balance,
    remainingBalance: Math.max(0, account.balance - pricing.credits),
    sufficient: account.balance >= pricing.credits,
  };
}

export async function getAdminPricingCatalog(actor: AuthenticatedUser) {
  assertAdmin(actor);
  await ensureDigitalLeakCatalog(true);
  const repository = getPricingRepository();
  const [analyses, packages] = await Promise.all([
    repository.listAnalyses(false),
    repository.listManagedPackages(false),
  ]);

  const hasLeak = analyses.some(
    (row) => row.analysisKey === "digital_leak_exposure"
  );
  const normalized = hasLeak
    ? analyses.map((row) =>
        isReplacedAnalysisKey(row.analysisKey)
          ? { ...row, isActive: false }
          : row.analysisKey === "digital_leak_exposure"
            ? { ...row, isActive: true }
            : row
      )
    : [
        ...analyses.map((row) =>
          isReplacedAnalysisKey(row.analysisKey)
            ? { ...row, isActive: false }
            : row
        ),
        {
          id: -1,
          analysisKey: DIGITAL_LEAK_DEFAULT.key,
          label: DIGITAL_LEAK_DEFAULT.label,
          description: DIGITAL_LEAK_DEFAULT.description,
          credits: DIGITAL_LEAK_DEFAULT.credits,
          sortOrder: 25,
          isActive: true,
          isSystemDefault: true,
          defaultLabel: DIGITAL_LEAK_DEFAULT.label,
          defaultDescription: DIGITAL_LEAK_DEFAULT.description,
          defaultCredits: DIGITAL_LEAK_DEFAULT.credits,
          updatedByAdminId: null,
        },
      ];

  return {
    analyses: normalized.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
    ),
    packages: packages.map(presentPackage),
    catalogHealth: await verifyDigitalLeakCatalog(),
  };
}

export async function updateAnalysisPricing(input: {
  actor: AuthenticatedUser;
  analysisKey: string;
  label: string;
  description: string | null;
  credits: number;
  sortOrder: number;
  isActive: boolean;
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);
  const adminId = Number(input.actor.id);
  const updated = await getPricingRepository().upsertAnalysis({
    analysisKey: input.analysisKey,
    label: input.label,
    description: input.description,
    credits: input.credits,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    adminId,
  });
  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "analysis_pricing",
    entityId: updated.analysisKey,
    ipAddress: input.ipAddress ?? null,
    metadata: {
      action: "pricing.analysis.upsert",
      credits: updated.credits,
      active: updated.isActive,
      label: updated.label,
    },
  });
  return updated;
}

export async function updateCreditPackagePricing(input: {
  actor: AuthenticatedUser;
  code: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceCents: number;
  currency: string;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  isPopular: boolean;
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);
  const adminId = Number(input.actor.id);
  const updated = await getPricingRepository().updatePackage({
    ...input,
    adminId,
  });
  if (!updated) return null;
  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "credit_package",
    entityId: updated.code,
    ipAddress: input.ipAddress ?? null,
    metadata: {
      action: "pricing.package.update",
      credits: updated.credits,
      bonusCredits: updated.bonusCredits,
      priceCents: updated.priceCents,
      active: updated.isActive,
    },
  });
  return presentPackage(updated);
}

export async function resetPricingDefaults(input: {
  actor: AuthenticatedUser;
  scope: "analyses" | "packages" | "all";
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);
  await ensureDigitalLeakCatalog(true);
  const adminId = Number(input.actor.id);
  const repository = getPricingRepository();
  if (input.scope === "analyses" || input.scope === "all") {
    await repository.resetAnalyses(adminId);
  }
  if (input.scope === "packages" || input.scope === "all") {
    await repository.resetPackages(adminId);
  }
  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "pricing_catalog",
    entityId: input.scope,
    ipAddress: input.ipAddress ?? null,
    metadata: {
      action: "pricing.defaults.reset",
      scope: input.scope,
    },
  });
  return getAdminPricingCatalog(input.actor);
}
