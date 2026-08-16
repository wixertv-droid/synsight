import { sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { isStaffRole } from "@/lib/admin/permissions";
import { getDatabase } from "@/lib/database/client";
import type { CommunicationChannel } from "@/lib/repositories/communications-repository";

export type CommunicationHistoryAction =
  "status" | "note" | "status_note" | "reply" | "forward" | "delete";

function assertStaff(actor: AuthenticatedUser) {
  if (!isStaffRole(actor.role)) {
    throw new Error("STAFF_FORBIDDEN");
  }
}

function rowsFromExecute<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as T[];
  }

  if (Array.isArray(result)) {
    return result as T[];
  }

  return [];
}

export async function recordCommunicationHistory(input: {
  actor: AuthenticatedUser;
  channel: CommunicationChannel;
  requestId: number;
  action: CommunicationHistoryAction;

  statusFrom?: string | null;
  statusTo?: string | null;

  subject?: string | null;
  body?: string | null;

  deliveryStatus?: string | null;
  provider?: string | null;
  messageId?: string | null;
  errorMessage?: string | null;

  metaJson?: Record<string, unknown> | null;
}) {
  assertStaff(input.actor);

  const db = getDatabase();
  if (!db) return;

  const actorId = Number.parseInt(input.actor.id, 10);

  await db.execute(sql`
    INSERT INTO communication_history (
      channel,
      request_id,
      actor_user_id,
      action,
      status_from,
      status_to,
      subject,
      body,
      delivery_status,
      provider,
      message_id,
      error_message,
      meta_json
    )
    VALUES (
      ${input.channel},
      ${input.requestId},
      ${Number.isFinite(actorId) ? actorId : null},
      ${input.action},
      ${input.statusFrom ?? null},
      ${input.statusTo ?? null},
      ${input.subject ?? null},
      ${input.body ?? null},
      ${input.deliveryStatus ?? null},
      ${input.provider ?? null},
      ${input.messageId ?? null},
      ${input.errorMessage ?? null},
      ${input.metaJson ? JSON.stringify(input.metaJson) : null}
    )
  `);
}

export async function listCommunicationHistory(
  actor: AuthenticatedUser,
  channel: CommunicationChannel,
  requestId: number
) {
  assertStaff(actor);

  const db = getDatabase();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT
      h.id AS id,
      h.channel AS channel,
      h.request_id AS requestId,
      h.actor_user_id AS actorUserId,
      h.action AS action,
      h.status_from AS statusFrom,
      h.status_to AS statusTo,
      h.subject AS subject,
      h.body AS body,
      h.delivery_status AS deliveryStatus,
      h.provider AS provider,
      h.message_id AS messageId,
      h.error_message AS errorMessage,
      h.meta_json AS metaJson,
      h.created_at AS createdAt,

      u.email AS actorEmail,
      u.username AS actorUsername

    FROM communication_history h

    LEFT JOIN users u
      ON u.id = h.actor_user_id

    WHERE
      h.channel = ${channel}
      AND h.request_id = ${requestId}

    ORDER BY h.id DESC

    LIMIT 250
  `);

  return rowsFromExecute(result);
}
