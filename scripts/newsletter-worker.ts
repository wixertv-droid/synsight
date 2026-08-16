import { and, asc, count, eq, isNotNull, lte, or, sql } from "drizzle-orm";

import { getDatabase } from "../src/lib/database/client";

import {
  newsletterCampaigns,
  newsletterDeliveries,
  newsletterSettings,
  newsletterSubscribers,
} from "../src/lib/database/schema";

import { resolveMailAccountRuntime } from "../src/lib/services/mail-settings-service";

import { sanitizeSmtpError, sendSmtpMail } from "../src/lib/email/smtp";

let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

function mysqlNow() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function plainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function senderAddress(
  config: {
    SMTP_FROM?: string;
    SMTP_USER?: string;
  },
  senderName: string | null
) {
  if (!senderName) {
    return config.SMTP_FROM ?? config.SMTP_USER ?? "SynSight";
  }

  const match = config.SMTP_FROM?.match(/<([^>]+)>/);

  const address = match?.[1] ?? config.SMTP_USER;

  return address ? `${senderName} <${address}>` : senderName;
}

async function processCampaign(
  campaignId: number,
  batchSize: number,
  companyAddress: string | null
) {
  const db = getDatabase();

  if (!db) {
    throw new Error("DATABASE_REQUIRED");
  }

  const runtime = await resolveMailAccountRuntime("newsletter");

  if (!runtime.enabled || !runtime.config) {
    console.error("[newsletter-worker] Newsletter SMTP nicht bereit");
    return;
  }

  const rows = await db
    .select()
    .from(newsletterCampaigns)
    .where(eq(newsletterCampaigns.id, campaignId))
    .limit(1);

  const campaign = rows[0];

  if (!campaign) return;

  if (campaign.status !== "scheduled" && campaign.status !== "sending") {
    return;
  }

  if (campaign.status === "scheduled") {
    await db
      .update(newsletterCampaigns)
      .set({
        status: "sending",
        startedAt: mysqlNow(),
      })
      .where(
        and(
          eq(newsletterCampaigns.id, campaignId),
          eq(newsletterCampaigns.status, "scheduled")
        )
      );
  }

  await db.execute(sql`
    INSERT IGNORE INTO newsletter_deliveries
    (
      campaign_id,
      subscriber_id,
      email,
      name,
      status,
      attempt_count,
      queued_at,
      created_at,
      updated_at
    )
    SELECT
      ${campaignId},
      s.id,
      s.email,
      s.name,
      'queued',
      0,
      CURRENT_TIMESTAMP(3),
      CURRENT_TIMESTAMP(3),
      CURRENT_TIMESTAMP(3)
    FROM newsletter_subscribers s
    WHERE
      s.status = 'active'
      AND s.consent_at IS NOT NULL
  `);

  const deliveries = await db
    .select({
      id: newsletterDeliveries.id,

      email: newsletterDeliveries.email,

      name: newsletterDeliveries.name,

      token: newsletterSubscribers.unsubscribeToken,
    })
    .from(newsletterDeliveries)
    .leftJoin(
      newsletterSubscribers,
      eq(newsletterDeliveries.subscriberId, newsletterSubscribers.id)
    )
    .where(
      and(
        eq(newsletterDeliveries.campaignId, campaignId),
        eq(newsletterDeliveries.status, "queued")
      )
    )
    .orderBy(asc(newsletterDeliveries.id))
    .limit(batchSize);

  const appUrl = (process.env.APP_URL ?? "https://synsight.de").replace(
    /\/$/,
    ""
  );

  for (const delivery of deliveries) {
    if (!delivery.token) {
      await db
        .update(newsletterDeliveries)
        .set({
          status: "skipped",
          errorMessage: "Kein Abmelde-Token vorhanden.",
          attemptCount: 1,
        })
        .where(eq(newsletterDeliveries.id, delivery.id));

      continue;
    }

    const unsubscribeUrl =
      `${appUrl}/newsletter/abmelden?token=` +
      encodeURIComponent(delivery.token);

    const html = campaign.renderedHtml
      .replaceAll("{{unsubscribe_url}}", unsubscribeUrl)
      .replaceAll("{{company_address}}", companyAddress ?? "SynSight");

    try {
      const result = await sendSmtpMail(runtime.config, {
        from: senderAddress(runtime.config, campaign.senderName),

        to: delivery.email,

        subject: campaign.subject,

        text: plainText(html),

        html,

        replyTo: campaign.replyTo ?? undefined,
      });

      await db
        .update(newsletterDeliveries)
        .set({
          status: "sent",
          attemptCount: 1,
          provider: "smtp",
          messageId: result.messageId ?? null,
          errorMessage: null,
          sentAt: mysqlNow(),
        })
        .where(eq(newsletterDeliveries.id, delivery.id));
    } catch (error) {
      await db
        .update(newsletterDeliveries)
        .set({
          status: "failed",
          attemptCount: 1,
          provider: "smtp",
          errorMessage: sanitizeSmtpError(error),
        })
        .where(eq(newsletterDeliveries.id, delivery.id));
    }

    await sleep(150);
  }

  const statusRows = await db
    .select({
      status: newsletterDeliveries.status,
      value: count(),
    })
    .from(newsletterDeliveries)
    .where(eq(newsletterDeliveries.campaignId, campaignId))
    .groupBy(newsletterDeliveries.status);

  const counts = Object.fromEntries(
    statusRows.map((row) => [row.status, Number(row.value)])
  );

  const queued = counts.queued ?? 0;

  const sent = counts.sent ?? 0;

  const failed = counts.failed ?? 0;

  const skipped = counts.skipped ?? 0;

  await db
    .update(newsletterCampaigns)
    .set({
      sentCount: sent,
      failedCount: failed,
      skippedCount: skipped,

      ...(queued === 0
        ? {
            status: sent === 0 && failed > 0 ? "failed" : "sent",

            completedAt: mysqlNow(),
          }
        : {}),
    })
    .where(eq(newsletterCampaigns.id, campaignId));
}

async function tick() {
  const db = getDatabase();

  if (!db) {
    throw new Error("DATABASE_REQUIRED");
  }

  const settingsRows = await db
    .select()
    .from(newsletterSettings)
    .where(eq(newsletterSettings.id, 1))
    .limit(1);

  const settings = settingsRows[0];

  const waitSeconds = Math.max(10, settings?.workerIntervalSeconds ?? 10);

  if (!settings?.enabled) {
    return waitSeconds * 1000;
  }

  const due = await db
    .select()
    .from(newsletterCampaigns)
    .where(
      or(
        eq(newsletterCampaigns.status, "sending"),

        and(
          eq(newsletterCampaigns.status, "scheduled"),

          isNotNull(newsletterCampaigns.scheduledAt),

          lte(newsletterCampaigns.scheduledAt, mysqlNow())
        )
      )
    )
    .orderBy(asc(newsletterCampaigns.scheduledAt))
    .limit(5);

  for (const campaign of due) {
    await processCampaign(
      campaign.id,
      Math.max(1, Math.min(250, settings.batchSize)),
      settings.companyAddress
    );
  }

  return waitSeconds * 1000;
}

async function main() {
  console.log("[newsletter-worker] gestartet");

  while (!stopping) {
    let wait = 10000;

    try {
      wait = await tick();
    } catch (error) {
      console.error("[newsletter-worker]", error);
    }

    if (!stopping) {
      await sleep(wait);
    }
  }

  console.log("[newsletter-worker] beendet");
}

void main();
