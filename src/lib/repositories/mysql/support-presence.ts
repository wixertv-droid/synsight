import { eq, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { sessions, users } from "@/lib/database/schema";

/** Active session with lastSeen within this window counts as online. */
const STAFF_ONLINE_WINDOW_MS = 15 * 60 * 1000;

/**
 * True when at least one user with role `admin` or `support` has a live session.
 */
export async function isStaffOnline(
  db: SynSightDatabase | null
): Promise<boolean> {
  if (!db) return false;
  const threshold = new Date(Date.now() - STAFF_ONLINE_WINDOW_MS)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");
  try {
    const rows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        sql`${sessions.revokedAt} IS NULL
          AND ${sessions.expiresAt} > CURRENT_TIMESTAMP(3)
          AND ${sessions.lastSeenAt} >= ${threshold}
          AND ${users.role} IN ('admin', 'support')`
      )
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error("[isStaffOnline] failed:", error);
    return false;
  }
}
