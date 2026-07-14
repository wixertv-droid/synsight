/**
 * Drizzle ORM schema — single source of truth for the MySQL 8 data model.
 *
 * `database/migrations/001_initial_schema.sql` mirrors this schema as a
 * reference migration for self-hosted deployments. Keep both in sync when
 * adding tables or columns.
 */
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const userStatusEnum = mysqlEnum("user_status", [
  "pending_verification",
  "active",
  "suspended",
  "deleted",
]);

const tokenTypeEnum = mysqlEnum("token_type", [
  "password_reset",
  "email_verification",
  "api_key",
]);

const reportTypeEnum = mysqlEnum("report_type", [
  "initial",
  "scheduled",
  "manual",
]);

const reportStatusEnum = mysqlEnum("report_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

const itemSeverityEnum = mysqlEnum("item_severity", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

const subscriptionStatusEnum = mysqlEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);

const paymentStatusEnum = mysqlEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const users = mysqlTable(
  "users",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    status: userStatusEnum.notNull().default("pending_verification"),
    emailVerifiedAt: timestamp("email_verified_at", { mode: "string", fsp: 3 }),
    lastLoginAt: timestamp("last_login_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_username_unique").on(table.username),
    index("users_status_idx").on(table.status),
  ]
);

export const profiles = mysqlTable("profiles", {
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  company: varchar("company", { length: 150 }),
  region: varchar("region", { length: 100 }).notNull().default("EU"),
  locale: varchar("locale", { length: 10 }).notNull().default("de-DE"),
  publicAlias: varchar("public_alias", { length: 100 }),
  onboardingStep: int("onboarding_step", { unsigned: true })
    .notNull()
    .default(0),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    mode: "string",
    fsp: 3,
  }),
  createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
});

export const sessions = mysqlTable(
  "sessions",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { mode: "string", fsp: 3 }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { mode: "string", fsp: 3 }).notNull(),
    revokedAt: timestamp("revoked_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
);

export const userTokens = mysqlTable(
  "user_tokens",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    tokenType: tokenTypeEnum.notNull(),
    expiresAt: timestamp("expires_at", { mode: "string", fsp: 3 }).notNull(),
    usedAt: timestamp("used_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("user_tokens_user_id_idx").on(table.userId),
    index("user_tokens_token_hash_idx").on(table.tokenHash),
    index("user_tokens_expires_at_idx").on(table.expiresAt),
  ]
);

export const securityProfiles = mysqlTable("security_profiles", {
  id: bigint("id", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  monitoringEnabled: boolean("monitoring_enabled").notNull().default(true),
  criticalAlerts: boolean("critical_alerts").notNull().default(true),
  weeklySummary: boolean("weekly_summary").notNull().default(true),
  aiRecommendations: boolean("ai_recommendations").notNull().default(true),
  securityScore: int("security_score", { unsigned: true }),
  lastAnalysisAt: timestamp("last_analysis_at", { mode: "string", fsp: 3 }),
  nextScanAt: timestamp("next_scan_at", { mode: "string", fsp: 3 }),
  consentMonitoringAt: timestamp("consent_monitoring_at", {
    mode: "string",
    fsp: 3,
  }),
  createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  uniqueIndex("security_profiles_user_id_unique").on(table.userId),
]);

export const analysisReports = mysqlTable(
  "analysis_reports",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportType: reportTypeEnum.notNull(),
    status: reportStatusEnum.notNull().default("queued"),
    overallScore: int("overall_score", { unsigned: true }),
    signalsCount: int("signals_count", { unsigned: true })
      .notNull()
      .default(0),
    startedAt: timestamp("started_at", { mode: "string", fsp: 3 }),
    completedAt: timestamp("completed_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("analysis_reports_user_id_idx").on(table.userId),
    index("analysis_reports_status_idx").on(table.status),
  ]
);

export const analysisReportItems = mysqlTable(
  "analysis_report_items",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    reportId: bigint("report_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => analysisReports.id, { onDelete: "cascade" }),
    itemType: varchar("item_type", { length: 64 }).notNull(),
    severity: itemSeverityEnum.notNull().default("info"),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    source: varchar("source", { length: 128 }),
    metadataJson: json("metadata_json"),
    sortOrder: int("sort_order", { unsigned: true }).notNull().default(0),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("analysis_report_items_report_id_idx").on(table.reportId),
    index("analysis_report_items_severity_idx").on(table.severity),
  ]
);

export const subscriptionPlans = mysqlTable(
  "subscription_plans",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    priceYearly: decimal("price_yearly", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    featuresJson: json("features_json"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [uniqueIndex("subscription_plans_code_unique").on(table.code)]
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: bigint("plan_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => subscriptionPlans.id),
    status: subscriptionStatusEnum.notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start", {
      mode: "string",
      fsp: 3,
    }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", {
      mode: "string",
      fsp: 3,
    }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_status_idx").on(table.status),
  ]
);

export const payments = mysqlTable(
  "payments",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: bigint("subscription_id", {
      mode: "number",
      unsigned: true,
    }).references(() => subscriptions.id, { onDelete: "set null" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    status: paymentStatusEnum.notNull().default("pending"),
    provider: varchar("provider", { length: 64 }).notNull().default("manual"),
    providerReference: varchar("provider_reference", { length: 255 }),
    paidAt: timestamp("paid_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("payments_user_id_idx").on(table.userId),
    index("payments_status_idx").on(table.status),
  ]
);

export const userSettings = mysqlTable("user_settings", {
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 32 }).notNull().default("dark"),
  notificationsJson: json("notifications_json"),
  locale: varchar("locale", { length: 10 }).notNull().default("de-DE"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Berlin"),
  createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
});

export const auditEvents = mysqlTable(
  "audit_events",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(
      () => users.id,
      { onDelete: "set null" }
    ),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: varchar("entity_id", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    metadataJson: json("metadata_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("audit_events_user_id_idx").on(table.userId),
    index("audit_events_event_type_idx").on(table.eventType),
    index("audit_events_created_at_idx").on(table.createdAt),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  securityProfile: one(securityProfiles, {
    fields: [users.id],
    references: [securityProfiles.userId],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  sessions: many(sessions),
  tokens: many(userTokens),
  analysisReports: many(analysisReports),
  subscriptions: many(subscriptions),
  payments: many(payments),
  auditEvents: many(auditEvents),
}));

export type DbUser = typeof users.$inferSelect;
export type DbProfile = typeof profiles.$inferSelect;
export type DbSession = typeof sessions.$inferSelect;
export type DbSecurityProfile = typeof securityProfiles.$inferSelect;
