import { desc, eq, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { isStaffRole } from "@/lib/admin/permissions";
import { getDatabase } from "@/lib/database/client";
import {
  apiUsageEvents,
  apiUsageLogs,
  contactRequests,
  digitalExposureScans,
  partnerRequests,
  pressRequests,
  supportRequests,
  usageLogs,
  usernameAnalysis,
  usernameCostLogs,
} from "@/lib/database/schema";
import { getAdminUserFullProfile } from "@/lib/services/admin-user-profile-service";
import { listSupportAnalysisRunSnapshots } from "@/lib/services/support-analysis-history-service";

function assertStaff(actor: AuthenticatedUser): void {
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

async function loadReverseImageRuns(userId: number) {
  const db = getDatabase();
  if (!db) return [];

  try {
    const result = await db.execute(sql`
      SELECT
        id,
        status,
        started_at,
        completed_at,
        subject_name,
        query_count,
        candidate_count,
        match_count,
        reference_image_count,
        risk_score,
        summary,
        retention_days,
        expires_at
      FROM reverse_image_scans
      WHERE user_id = ${userId}
      ORDER BY id DESC
      LIMIT 50
    `);

    return rowsFromExecute<{
      id: number;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      subject_name: string | null;
      query_count: number;
      candidate_count: number;
      match_count: number;
      reference_image_count: number;
      risk_score: number;
      summary: string | null;
      retention_days: number;
      expires_at: string | null;
    }>(result);
  } catch (error) {
    console.error("[support-user-case] reverse image history failed", error);
    return [];
  }
}

async function loadUsernameCosts(userId: number) {
  const db = getDatabase();
  if (!db) return [];

  return db
    .select()
    .from(usernameCostLogs)
    .where(eq(usernameCostLogs.userId, userId))
    .orderBy(desc(usernameCostLogs.createdAt))
    .limit(100);
}

export async function getSupportUserCase(
  actor: AuthenticatedUser,
  userId: number
) {
  assertStaff(actor);

  const profile = await getAdminUserFullProfile(actor, userId);

  if (!profile) return null;

  const db = getDatabase();

  if (!db) {
    return {
      profile,
      analysisSnapshots: [],
      usageLogs: [],
      apiUsageLogs: [],
      apiUsageEvents: [],
      usernameRuns: [],
      usernameCosts: [],
      digitalExposureRuns: [],
      reverseImageRuns: [],
      communications: {
        support: [],
        contact: [],
        press: [],
        partner: [],
      },
    };
  }

  const email = profile.user.email.trim().toLowerCase();

  const [
    analysisSnapshots,
    usageHistory,
    apiHistory,
    apiEvents,
    usernameRuns,
    usernameCosts,
    digitalExposureRuns,
    reverseImageRuns,
    supportMessages,
    contactMessages,
    pressMessages,
    partnerMessages,
  ] = await Promise.all([
    listSupportAnalysisRunSnapshots(actor, userId, 200),

    db
      .select()
      .from(usageLogs)
      .where(eq(usageLogs.userId, userId))
      .orderBy(desc(usageLogs.createdAt))
      .limit(200),

    db
      .select()
      .from(apiUsageLogs)
      .where(eq(apiUsageLogs.userId, userId))
      .orderBy(desc(apiUsageLogs.createdAt))
      .limit(200),

    db
      .select()
      .from(apiUsageEvents)
      .where(eq(apiUsageEvents.userId, userId))
      .orderBy(desc(apiUsageEvents.createdAt))
      .limit(200),

    db
      .select()
      .from(usernameAnalysis)
      .where(eq(usernameAnalysis.userId, userId))
      .orderBy(desc(usernameAnalysis.createdAt))
      .limit(100),

    loadUsernameCosts(userId),

    db
      .select()
      .from(digitalExposureScans)
      .where(eq(digitalExposureScans.userId, userId))
      .orderBy(desc(digitalExposureScans.createdAt))
      .limit(100),

    loadReverseImageRuns(userId),

    db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.email, email))
      .orderBy(desc(supportRequests.createdAt))
      .limit(100),

    db
      .select()
      .from(contactRequests)
      .where(eq(contactRequests.email, email))
      .orderBy(desc(contactRequests.createdAt))
      .limit(100),

    db
      .select()
      .from(pressRequests)
      .where(eq(pressRequests.email, email))
      .orderBy(desc(pressRequests.createdAt))
      .limit(100),

    db
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.email, email))
      .orderBy(desc(partnerRequests.createdAt))
      .limit(100),
  ]);

  return {
    profile,

    analysisSnapshots,

    analysisHistory: {
      username: usernameRuns,
      digitalExposure: digitalExposureRuns,
      reverseImage: reverseImageRuns,
    },

    billingAndUsage: {
      usageLogs: usageHistory,
      usernameCosts,
    },

    technicalLogs: {
      apiUsageLogs: apiHistory,
      apiUsageEvents: apiEvents,
      auditEvents: profile.auditEvents,
      sessions: profile.sessions,
    },

    communications: {
      support: supportMessages,
      contact: contactMessages,
      press: pressMessages,
      partner: partnerMessages,
    },
  };
}
