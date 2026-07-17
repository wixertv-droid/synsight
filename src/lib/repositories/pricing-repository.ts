import {
  DEFAULT_ANALYSIS_PRICES,
  DEFAULT_CREDIT_PACKAGES,
} from "@/lib/credits/pricing";

export interface AnalysisPricingRecord {
  id: number;
  analysisKey: string;
  label: string;
  description: string | null;
  credits: number;
  sortOrder: number;
  isActive: boolean;
  isSystemDefault: boolean;
  defaultLabel: string | null;
  defaultDescription: string | null;
  defaultCredits: number | null;
  updatedByAdminId: number | null;
}

export interface ManagedCreditPackageRecord {
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
  defaultCredits: number | null;
  defaultBonusCredits: number | null;
  defaultPriceCents: number | null;
  isPopular: boolean;
  updatedByAdminId: number | null;
}

export interface PricingRepository {
  listAnalyses(activeOnly?: boolean): Promise<AnalysisPricingRecord[]>;
  findAnalysisByKey(key: string): Promise<AnalysisPricingRecord | null>;
  upsertAnalysis(input: {
    analysisKey: string;
    label: string;
    description: string | null;
    credits: number;
    sortOrder: number;
    isActive: boolean;
    adminId: number;
  }): Promise<AnalysisPricingRecord>;
  resetAnalyses(adminId: number): Promise<void>;
  listManagedPackages(
    activeOnly?: boolean
  ): Promise<ManagedCreditPackageRecord[]>;
  updatePackage(input: {
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
    adminId: number;
  }): Promise<ManagedCreditPackageRecord | null>;
  resetPackages(adminId: number): Promise<void>;
}

const memory = globalThis as typeof globalThis & {
  __synsightAnalysisPricing?: AnalysisPricingRecord[];
  __synsightCreditPackages?: ManagedCreditPackageRecord[];
};

function analyses(): AnalysisPricingRecord[] {
  if (!memory.__synsightAnalysisPricing) {
    memory.__synsightAnalysisPricing = DEFAULT_ANALYSIS_PRICES.map(
      (entry, index) => ({
        id: index + 1,
        analysisKey: entry.key,
        label: entry.label,
        description: entry.description,
        credits: entry.credits,
        sortOrder: (index + 1) * 10,
        isActive: true,
        isSystemDefault: true,
        defaultLabel: entry.label,
        defaultDescription: entry.description,
        defaultCredits: entry.credits,
        updatedByAdminId: null,
      })
    );
  }
  return memory.__synsightAnalysisPricing;
}

function packages(): ManagedCreditPackageRecord[] {
  if (!memory.__synsightCreditPackages) {
    memory.__synsightCreditPackages = DEFAULT_CREDIT_PACKAGES.map(
      (pack, index) => ({
        id: index + 1,
        ...pack,
        isActive: true,
        defaultCredits: pack.credits,
        defaultBonusCredits: pack.bonusCredits,
        defaultPriceCents: pack.priceCents,
        isPopular: pack.code === "pack_3600",
        updatedByAdminId: null,
      })
    );
  }
  return memory.__synsightCreditPackages;
}

export function createInMemoryPricingRepository(): PricingRepository {
  return {
    async listAnalyses(activeOnly = true) {
      return analyses()
        .filter((row) => !activeOnly || row.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({ ...row }));
    },
    async findAnalysisByKey(key) {
      const row = analyses().find((entry) => entry.analysisKey === key);
      return row ? { ...row } : null;
    },
    async upsertAnalysis(input) {
      const rows = analyses();
      let row = rows.find((entry) => entry.analysisKey === input.analysisKey);
      if (!row) {
        row = {
          id: Math.max(0, ...rows.map((entry) => entry.id)) + 1,
          analysisKey: input.analysisKey,
          label: input.label,
          description: input.description,
          credits: input.credits,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          isSystemDefault: false,
          defaultLabel: null,
          defaultDescription: null,
          defaultCredits: null,
          updatedByAdminId: input.adminId,
        };
        rows.push(row);
      } else {
        Object.assign(row, {
          label: input.label,
          description: input.description,
          credits: input.credits,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          updatedByAdminId: input.adminId,
        });
      }
      return { ...row };
    },
    async resetAnalyses(adminId) {
      for (const row of analyses()) {
        if (!row.isSystemDefault || row.defaultCredits === null) continue;
        row.label = row.defaultLabel ?? row.label;
        row.description = row.defaultDescription;
        row.credits = row.defaultCredits;
        row.isActive = true;
        row.updatedByAdminId = adminId;
      }
    },
    async listManagedPackages(activeOnly = true) {
      return packages()
        .filter((row) => !activeOnly || row.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({ ...row }));
    },
    async updatePackage(input) {
      const row = packages().find((entry) => entry.code === input.code);
      if (!row) return null;
      if (input.isPopular) {
        for (const pack of packages()) pack.isPopular = false;
      }
      Object.assign(row, input, { updatedByAdminId: input.adminId });
      return { ...row };
    },
    async resetPackages(adminId) {
      for (const row of packages()) {
        if (
          row.defaultCredits === null ||
          row.defaultBonusCredits === null ||
          row.defaultPriceCents === null
        ) {
          continue;
        }
        row.credits = row.defaultCredits;
        row.bonusCredits = row.defaultBonusCredits;
        row.priceCents = row.defaultPriceCents;
        row.isActive = true;
        row.isPopular = row.code === "pack_3600";
        row.updatedByAdminId = adminId;
      }
    },
  };
}
