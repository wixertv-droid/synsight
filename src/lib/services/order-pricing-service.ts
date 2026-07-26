import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import type { SynSightOrderType } from "@/lib/analysis/username/types";
import { ensureOrderWorkflowSchema } from "@/lib/orders/ensure-order-workflow-schema";
import {
  DEFAULT_ORDER_PRICES,
  type OrderPriceDefault,
} from "@/lib/orders/order-pricing-defaults";

export interface OrderPricingRecord {
  id: number;
  orderType: string;
  label: string;
  description: string | null;
  credits: number;
  requiresVollmacht: boolean;
  synsightCapable: boolean;
  capabilityHint: string | null;
  sortOrder: number;
  isActive: boolean;
}

const memoryPricing = new Map<string, OrderPricingRecord>(
  DEFAULT_ORDER_PRICES.map((row, index) => [
    row.orderType,
    {
      id: index + 1,
      orderType: row.orderType,
      label: row.label,
      description: row.description,
      credits: row.credits,
      requiresVollmacht: row.requiresVollmacht,
      synsightCapable: row.synsightCapable,
      capabilityHint: row.capabilityHint,
      sortOrder: row.sortOrder,
      isActive: true,
    },
  ])
);

function asRowArray<T>(rows: unknown): T[] {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0] as T[];
  }
  if (Array.isArray(rows)) return rows as T[];
  return [];
}

function mapRow(row: Record<string, unknown>): OrderPricingRecord {
  return {
    id: Number(row.id),
    orderType: String(row.orderType ?? row.order_type),
    label: String(row.label),
    description: (row.description as string | null) ?? null,
    credits: Number(row.credits ?? 0),
    requiresVollmacht: Boolean(
      Number(row.requiresVollmacht ?? row.requires_vollmacht ?? 0)
    ),
    synsightCapable: Boolean(
      Number(row.synsightCapable ?? row.synsight_capable ?? 0)
    ),
    capabilityHint:
      (row.capabilityHint as string | null) ??
      (row.capability_hint as string | null) ??
      null,
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    isActive: Boolean(Number(row.isActive ?? row.is_active ?? 1)),
  };
}

export async function listOrderPricing(
  activeOnly = false
): Promise<OrderPricingRecord[]> {
  await ensureOrderWorkflowSchema();
  const db = getDatabase();
  if (!db) {
    return [...memoryPricing.values()]
      .filter((row) => !activeOnly || row.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const rows = activeOnly
    ? await db.execute(sql`
        SELECT
          id, order_type AS orderType, label, description, credits,
          requires_vollmacht AS requiresVollmacht,
          synsight_capable AS synsightCapable,
          capability_hint AS capabilityHint,
          sort_order AS sortOrder, is_active AS isActive
        FROM order_pricing
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
      `)
    : await db.execute(sql`
        SELECT
          id, order_type AS orderType, label, description, credits,
          requires_vollmacht AS requiresVollmacht,
          synsight_capable AS synsightCapable,
          capability_hint AS capabilityHint,
          sort_order AS sortOrder, is_active AS isActive
        FROM order_pricing
        ORDER BY sort_order ASC, id ASC
      `);

  return asRowArray<Record<string, unknown>>(rows).map(mapRow);
}

export async function getOrderPricingByType(
  orderType: string
): Promise<OrderPricingRecord | null> {
  const all = await listOrderPricing(false);
  return all.find((row) => row.orderType === orderType) ?? null;
}

export async function upsertOrderPricing(input: {
  orderType: string;
  label: string;
  description?: string | null;
  credits: number;
  requiresVollmacht: boolean;
  synsightCapable: boolean;
  capabilityHint?: string | null;
  sortOrder: number;
  isActive: boolean;
  adminId?: number | null;
}): Promise<OrderPricingRecord> {
  await ensureOrderWorkflowSchema();
  const db = getDatabase();
  if (!db) {
    const existing = memoryPricing.get(input.orderType);
    const record: OrderPricingRecord = {
      id: existing?.id ?? memoryPricing.size + 1,
      orderType: input.orderType,
      label: input.label,
      description: input.description ?? null,
      credits: input.credits,
      requiresVollmacht: input.requiresVollmacht,
      synsightCapable: input.synsightCapable,
      capabilityHint: input.capabilityHint ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };
    memoryPricing.set(input.orderType, record);
    return record;
  }

  await db.execute(sql`
    INSERT INTO order_pricing
      (order_type, label, description, credits, requires_vollmacht, synsight_capable, capability_hint, sort_order, is_active, updated_by_admin_id)
    VALUES
      (${input.orderType}, ${input.label}, ${input.description ?? null}, ${input.credits}, ${input.requiresVollmacht ? 1 : 0}, ${input.synsightCapable ? 1 : 0}, ${input.capabilityHint ?? null}, ${input.sortOrder}, ${input.isActive ? 1 : 0}, ${input.adminId ?? null})
    ON DUPLICATE KEY UPDATE
      label = VALUES(label),
      description = VALUES(description),
      credits = VALUES(credits),
      requires_vollmacht = VALUES(requires_vollmacht),
      synsight_capable = VALUES(synsight_capable),
      capability_hint = VALUES(capability_hint),
      sort_order = VALUES(sort_order),
      is_active = VALUES(is_active),
      updated_by_admin_id = VALUES(updated_by_admin_id)
  `);

  const found = await getOrderPricingByType(input.orderType);
  if (!found) throw new Error("ORDER_PRICING_UPSERT_FAILED");
  return found;
}

export async function resetOrderPricingDefaults(
  adminId?: number | null
): Promise<OrderPricingRecord[]> {
  for (const row of DEFAULT_ORDER_PRICES) {
    await upsertOrderPricing({
      ...row,
      description: row.description,
      capabilityHint: row.capabilityHint,
      isActive: true,
      adminId,
    });
  }
  return listOrderPricing(false);
}

export function isKnownOrderType(value: string): value is SynSightOrderType {
  return DEFAULT_ORDER_PRICES.some((row) => row.orderType === value);
}

export type { OrderPriceDefault };
