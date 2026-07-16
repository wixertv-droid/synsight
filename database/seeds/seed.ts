/**
 * Programmatic database seed for development, CI, and Debian/MariaDB servers.
 *
 * Usage:
 *   DATABASE_URL=mysql://... npm run db:seed
 *
 * Idempotent — safe to run multiple times.
 * Admin password is Argon2id only (never plaintext).
 */
import { eq } from "drizzle-orm";
import { DEV_ADMIN_PASSWORD_HASH } from "../../src/lib/auth/password";
import {
  closeConnectionPool,
  isDatabaseConfigured,
} from "../../src/lib/database/connection";
import { getDatabase } from "../../src/lib/database/client";
import {
  profiles,
  securityProfiles,
  subscriptionPlans,
  subscriptions,
  userSettings,
  users,
} from "../../src/lib/database/schema";

const ADMIN_EMAIL = "admin@synsight.local";
const ADMIN_USERNAME = "admin";

async function seed() {
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL is not set. Aborting seed.");
    process.exit(1);
  }

  const db = getDatabase();
  if (!db) {
    console.error("Failed to initialize database client.");
    process.exit(1);
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME))
    .limit(1);

  let adminId = existing[0]?.id;

  if (!adminId) {
    const inserted = await db.insert(users).values({
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      passwordHash: DEV_ADMIN_PASSWORD_HASH,
      status: "active",
      role: "admin",
      emailVerifiedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
    });
    adminId = Number(inserted[0].insertId);
    console.log(`Created admin user (id=${adminId}, email=${ADMIN_EMAIL})`);
  } else {
    await db
      .update(users)
      .set({
        email: ADMIN_EMAIL,
        passwordHash: DEV_ADMIN_PASSWORD_HASH,
        status: "active",
        role: "admin",
      })
      .where(eq(users.id, adminId));
    console.log(`Updated admin user (id=${adminId}, email=${ADMIN_EMAIL})`);
  }

  await db
    .insert(profiles)
    .values({
      userId: adminId,
      firstName: "Alex",
      lastName: "Morgan",
      location: "Gera, Thüringen",
      region: "EU",
      locale: "de-DE",
      onboardingStep: 4,
      onboardingCompletedAt: new Date()
        .toISOString()
        .slice(0, 23)
        .replace("T", " "),
    })
    .onDuplicateKeyUpdate({
      set: {
        firstName: "Alex",
        lastName: "Morgan",
        location: "Gera, Thüringen",
        onboardingStep: 4,
      },
    });

  await db
    .insert(securityProfiles)
    .values({
      userId: adminId,
      monitoringEnabled: true,
      criticalAlerts: true,
      weeklySummary: true,
      aiRecommendations: true,
      securityScore: 78,
      lastAnalysisAt: new Date().toISOString().slice(0, 23).replace("T", " "),
      nextScanAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 23)
        .replace("T", " "),
      consentMonitoringAt: new Date()
        .toISOString()
        .slice(0, 23)
        .replace("T", " "),
    })
    .onDuplicateKeyUpdate({
      set: {
        securityScore: 78,
      },
    });

  await db
    .insert(userSettings)
    .values({
      userId: adminId,
      theme: "dark",
      locale: "de-DE",
      timezone: "Europe/Berlin",
    })
    .onDuplicateKeyUpdate({
      set: {
        theme: "dark",
      },
    });

  const planRows = await db
    .select({ id: subscriptionPlans.id })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.code, "protect"))
    .limit(1);

  let planId = planRows[0]?.id;

  if (!planId) {
    const planInsert = await db.insert(subscriptionPlans).values({
      code: "protect",
      name: "SynSight Protect",
      description:
        "Vollständige Identitätsüberwachung mit KI-Analyse und Prioritäts-Alerts.",
      priceMonthly: "29.00",
      priceYearly: "290.00",
      currency: "EUR",
      featuresJson: [
        "24/7 Monitoring",
        "KI-Analyse",
        "Leak-Alerts",
        "Wöchentlicher Report",
      ],
      isActive: true,
    });
    planId = Number(planInsert[0].insertId);
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 23).replace("T", " ");

  await db
    .insert(subscriptions)
    .values({
      userId: adminId,
      planId,
      status: "active",
      currentPeriodStart: fmt(now),
      currentPeriodEnd: fmt(periodEnd),
      cancelAtPeriodEnd: false,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: "active",
      },
    });

  console.log("Seed completed successfully.");
  console.log(`Admin login: ${ADMIN_EMAIL} / admin (Argon2id)`);
  await closeConnectionPool();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
