import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import type { SynSightOrderStatus } from "@/lib/analysis/username/types";
import { ensureOrderWorkflowSchema } from "@/lib/orders/ensure-order-workflow-schema";
import {
  MODULE_LABELS,
  ORDER_TYPE_LABELS,
} from "@/lib/orders/order-pricing-defaults";
import {
  getOrderPricingByType,
  listOrderPricing,
  type OrderPricingRecord,
} from "@/lib/services/order-pricing-service";
import {
  listMemoryOrdersForDesk,
  listSynSightOrders,
  updateSynSightOrderStatus,
  type SynSightOrderRecord,
} from "@/lib/services/hit-actions-service";
import { getCreditsRepository } from "@/lib/repositories";
import { getProfileRepository } from "@/lib/repositories";

export interface OrderReviewItem {
  orderId: number;
  title: string;
  sourceModule: string;
  sourceModuleLabel: string;
  hitPlatform: string;
  hitUrl: string | null;
  orderType: string;
  orderTypeLabel: string;
  credits: number;
  capable: boolean;
  capabilityReason: string;
  requiresVollmacht: boolean;
  vollmachtStatus:
    | "not_required"
    | "missing"
    | "generated"
    | "uploaded"
    | "verified"
    | "rejected";
  vollmachtId: number | null;
  pricingActive: boolean;
}

export interface OrderReviewResult {
  items: OrderReviewItem[];
  summary: {
    selectedCount: number;
    capableCount: number;
    incapableCount: number;
    vollmachtRequiredCount: number;
    vollmachtMissingCount: number;
    totalCredits: number;
    canSubmit: boolean;
    blockers: string[];
  };
}

export interface VollmachtRecord {
  id: number;
  userId: number;
  orderId: number;
  status: "generated" | "uploaded" | "verified" | "rejected";
  templateHtml: string;
  templatePath: string | null;
  signedPath: string | null;
  signedMime: string | null;
  signedFileName: string | null;
  rejectReason: string | null;
  rejectedAt: string | null;
  generatedAt: string;
  uploadedAt: string | null;
}

export interface DeskOrderDetail {
  order: SynSightOrderRecord & {
    userEmail?: string | null;
    username?: string | null;
    creditsCharged?: number | null;
    submittedAt?: string | null;
    requiresVollmacht?: boolean;
    capabilityOk?: boolean | null;
    capabilityReason?: string | null;
    staffMessage?: string | null;
  };
  pricing: OrderPricingRecord | null;
  vollmacht: VollmachtRecord | null;
  summaryPoints: string[];
}

const memoryVollmachten = new Map<number, VollmachtRecord>();
let memoryVollmachtSeq = 1;

function asRowArray<T>(rows: unknown): T[] {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0] as T[];
  }
  if (Array.isArray(rows)) return rows as T[];
  return [];
}

function privateRoot(): string {
  return (
    process.env.PRIVATE_STORAGE_ROOT ||
    path.join(process.cwd(), "storage", "private")
  );
}

function orderTypeLabel(orderType: string): string {
  return (
    ORDER_TYPE_LABELS[orderType as keyof typeof ORDER_TYPE_LABELS] ??
    orderType.replace(/_/g, " ")
  );
}

function evaluateCapability(
  order: SynSightOrderRecord,
  pricing: OrderPricingRecord | null
): { capable: boolean; reason: string } {
  if (!pricing || !pricing.isActive) {
    return {
      capable: false,
      reason:
        "Für diesen Auftragstyp ist kein aktiver Preis / keine Leistung hinterlegt.",
    };
  }
  if (!pricing.synsightCapable) {
    return {
      capable: false,
      reason:
        pricing.capabilityHint ??
        "SynSight kann diesen Auftragstyp derzeit nicht ausführen.",
    };
  }
  if (
    (order.orderType === "profile_delete" ||
      order.orderType === "google_removal" ||
      order.orderType === "forum_contact") &&
    !order.hitUrl
  ) {
    return {
      capable: false,
      reason:
        "Ohne Ziel-URL kann SynSight diesen Auftrag nicht zuverlässig bearbeiten.",
    };
  }
  return {
    capable: true,
    reason:
      pricing.capabilityHint ??
      "SynSight kann diesen Auftrag voraussichtlich ausführen.",
  };
}

async function getVollmachtForOrder(
  orderId: number
): Promise<VollmachtRecord | null> {
  await ensureOrderWorkflowSchema();
  const db = getDatabase();
  if (!db) {
    return (
      [...memoryVollmachten.values()].find((row) => row.orderId === orderId) ??
      null
    );
  }
  const rows = await db.execute(sql`
    SELECT
      id, user_id AS userId, order_id AS orderId, status,
      template_html AS templateHtml, template_path AS templatePath,
      signed_path AS signedPath, signed_mime AS signedMime,
      signed_file_name AS signedFileName,
      reject_reason AS rejectReason,
      rejected_at AS rejectedAt,
      generated_at AS generatedAt, uploaded_at AS uploadedAt
    FROM order_vollmachten
    WHERE order_id = ${orderId}
    LIMIT 1
  `);
  const row = asRowArray<Record<string, unknown>>(rows)[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    orderId: Number(row.orderId),
    status: row.status as VollmachtRecord["status"],
    templateHtml: String(row.templateHtml),
    templatePath: (row.templatePath as string | null) ?? null,
    signedPath: (row.signedPath as string | null) ?? null,
    signedMime: (row.signedMime as string | null) ?? null,
    signedFileName: (row.signedFileName as string | null) ?? null,
    rejectReason: (row.rejectReason as string | null) ?? null,
    rejectedAt: (row.rejectedAt as string | null) ?? null,
    generatedAt: String(row.generatedAt),
    uploadedAt: (row.uploadedAt as string | null) ?? null,
  };
}

function buildVollmachtHtml(input: {
  firstName: string;
  lastName: string;
  email: string;
  order: SynSightOrderRecord;
  orderTypeLabel: string;
}): string {
  const today = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
  }).format(new Date());
  const target = input.order.hitUrl ?? input.order.hitPlatform;
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Vollmacht — SynSight Auftrag #${input.order.id}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.5; }
    h1 { font-size: 1.4rem; }
    .meta { color: #444; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .box { border: 1px solid #ccc; padding: 1rem; margin: 1.5rem 0; }
    .sign { margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .line { border-top: 1px solid #333; margin-top: 3rem; padding-top: 0.4rem; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Vollmacht</h1>
  <p class="meta">Auftrag #${input.order.id} · ${today} · SynSight</p>
  <p>
    Hiermit bevollmächtige ich,
    <strong>${escapeHtml(input.firstName)} ${escapeHtml(input.lastName)}</strong>
    (E-Mail: ${escapeHtml(input.email)}),
    die SynSight GmbH / SynSight Operations, in meinem Namen die folgenden
    Maßnahmen durchzuführen:
  </p>
  <div class="box">
    <p><strong>Art:</strong> ${escapeHtml(input.orderTypeLabel)}</p>
    <p><strong>Titel:</strong> ${escapeHtml(input.order.title)}</p>
    <p><strong>Plattform:</strong> ${escapeHtml(input.order.hitPlatform)}</p>
    <p><strong>Ziel:</strong> ${escapeHtml(target)}</p>
  </div>
  <p>
    Die Bevollmächtigung umfasst insbesondere Kontaktaufnahme, Lösch- und
    Änderungsanfragen sowie die Übermittlung der dafür erforderlichen
    personenbezogenen Daten an den jeweiligen Empfänger, soweit für die
    Durchführung nötig.
  </p>
  <p>
    Diese Vollmacht gilt ausschließlich für den genannten Auftrag und
    erlischt mit Abschluss oder Ablehnung des Auftrags.
  </p>
  <div class="sign">
    <div>
      <div class="line">Ort, Datum</div>
    </div>
    <div>
      <div class="line">Unterschrift Auftraggeber/in</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function reviewOrders(input: {
  userId: number;
  orderIds: number[];
  email: string;
}): Promise<OrderReviewResult> {
  await ensureOrderWorkflowSchema();
  const orders = await listSynSightOrders(input.userId);
  const selected = orders.filter(
    (order) =>
      input.orderIds.includes(order.id) && order.status === "vorbereitet"
  );
  const pricingList = await listOrderPricing(false);
  const pricingByType = new Map(
    pricingList.map((row) => [row.orderType, row] as const)
  );

  const items: OrderReviewItem[] = [];
  for (const order of selected) {
    const pricing = pricingByType.get(order.orderType) ?? null;
    const capability = evaluateCapability(order, pricing);
    const requiresVollmacht = Boolean(pricing?.requiresVollmacht);
    const vollmacht = requiresVollmacht
      ? await getVollmachtForOrder(order.id)
      : null;

    let vollmachtStatus: OrderReviewItem["vollmachtStatus"] = "not_required";
    if (requiresVollmacht) {
      if (!vollmacht) vollmachtStatus = "missing";
      else vollmachtStatus = vollmacht.status;
    }

    // Persist review markers on the order
    await updateOrderReviewFields({
      userId: input.userId,
      orderId: order.id,
      requiresVollmacht,
      capabilityOk: capability.capable,
      capabilityReason: capability.reason,
      vollmachtId: vollmacht?.id ?? null,
    });

    items.push({
      orderId: order.id,
      title: order.title,
      sourceModule: order.sourceModule,
      sourceModuleLabel:
        MODULE_LABELS[order.sourceModule] ?? order.sourceModule,
      hitPlatform: order.hitPlatform,
      hitUrl: order.hitUrl,
      orderType: order.orderType,
      orderTypeLabel: pricing?.label ?? orderTypeLabel(order.orderType),
      credits: pricing?.isActive ? pricing.credits : 0,
      capable: capability.capable,
      capabilityReason: capability.reason,
      requiresVollmacht,
      vollmachtStatus,
      vollmachtId: vollmacht?.id ?? null,
      pricingActive: Boolean(pricing?.isActive),
    });
  }

  const capableCount = items.filter((i) => i.capable).length;
  const incapableCount = items.length - capableCount;
  const vollmachtRequiredCount = items.filter(
    (i) => i.requiresVollmacht
  ).length;
  const vollmachtMissingCount = items.filter(
    (i) =>
      i.requiresVollmacht &&
      (i.vollmachtStatus === "missing" ||
        i.vollmachtStatus === "generated" ||
        i.vollmachtStatus === "rejected")
  ).length;
  const totalCredits = items
    .filter((i) => i.capable)
    .reduce((sum, i) => sum + i.credits, 0);

  const blockers: string[] = [];
  if (items.length === 0) {
    blockers.push("Keine vorbereiteten Aufträge ausgewählt.");
  }
  if (incapableCount > 0) {
    blockers.push(
      `${incapableCount} Auftrag/Aufträge können von SynSight nicht übernommen werden.`
    );
  }
  if (vollmachtMissingCount > 0) {
    blockers.push(
      `${vollmachtMissingCount} unterschriebene Vollmacht(en) fehlen noch.`
    );
  }

  return {
    items,
    summary: {
      selectedCount: items.length,
      capableCount,
      incapableCount,
      vollmachtRequiredCount,
      vollmachtMissingCount,
      totalCredits,
      canSubmit:
        items.length > 0 &&
        incapableCount === 0 &&
        vollmachtMissingCount === 0 &&
        items.every((i) => i.capable),
      blockers,
    },
  };
}

async function updateOrderReviewFields(input: {
  userId: number;
  orderId: number;
  requiresVollmacht: boolean;
  capabilityOk: boolean;
  capabilityReason: string;
  vollmachtId: number | null;
}): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  await db.execute(sql`
    UPDATE synsight_orders
    SET
      requires_vollmacht = ${input.requiresVollmacht ? 1 : 0},
      capability_ok = ${input.capabilityOk ? 1 : 0},
      capability_reason = ${input.capabilityReason},
      vollmacht_id = ${input.vollmachtId},
      reviewed_at = CURRENT_TIMESTAMP(3)
    WHERE id = ${input.orderId} AND user_id = ${input.userId}
  `);
}

export async function generateVollmachtForOrder(input: {
  userId: number;
  orderId: number;
  email: string;
}): Promise<VollmachtRecord> {
  await ensureOrderWorkflowSchema();
  const orders = await listSynSightOrders(input.userId);
  const order = orders.find((row) => row.id === input.orderId);
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const pricing = await getOrderPricingByType(order.orderType);
  if (!pricing?.requiresVollmacht) {
    throw new Error("VOLLMACHT_NOT_REQUIRED");
  }

  const profile = await getProfileRepository().findByUserId(input.userId);
  const firstName = profile?.firstName?.trim() || "Vorname";
  const lastName = profile?.lastName?.trim() || "Nachname";
  const html = buildVollmachtHtml({
    firstName,
    lastName,
    email: input.email,
    order,
    orderTypeLabel: pricing.label,
  });

  const relativeDir = `users/${input.userId}/vollmachten/order-${input.orderId}`;
  const relativePath = `${relativeDir}/vollmacht-${input.orderId}.html`;
  const absoluteDir = path.join(privateRoot(), "documents", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(
    path.join(privateRoot(), "documents", relativePath),
    html,
    "utf8"
  );

  const existing = await getVollmachtForOrder(input.orderId);
  const db = getDatabase();
  const now = new Date().toISOString();

  if (!db) {
    const keepUploaded =
      existing?.status === "uploaded" || existing?.status === "verified";
    const record: VollmachtRecord = {
      id: existing?.id ?? memoryVollmachtSeq++,
      userId: input.userId,
      orderId: input.orderId,
      status: keepUploaded ? existing!.status : "generated",
      templateHtml: html,
      templatePath: relativePath,
      signedPath: existing?.signedPath ?? null,
      signedMime: existing?.signedMime ?? null,
      signedFileName: existing?.signedFileName ?? null,
      rejectReason: existing?.rejectReason ?? null,
      rejectedAt: existing?.rejectedAt ?? null,
      generatedAt: now,
      uploadedAt: existing?.uploadedAt ?? null,
    };
    memoryVollmachten.set(record.id, record);
    return record;
  }

  if (existing) {
    await db.execute(sql`
      UPDATE order_vollmachten
      SET
        template_html = ${html},
        template_path = ${relativePath},
        status = CASE WHEN status = 'uploaded' OR status = 'verified' THEN status ELSE 'generated' END,
        generated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${existing.id}
    `);
    const refreshed = await getVollmachtForOrder(input.orderId);
    if (!refreshed) throw new Error("VOLLMACHT_UPDATE_FAILED");
    return refreshed;
  }

  const result = await db.execute(sql`
    INSERT INTO order_vollmachten
      (user_id, order_id, status, template_html, template_path)
    VALUES
      (${input.userId}, ${input.orderId}, 'generated', ${html}, ${relativePath})
  `);
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number(
    (header as { insertId?: number | string })?.insertId ?? 0
  );
  await db.execute(sql`
    UPDATE synsight_orders
    SET vollmacht_id = ${insertId}, requires_vollmacht = 1
    WHERE id = ${input.orderId} AND user_id = ${input.userId}
  `);

  const created = await getVollmachtForOrder(input.orderId);
  if (!created) throw new Error("VOLLMACHT_CREATE_FAILED");
  return created;
}

export async function uploadSignedVollmacht(input: {
  userId: number;
  orderId: number;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<VollmachtRecord> {
  await ensureOrderWorkflowSchema();
  const vollmacht = await getVollmachtForOrder(input.orderId);
  if (!vollmacht || vollmacht.userId !== input.userId) {
    // auto-generate template first
    throw new Error("VOLLMACHT_NOT_GENERATED");
  }

  const allowed = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  if (!allowed.has(input.mimeType)) {
    throw new Error("INVALID_FILE_TYPE");
  }
  if (input.bytes.length > 12 * 1024 * 1024) {
    throw new Error("FILE_TOO_LARGE");
  }

  const ext =
    input.mimeType === "application/pdf"
      ? "pdf"
      : input.mimeType === "image/png"
        ? "png"
        : input.mimeType === "image/webp"
          ? "webp"
          : "jpg";
  const relativeDir = `users/${input.userId}/vollmachten/order-${input.orderId}`;
  const relativePath = `${relativeDir}/signed-${randomUUID()}.${ext}`;
  const absoluteDir = path.join(privateRoot(), "documents", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(
    path.join(privateRoot(), "documents", relativePath),
    input.bytes
  );

  const db = getDatabase();
  const now = new Date().toISOString();
  if (!db) {
    const updated: VollmachtRecord = {
      ...vollmacht,
      status: "uploaded",
      signedPath: relativePath,
      signedMime: input.mimeType,
      signedFileName: input.fileName,
      rejectReason: null,
      rejectedAt: null,
      uploadedAt: now,
    };
    memoryVollmachten.set(updated.id, updated);
    return updated;
  }

  await db.execute(sql`
    UPDATE order_vollmachten
    SET
      status = 'uploaded',
      signed_path = ${relativePath},
      signed_mime = ${input.mimeType},
      signed_file_name = ${input.fileName},
      reject_reason = NULL,
      rejected_at = NULL,
      uploaded_at = CURRENT_TIMESTAMP(3)
    WHERE id = ${vollmacht.id} AND user_id = ${input.userId}
  `);
  await db.execute(sql`
    UPDATE synsight_orders
    SET staff_message = NULL
    WHERE id = ${input.orderId} AND user_id = ${input.userId}
  `);

  const refreshed = await getVollmachtForOrder(input.orderId);
  if (!refreshed) throw new Error("VOLLMACHT_UPLOAD_FAILED");
  return refreshed;
}

export async function readVollmachtTemplateHtml(
  userId: number,
  orderId: number
): Promise<string | null> {
  const vollmacht = await getVollmachtForOrder(orderId);
  if (!vollmacht || vollmacht.userId !== userId) return null;
  if (vollmacht.templatePath) {
    try {
      return await readFile(
        path.join(privateRoot(), "documents", vollmacht.templatePath),
        "utf8"
      );
    } catch {
      return vollmacht.templateHtml;
    }
  }
  return vollmacht.templateHtml;
}

export async function submitOrders(input: {
  userId: number;
  orderIds: number[];
  email: string;
}): Promise<{
  submitted: number[];
  totalCredits: number;
  balance: number;
}> {
  const review = await reviewOrders(input);
  if (!review.summary.canSubmit) {
    throw new Error(
      review.summary.blockers[0] ?? "Aufträge können nicht abgeschickt werden."
    );
  }

  const totalCredits = review.summary.totalCredits;
  const creditsRepo = getCreditsRepository();

  if (totalCredits > 0) {
    try {
      await creditsRepo.applyCreditChange({
        userId: input.userId,
        type: "consume",
        amount: -totalCredits,
        description: `SynSight-Aufträge (${review.items.length})`,
        analysisKey: "order_batch",
        metadataJson: {
          orderIds: review.items.map((i) => i.orderId),
        },
        transactionSource: "order",
        reason: `Auftragseinreichung: ${review.items.map((i) => `#${i.orderId}`).join(", ")}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      throw error;
    }
  }

  const db = getDatabase();
  const submitted: number[] = [];
  for (const item of review.items) {
    const ok = await updateSynSightOrderStatus({
      userId: input.userId,
      orderId: item.orderId,
      status: "offen",
      creditsCharged: item.credits,
    });
    if (ok) {
      if (db) {
        await db.execute(sql`
          UPDATE synsight_orders
          SET note = CASE
            WHEN note IS NULL OR note = '' THEN 'Eingereicht'
            ELSE CONCAT(note, ' | Eingereicht')
          END
          WHERE id = ${item.orderId} AND user_id = ${input.userId}
        `);
      }
      submitted.push(item.orderId);
    }
  }

  const account = await creditsRepo.ensureAccount(input.userId);
  return {
    submitted,
    totalCredits,
    balance: account.balance,
  };
}

export async function listDeskOrders(input?: {
  status?: SynSightOrderStatus | "all";
}): Promise<
  Array<
    SynSightOrderRecord & {
      userEmail?: string | null;
      username?: string | null;
      creditsCharged?: number | null;
      submittedAt?: string | null;
    }
  >
> {
  await ensureOrderWorkflowSchema();
  const db = getDatabase();
  const status = input?.status ?? "all";

  if (!db) {
    return listMemoryOrdersForDesk().filter(
      (row) => status === "all" || row.status === status
    );
  }

  const rows =
    status === "all"
      ? await db.execute(sql`
          SELECT
            o.id,
            o.user_id AS userId,
            o.source_module AS sourceModule,
            o.hit_fingerprint AS hitFingerprint,
            o.hit_platform AS hitPlatform,
            o.hit_url AS hitUrl,
            o.title,
            o.order_type AS orderType,
            o.status,
            o.note,
            o.credits_charged AS creditsCharged,
            o.submitted_at AS submittedAt,
            o.created_at AS createdAt,
            o.updated_at AS updatedAt,
            u.email AS userEmail,
            u.username AS username
          FROM synsight_orders o
          LEFT JOIN users u ON u.id = o.user_id
          WHERE o.status <> 'vorbereitet'
          ORDER BY
            FIELD(o.status, 'offen', 'in_bearbeitung', 'erledigt', 'abgelehnt'),
            o.submitted_at DESC,
            o.created_at DESC
          LIMIT 300
        `)
      : await db.execute(sql`
          SELECT
            o.id,
            o.user_id AS userId,
            o.source_module AS sourceModule,
            o.hit_fingerprint AS hitFingerprint,
            o.hit_platform AS hitPlatform,
            o.hit_url AS hitUrl,
            o.title,
            o.order_type AS orderType,
            o.status,
            o.note,
            o.credits_charged AS creditsCharged,
            o.submitted_at AS submittedAt,
            o.created_at AS createdAt,
            o.updated_at AS updatedAt,
            u.email AS userEmail,
            u.username AS username
          FROM synsight_orders o
          LEFT JOIN users u ON u.id = o.user_id
          WHERE o.status = ${status}
          ORDER BY o.submitted_at DESC, o.created_at DESC
          LIMIT 300
        `);

  return asRowArray<Record<string, unknown>>(rows).map((row) => ({
    id: Number(row.id),
    userId: Number(row.userId),
    sourceModule: String(row.sourceModule),
    hitFingerprint: String(row.hitFingerprint),
    hitPlatform: String(row.hitPlatform),
    hitUrl: (row.hitUrl as string | null) ?? null,
    title: String(row.title),
    orderType: String(row.orderType),
    status: row.status as SynSightOrderStatus,
    note: (row.note as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    creditsCharged:
      row.creditsCharged == null ? null : Number(row.creditsCharged),
    submittedAt: (row.submittedAt as string | null) ?? null,
    userEmail: (row.userEmail as string | null) ?? null,
    username: (row.username as string | null) ?? null,
  }));
}

export async function updateDeskOrderStatus(input: {
  orderId: number;
  status: Extract<
    SynSightOrderStatus,
    "offen" | "in_bearbeitung" | "erledigt" | "abgelehnt"
  >;
  note?: string | null;
  staffMessage?: string | null;
}): Promise<boolean> {
  await ensureOrderWorkflowSchema();
  const db = getDatabase();
  if (!db) return false;
  const result = await db.execute(sql`
    UPDATE synsight_orders
    SET
      status = ${input.status},
      note = COALESCE(${input.note ?? null}, note),
      staff_message = COALESCE(${input.staffMessage ?? null}, staff_message)
    WHERE id = ${input.orderId}
      AND status <> 'vorbereitet'
  `);
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: number })?.affectedRows ?? 0) > 0;
}

export async function getDeskOrderDetail(
  orderId: number
): Promise<DeskOrderDetail | null> {
  await ensureOrderWorkflowSchema();
  const db = getDatabase();
  if (!db) return null;

  const rows = await db.execute(sql`
    SELECT
      o.id,
      o.user_id AS userId,
      o.source_module AS sourceModule,
      o.hit_fingerprint AS hitFingerprint,
      o.hit_platform AS hitPlatform,
      o.hit_url AS hitUrl,
      o.title,
      o.order_type AS orderType,
      o.status,
      o.note,
      o.staff_message AS staffMessage,
      o.credits_charged AS creditsCharged,
      o.requires_vollmacht AS requiresVollmacht,
      o.capability_ok AS capabilityOk,
      o.capability_reason AS capabilityReason,
      o.submitted_at AS submittedAt,
      o.created_at AS createdAt,
      o.updated_at AS updatedAt,
      u.email AS userEmail,
      u.username AS username
    FROM synsight_orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE o.id = ${orderId} AND o.status <> 'vorbereitet'
    LIMIT 1
  `);
  const row = asRowArray<Record<string, unknown>>(rows)[0];
  if (!row) return null;

  const order = {
    id: Number(row.id),
    userId: Number(row.userId),
    sourceModule: String(row.sourceModule),
    hitFingerprint: String(row.hitFingerprint),
    hitPlatform: String(row.hitPlatform),
    hitUrl: (row.hitUrl as string | null) ?? null,
    title: String(row.title),
    orderType: String(row.orderType),
    status: row.status as SynSightOrderStatus,
    note: (row.note as string | null) ?? null,
    staffMessage: (row.staffMessage as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    creditsCharged:
      row.creditsCharged == null ? null : Number(row.creditsCharged),
    submittedAt: (row.submittedAt as string | null) ?? null,
    requiresVollmacht: Boolean(Number(row.requiresVollmacht ?? 0)),
    capabilityOk:
      row.capabilityOk == null ? null : Boolean(Number(row.capabilityOk)),
    capabilityReason: (row.capabilityReason as string | null) ?? null,
    userEmail: (row.userEmail as string | null) ?? null,
    username: (row.username as string | null) ?? null,
  };

  const pricing = await getOrderPricingByType(order.orderType);
  const vollmacht = await getVollmachtForOrder(orderId);
  const requiresVollmacht =
    order.requiresVollmacht || Boolean(pricing?.requiresVollmacht);

  const summaryPoints: string[] = [
    `Art: ${pricing?.label ?? orderTypeLabel(order.orderType)}`,
    `Plattform: ${order.hitPlatform}`,
    order.hitUrl
      ? `Ziel-URL vorhanden`
      : `Keine Ziel-URL — ggf. schwieriger umsetzbar`,
    `Analyse-Modul: ${MODULE_LABELS[order.sourceModule] ?? order.sourceModule}`,
    order.creditsCharged != null
      ? `Berechnet: ${order.creditsCharged} SynCredits`
      : `Preis: ${pricing?.credits ?? "—"} SynCredits`,
    requiresVollmacht
      ? `Vollmacht: erforderlich (${vollmacht?.status ?? "fehlt"})`
      : `Vollmacht: nicht erforderlich`,
    order.capabilityReason
      ? `Machbarkeit: ${order.capabilityReason}`
      : `Machbarkeit: noch nicht bewertet`,
  ];

  return {
    order: { ...order, requiresVollmacht },
    pricing,
    vollmacht,
    summaryPoints,
  };
}

export async function rejectOrderVollmacht(input: {
  orderId: number;
  reason: string;
}): Promise<boolean> {
  await ensureOrderWorkflowSchema();
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("REJECT_REASON_SHORT");

  const vollmacht = await getVollmachtForOrder(input.orderId);
  if (!vollmacht) throw new Error("VOLLMACHT_NOT_FOUND");

  const message = `Deine Vollmacht zu Auftrag #${input.orderId} ist nicht korrekt: ${reason}. Bitte lade eine korrigierte, unterschriebene Vollmacht erneut hoch.`;

  const db = getDatabase();
  if (!db) {
    memoryVollmachten.set(vollmacht.id, {
      ...vollmacht,
      status: "rejected",
      rejectReason: reason,
      rejectedAt: new Date().toISOString(),
    });
    return true;
  }

  await db.execute(sql`
    UPDATE order_vollmachten
    SET
      status = 'rejected',
      reject_reason = ${reason},
      rejected_at = CURRENT_TIMESTAMP(3)
    WHERE id = ${vollmacht.id}
  `);
  await db.execute(sql`
    UPDATE synsight_orders
    SET staff_message = ${message}
    WHERE id = ${input.orderId}
  `);
  return true;
}

export async function verifyOrderVollmacht(orderId: number): Promise<boolean> {
  await ensureOrderWorkflowSchema();
  const vollmacht = await getVollmachtForOrder(orderId);
  if (!vollmacht || !vollmacht.signedPath)
    throw new Error("VOLLMACHT_NOT_FOUND");

  const db = getDatabase();
  if (!db) {
    memoryVollmachten.set(vollmacht.id, {
      ...vollmacht,
      status: "verified",
      rejectReason: null,
      rejectedAt: null,
    });
    return true;
  }

  await db.execute(sql`
    UPDATE order_vollmachten
    SET
      status = 'verified',
      reject_reason = NULL,
      rejected_at = NULL
    WHERE id = ${vollmacht.id}
  `);
  await db.execute(sql`
    UPDATE synsight_orders
    SET staff_message = NULL
    WHERE id = ${orderId}
  `);
  return true;
}

export async function readSignedVollmachtFile(orderId: number): Promise<{
  bytes: Buffer;
  mimeType: string;
  fileName: string;
} | null> {
  const vollmacht = await getVollmachtForOrder(orderId);
  if (!vollmacht?.signedPath) return null;
  try {
    const bytes = await readFile(
      path.join(privateRoot(), "documents", vollmacht.signedPath)
    );
    return {
      bytes,
      mimeType: vollmacht.signedMime ?? "application/octet-stream",
      fileName: vollmacht.signedFileName ?? `vollmacht-${orderId}`,
    };
  } catch {
    return null;
  }
}
