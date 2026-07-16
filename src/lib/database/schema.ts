/**
 * Drizzle ORM schema — single source of truth for the MariaDB / MySQL data model.
 *
 * SQL migrations under `database/migrations/` are the deployment source of
 * truth for self-hosted Debian/MariaDB servers. Keep Drizzle schema and
 * migrations in sync when adding tables or columns.
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

// mysqlEnum(firstArg) is the physical column name — must match SQL migrations.
const userStatusEnum = mysqlEnum("status", [
  "pending_verification",
  "active",
  "suspended",
  "deleted",
]);

const userRoleEnum = mysqlEnum("role", ["admin", "user"]);

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

const reportStatusEnum = mysqlEnum("status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

const itemSeverityEnum = mysqlEnum("severity", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

const subscriptionStatusEnum = mysqlEnum("status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);

const paymentStatusEnum = mysqlEnum("status", [
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
    role: userRoleEnum.notNull().default("user"),
    failedLoginAttempts: int("failed_login_attempts", { unsigned: true })
      .notNull()
      .default(0),
    lockedUntil: timestamp("locked_until", { mode: "string", fsp: 3 }),
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
    index("users_role_idx").on(table.role),
  ]
);

export const profiles = mysqlTable("profiles", {
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  birthDate: varchar("birth_date", { length: 10 }),
  gender: mysqlEnum("gender", [
    "female",
    "male",
    "non_binary",
    "prefer_not_to_say",
    "other",
  ]),
  phone: varchar("phone", { length: 32 }),
  company: varchar("company", { length: 150 }),
  location: varchar("location", { length: 150 }),
  addressLine: varchar("address_line", { length: 255 }),
  previousLocations: json("previous_locations").$type<string[] | null>(),
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

export const profileAliases = mysqlTable(
  "profile_aliases",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    alias: varchar("alias", { length: 150 }).notNull(),
    aliasType: mysqlEnum("alias_type", [
      "public_alias",
      "former_name",
      "nickname",
      "username",
      "gaming_name",
    ]).notNull(),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [index("profile_aliases_user_id_idx").on(table.userId)]
);

export const profilePhoneNumbers = mysqlTable(
  "profile_phone_numbers",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    label: varchar("label", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [index("profile_phone_numbers_user_id_idx").on(table.userId)]
);

export const profileAdditionalEmails = mysqlTable(
  "profile_additional_emails",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("profile_additional_emails_user_id_idx").on(table.userId),
    uniqueIndex("profile_additional_emails_user_email_unique").on(
      table.userId,
      table.email
    ),
  ]
);

export const socialAccounts = mysqlTable(
  "social_accounts",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 32 }).notNull(),
    username: varchar("username", { length: 150 }).notNull(),
    profileUrl: varchar("profile_url", { length: 500 }),
    accountStatus: mysqlEnum("account_status", ["active", "former", "unknown"])
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("social_accounts_user_id_idx").on(table.userId),
    index("social_accounts_status_idx").on(table.accountStatus),
    uniqueIndex("social_accounts_user_platform_username_unique").on(
      table.userId,
      table.platform,
      table.username
    ),
  ]
);

export const digitalTraces = mysqlTable(
  "digital_traces",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    traceType: mysqlEnum("trace_type", [
      "website",
      "domain",
      "company",
      "public_profile",
    ]).notNull(),
    value: varchar("value", { length: 500 }).notNull(),
    source: varchar("source", { length: 128 }),
    riskLevel: mysqlEnum("risk_level", [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ])
      .notNull()
      .default("info"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("digital_traces_user_id_idx").on(table.userId),
    index("digital_traces_type_idx").on(table.traceType),
    index("digital_traces_risk_level_idx").on(table.riskLevel),
    uniqueIndex("digital_traces_user_type_value_unique").on(
      table.userId,
      table.traceType,
      table.value
    ),
  ]
);

export const profileImages = mysqlTable(
  "profile_images",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imageType: mysqlEnum("image_type", [
      "front",
      "left_profile",
      "right_profile",
      "angled",
    ]).notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    originalPath: varchar("original_path", { length: 500 }),
    analysisPath: varchar("analysis_path", { length: 500 }),
    thumbnailPath: varchar("thumbnail_path", { length: 500 }),
    contentHash: varchar("content_hash", { length: 64 }),
    mimeType: varchar("mime_type", { length: 100 }),
    byteSize: int("byte_size", { unsigned: true }),
    uploadedAt: timestamp("uploaded_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [index("profile_images_user_id_idx").on(table.userId)]
);

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

export const securityProfiles = mysqlTable(
  "security_profiles",
  {
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
  },
  (table) => [uniqueIndex("security_profiles_user_id_unique").on(table.userId)]
);

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
    signalsCount: int("signals_count", { unsigned: true }).notNull().default(0),
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
  timezone: varchar("timezone", { length: 64 })
    .notNull()
    .default("Europe/Berlin"),
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
