import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";

import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import { resolveMailAccountRuntime } from "@/lib/services/mail-settings-service";

import {
  newsletterCampaigns,
  newsletterDeliveries,
  newsletterSettings,
  newsletterSubscribers,
  newsletterTemplates,
} from "@/lib/database/schema";

function assertAdmin(actor: AuthenticatedUser) {
  if (actor.role !== "admin") {
    throw new Error("ADMIN_FORBIDDEN");
  }
}

function mysqlNow() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeScheduledAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("NEWSLETTER_INVALID_SCHEDULE");
  }

  return date.toISOString().slice(0, 23).replace("T", " ");
}

export async function getNewsletterOverview(actor: AuthenticatedUser) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const [
    totalCampaigns,
    draftCampaigns,
    scheduledCampaigns,
    sentCampaigns,
    activeSubscribers,
    unsubscribedSubscribers,
    failedDeliveries,
    queuedDeliveries,
  ] = await Promise.all([
    db.select({ value: count() }).from(newsletterCampaigns),

    db
      .select({ value: count() })
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.status, "draft")),

    db
      .select({ value: count() })
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.status, "scheduled")),

    db
      .select({ value: count() })
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.status, "sent")),

    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "active"),
          isNotNull(newsletterSubscribers.consentAt)
        )
      ),

    db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "unsubscribed")),

    db
      .select({ value: count() })
      .from(newsletterDeliveries)
      .where(eq(newsletterDeliveries.status, "failed")),

    db
      .select({ value: count() })
      .from(newsletterDeliveries)
      .where(eq(newsletterDeliveries.status, "queued")),
  ]);

  const upcoming = await db
    .select()
    .from(newsletterCampaigns)
    .where(eq(newsletterCampaigns.status, "scheduled"))
    .orderBy(newsletterCampaigns.scheduledAt)
    .limit(10);

  const latest = await db
    .select()
    .from(newsletterCampaigns)
    .orderBy(desc(newsletterCampaigns.createdAt))
    .limit(10);

  return {
    stats: {
      campaigns: Number(totalCampaigns[0]?.value ?? 0),
      drafts: Number(draftCampaigns[0]?.value ?? 0),
      scheduled: Number(scheduledCampaigns[0]?.value ?? 0),
      sent: Number(sentCampaigns[0]?.value ?? 0),
      subscribers: Number(activeSubscribers[0]?.value ?? 0),
      unsubscribed: Number(unsubscribedSubscribers[0]?.value ?? 0),
      failedDeliveries: Number(failedDeliveries[0]?.value ?? 0),
      queuedDeliveries: Number(queuedDeliveries[0]?.value ?? 0),
    },
    upcoming,
    latest,
  };
}

export async function listNewsletterCampaigns(actor: AuthenticatedUser) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  return db
    .select()
    .from(newsletterCampaigns)
    .orderBy(desc(newsletterCampaigns.createdAt));
}

export async function createNewsletterCampaign(
  actor: AuthenticatedUser,
  input: {
    internalName: string;
    subject: string;
    preheader?: string | null;
    templateId?: number | null;
    contentJson: unknown;
    renderedHtml: string;
    senderName?: string | null;
    replyTo?: string | null;
  }
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const result = await db.insert(newsletterCampaigns).values({
    internalName: input.internalName.trim(),
    subject: input.subject.trim(),
    preheader: input.preheader?.trim() || null,
    status: "draft",
    templateId: input.templateId ?? null,
    contentJson: input.contentJson,
    renderedHtml: input.renderedHtml,
    senderAccount: "newsletter",
    senderName: input.senderName?.trim() || "SynSight",
    replyTo: input.replyTo?.trim().toLowerCase() || null,
    audienceType: "all_subscribers",
    scheduleTimezone: "Europe/Berlin",
    createdByAdminId: Number(actor.id),
    updatedByAdminId: Number(actor.id),
  });

  return {
    id: Number(result[0].insertId),
  };
}

export async function updateNewsletterCampaign(
  actor: AuthenticatedUser,
  id: number,
  input: {
    internalName?: string;
    subject?: string;
    preheader?: string | null;
    templateId?: number | null;
    contentJson?: unknown;
    renderedHtml?: string;
    senderName?: string | null;
    replyTo?: string | null;
    audienceType?: string;
    audienceJson?: unknown;
  }
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const current = await db
    .select()
    .from(newsletterCampaigns)
    .where(eq(newsletterCampaigns.id, id))
    .limit(1);

  const campaign = current[0];

  if (!campaign) {
    throw new Error("NEWSLETTER_NOT_FOUND");
  }

  if (campaign.status === "sending" || campaign.status === "sent") {
    throw new Error("NEWSLETTER_LOCKED");
  }

  await db
    .update(newsletterCampaigns)
    .set({
      ...(input.internalName !== undefined
        ? {
            internalName: input.internalName.trim(),
          }
        : {}),

      ...(input.subject !== undefined
        ? {
            subject: input.subject.trim(),
          }
        : {}),

      ...(input.preheader !== undefined
        ? {
            preheader: input.preheader?.trim() || null,
          }
        : {}),

      ...(input.templateId !== undefined
        ? {
            templateId: input.templateId ?? null,
          }
        : {}),

      ...(input.contentJson !== undefined
        ? {
            contentJson: input.contentJson,
          }
        : {}),

      ...(input.renderedHtml !== undefined
        ? {
            renderedHtml: input.renderedHtml,
          }
        : {}),

      ...(input.senderName !== undefined
        ? {
            senderName: input.senderName?.trim() || null,
          }
        : {}),

      ...(input.replyTo !== undefined
        ? {
            replyTo: input.replyTo?.trim().toLowerCase() || null,
          }
        : {}),

      ...(input.audienceType !== undefined
        ? {
            audienceType: input.audienceType.trim(),
          }
        : {}),

      ...(input.audienceJson !== undefined
        ? {
            audienceJson: input.audienceJson,
          }
        : {}),

      updatedByAdminId: Number(actor.id),
    })
    .where(eq(newsletterCampaigns.id, id));

  return {
    ok: true,
  };
}

export async function scheduleNewsletterCampaign(
  actor: AuthenticatedUser,
  id: number,
  scheduledAt: string,
  timezone: string
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const rows = await db
    .select()
    .from(newsletterCampaigns)
    .where(eq(newsletterCampaigns.id, id))
    .limit(1);

  const campaign = rows[0];

  if (!campaign) {
    throw new Error("NEWSLETTER_NOT_FOUND");
  }

  if (campaign.status === "sending" || campaign.status === "sent") {
    throw new Error("NEWSLETTER_LOCKED");
  }

  const recipientRows = await db
    .select({
      value: count(),
    })
    .from(newsletterSubscribers)
    .where(
      and(
        eq(newsletterSubscribers.status, "active"),
        isNotNull(newsletterSubscribers.consentAt)
      )
    );

  const recipients = Number(recipientRows[0]?.value ?? 0);

  if (recipients < 1) {
    throw new Error("NEWSLETTER_NO_ACTIVE_SUBSCRIBERS");
  }

  await db
    .update(newsletterCampaigns)
    .set({
      status: "scheduled",
      scheduledAt: normalizeScheduledAt(scheduledAt),
      scheduleTimezone: timezone.trim() || "Europe/Berlin",
      recipientCount: recipients,
      updatedByAdminId: Number(actor.id),
    })
    .where(eq(newsletterCampaigns.id, id));

  return {
    ok: true,
    recipientCount: recipients,
  };
}

export async function sendNewsletterNow(actor: AuthenticatedUser, id: number) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const settingsRows = await db
    .select()
    .from(newsletterSettings)
    .where(eq(newsletterSettings.id, 1))
    .limit(1);

  if (!settingsRows[0]?.enabled) {
    throw new Error("NEWSLETTER_DISABLED");
  }

  const runtime = await resolveMailAccountRuntime("newsletter");

  if (!runtime.enabled || !runtime.config) {
    throw new Error("NEWSLETTER_SMTP_NOT_READY");
  }

  const rows = await db
    .select()
    .from(newsletterCampaigns)
    .where(eq(newsletterCampaigns.id, id))
    .limit(1);

  const campaign = rows[0];

  if (!campaign) {
    throw new Error("NEWSLETTER_NOT_FOUND");
  }

  if (campaign.status === "sending" || campaign.status === "sent") {
    throw new Error("NEWSLETTER_LOCKED");
  }

  const recipientRows = await db
    .select({
      value: count(),
    })
    .from(newsletterSubscribers)
    .where(
      and(
        eq(newsletterSubscribers.status, "active"),
        isNotNull(newsletterSubscribers.consentAt)
      )
    );

  const recipients = Number(recipientRows[0]?.value ?? 0);

  if (recipients < 1) {
    throw new Error("NEWSLETTER_NO_ACTIVE_SUBSCRIBERS");
  }

  await db
    .update(newsletterCampaigns)
    .set({
      status: "scheduled",
      scheduledAt: mysqlNow(),
      recipientCount: recipients,
      updatedByAdminId: Number(actor.id),
    })
    .where(eq(newsletterCampaigns.id, id));

  return {
    ok: true,
    queued: true,
    recipientCount: recipients,
  };
}

export async function cancelNewsletterSchedule(
  actor: AuthenticatedUser,
  id: number
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  await db
    .update(newsletterCampaigns)
    .set({
      status: "draft",
      scheduledAt: null,
      recipientCount: 0,
      updatedByAdminId: Number(actor.id),
    })
    .where(
      and(
        eq(newsletterCampaigns.id, id),
        eq(newsletterCampaigns.status, "scheduled")
      )
    );

  return {
    ok: true,
  };
}

export async function deleteNewsletterCampaign(
  actor: AuthenticatedUser,
  id: number
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const rows = await db
    .select()
    .from(newsletterCampaigns)
    .where(eq(newsletterCampaigns.id, id))
    .limit(1);

  const campaign = rows[0];

  if (!campaign) {
    throw new Error("NEWSLETTER_NOT_FOUND");
  }

  if (campaign.status !== "draft" && campaign.status !== "cancelled") {
    throw new Error("NEWSLETTER_DELETE_NOT_ALLOWED");
  }

  await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, id));

  return {
    ok: true,
  };
}

export async function listNewsletterTemplates(actor: AuthenticatedUser) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  return db
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.isActive, true))
    .orderBy(desc(newsletterTemplates.isSystem), newsletterTemplates.name);
}

export async function createNewsletterTemplate(
  actor: AuthenticatedUser,
  input: {
    name: string;
    description?: string | null;
    category?: string;
    contentJson: unknown;
    renderedHtml: string;
  }
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const result = await db.insert(newsletterTemplates).values({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category?.trim() || "custom",
    contentJson: input.contentJson,
    renderedHtml: input.renderedHtml,
    isSystem: false,
    isActive: true,
    createdByAdminId: Number(actor.id),
    updatedByAdminId: Number(actor.id),
  });

  return {
    id: Number(result[0].insertId),
  };
}

export async function listNewsletterSubscribers(actor: AuthenticatedUser) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  return db
    .select()
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function addNewsletterSubscriber(
  actor: AuthenticatedUser,
  input: {
    email: string;
    name?: string | null;
    consentConfirmed: boolean;
  }
) {
  assertAdmin(actor);

  if (!input.consentConfirmed) {
    throw new Error("NEWSLETTER_CONSENT_REQUIRED");
  }

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const email = normalizeEmail(input.email);

  const token =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");

  await db
    .insert(newsletterSubscribers)
    .values({
      email,
      name: input.name?.trim() || null,
      status: "active",
      source: "admin_confirmed",
      consentAt: mysqlNow(),
      unsubscribeToken: token.slice(0, 64),
    })
    .onDuplicateKeyUpdate({
      set: {
        name: input.name?.trim() || null,
        status: "active",
        source: "admin_confirmed",
        consentAt: mysqlNow(),
        unsubscribedAt: null,
      },
    });

  return {
    ok: true,
  };
}

export async function unsubscribeNewsletterSubscriber(
  actor: AuthenticatedUser,
  id: number
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  await db
    .update(newsletterSubscribers)
    .set({
      status: "unsubscribed",
      unsubscribedAt: mysqlNow(),
    })
    .where(eq(newsletterSubscribers.id, id));

  return {
    ok: true,
  };
}

export async function getNewsletterSettings(actor: AuthenticatedUser) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const rows = await db
    .select()
    .from(newsletterSettings)
    .where(eq(newsletterSettings.id, 1))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateNewsletterSettings(
  actor: AuthenticatedUser,
  input: {
    enabled: boolean;
    defaultSenderName: string;
    defaultReplyTo?: string | null;
    defaultTimezone: string;
    batchSize: number;
    workerIntervalSeconds: number;
    unsubscribeFooterText?: string | null;
    companyAddress?: string | null;
  }
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  await db
    .update(newsletterSettings)
    .set({
      enabled: input.enabled,
      defaultSenderName: input.defaultSenderName.trim() || "SynSight",
      defaultReplyTo: input.defaultReplyTo?.trim().toLowerCase() || null,
      defaultTimezone: input.defaultTimezone.trim() || "Europe/Berlin",
      batchSize: Math.max(1, Math.min(250, input.batchSize)),
      workerIntervalSeconds: Math.max(
        10,
        Math.min(3600, input.workerIntervalSeconds)
      ),
      unsubscribeFooterText: input.unsubscribeFooterText?.trim() || null,
      companyAddress: input.companyAddress?.trim() || null,
      updatedByAdminId: Number(actor.id),
    })
    .where(eq(newsletterSettings.id, 1));

  return getNewsletterSettings(actor);
}
