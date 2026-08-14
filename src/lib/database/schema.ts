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
  date,
  decimal,
  index,
  int,
  json,
  longtext,
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

const userRoleEnum = mysqlEnum("role", ["admin", "support", "worker", "user"]);

const tokenTypeEnum = mysqlEnum("token_type", [
  "password_reset",
  "email_verification",
  "api_key",
  "mobile_upload",
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
  (table) => [
    index("profile_images_user_id_idx").on(table.userId),
    uniqueIndex("profile_images_user_type_unique").on(
      table.userId,
      table.imageType
    ),
  ]
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

export const paymentProviders = mysqlTable(
  "payment_providers",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    isActive: boolean("is_active").notNull().default(false),
    supportsCheckout: boolean("supports_checkout").notNull().default(true),
    configJson: json("config_json"),
    encryptedApiKey: text("encrypted_api_key"),
    encryptedWebhookSecret: text("encrypted_webhook_secret"),
    environment: varchar("environment", { length: 32 })
      .notNull()
      .default("test"),
    notes: varchar("notes", { length: 500 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [uniqueIndex("payment_providers_code_unique").on(table.code)]
);

export const creditPackages = mysqlTable(
  "credit_packages",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    credits: int("credits", { unsigned: true }).notNull(),
    bonusCredits: int("bonus_credits", { unsigned: true }).notNull().default(0),
    priceCents: int("price_cents", { unsigned: true }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    badge: varchar("badge", { length: 64 }),
    sortOrder: int("sort_order", { unsigned: true }).notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    defaultCredits: int("default_credits", { unsigned: true }),
    defaultBonusCredits: int("default_bonus_credits", { unsigned: true }),
    defaultPriceCents: int("default_price_cents", { unsigned: true }),
    isPopular: boolean("is_popular").notNull().default(false),
    updatedByAdminId: bigint("updated_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("credit_packages_code_unique").on(table.code),
    index("credit_packages_active_idx").on(table.isActive, table.sortOrder),
  ]
);

export const analysisPricing = mysqlTable(
  "analysis_pricing",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    analysisKey: varchar("analysis_key", { length: 64 }).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    description: varchar("description", { length: 500 }),
    credits: int("credits", { unsigned: true }).notNull(),
    sortOrder: int("sort_order", { unsigned: true }).notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSystemDefault: boolean("is_system_default").notNull().default(false),
    defaultLabel: varchar("default_label", { length: 150 }),
    defaultDescription: varchar("default_description", { length: 500 }),
    defaultCredits: int("default_credits", { unsigned: true }),
    updatedByAdminId: bigint("updated_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("analysis_pricing_key_unique").on(table.analysisKey),
    index("analysis_pricing_active_idx").on(table.isActive, table.sortOrder),
    index("analysis_pricing_updated_by_idx").on(table.updatedByAdminId),
  ]
);

export const creditAccounts = mysqlTable("credit_accounts", {
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: int("balance").notNull().default(0),
  lifetimePurchased: int("lifetime_purchased", { unsigned: true })
    .notNull()
    .default(0),
  lifetimeSpent: int("lifetime_spent", { unsigned: true }).notNull().default(0),
  lifetimeBonus: int("lifetime_bonus", { unsigned: true }).notNull().default(0),
  createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
});

export const creditTransactions = mysqlTable(
  "credit_transactions",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", [
      "purchase",
      "consume",
      "bonus",
      "admin_grant",
      "admin_revoke",
      "refund",
      "adjustment",
    ]).notNull(),
    amount: int("amount").notNull(),
    balanceAfter: int("balance_after").notNull(),
    analysisKey: varchar("analysis_key", { length: 64 }),
    packageCode: varchar("package_code", { length: 64 }),
    paymentId: bigint("payment_id", { mode: "number", unsigned: true }),
    usageLogId: bigint("usage_log_id", { mode: "number", unsigned: true }),
    description: varchar("description", { length: 255 }).notNull(),
    metadataJson: json("metadata_json"),
    createdByAdminId: bigint("created_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    performedBy: bigint("performed_by", {
      mode: "number",
      unsigned: true,
    }),
    reason: varchar("reason", { length: 500 }),
    transactionSource: mysqlEnum("transaction_source", [
      "purchase",
      "analysis",
      "bonus",
      "refund",
      "admin_credit",
      "admin_remove",
      "adjustment",
      "promotion",
      "order",
    ])
      .notNull()
      .default("adjustment"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("credit_transactions_user_id_idx").on(table.userId),
    index("credit_transactions_type_idx").on(table.type),
    index("credit_transactions_created_at_idx").on(table.createdAt),
    index("credit_transactions_performed_by_idx").on(table.performedBy),
    index("credit_transactions_source_idx").on(table.transactionSource),
  ]
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paymentId: bigint("payment_id", { mode: "number", unsigned: true }),
    invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
    amountCents: int("amount_cents", { unsigned: true }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    status: mysqlEnum("status", ["draft", "open", "paid", "void", "refunded"])
      .notNull()
      .default("draft"),
    issuedAt: timestamp("issued_at", { mode: "string", fsp: 3 }),
    paidAt: timestamp("paid_at", { mode: "string", fsp: 3 }),
    pdfPath: varchar("pdf_path", { length: 500 }),
    metadataJson: json("metadata_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("invoices_invoice_number_unique").on(table.invoiceNumber),
    index("invoices_user_id_idx").on(table.userId),
  ]
);

export const usageLogs = mysqlTable(
  "usage_logs",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    analysisKey: varchar("analysis_key", { length: 64 }).notNull(),
    creditsCharged: int("credits_charged", { unsigned: true }).notNull(),
    status: mysqlEnum("status", ["reserved", "completed", "failed", "refunded"])
      .notNull()
      .default("completed"),
    transactionId: bigint("transaction_id", { mode: "number", unsigned: true }),
    requestId: varchar("request_id", { length: 64 }),
    metadataJson: json("metadata_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("usage_logs_user_id_idx").on(table.userId),
    index("usage_logs_analysis_key_idx").on(table.analysisKey),
    index("usage_logs_created_at_idx").on(table.createdAt),
    uniqueIndex("usage_logs_user_request_unique").on(
      table.userId,
      table.requestId
    ),
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
    purpose: mysqlEnum("purpose", ["subscription", "credits", "other"])
      .notNull()
      .default("subscription"),
    packageId: bigint("package_id", { mode: "number", unsigned: true }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    amountCents: int("amount_cents", { unsigned: true }),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    status: paymentStatusEnum.notNull().default("pending"),
    provider: varchar("provider", { length: 64 }).notNull().default("manual"),
    providerId: bigint("provider_id", { mode: "number", unsigned: true }),
    invoiceId: bigint("invoice_id", { mode: "number", unsigned: true }),
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

export const promotions = mysqlTable(
  "promotions",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(false),
    startsAt: varchar("starts_at", { length: 10 }),
    endsAt: varchar("ends_at", { length: 10 }),
    timeFrom: varchar("time_from", { length: 8 }),
    timeTo: varchar("time_to", { length: 8 }),
    timezone: varchar("timezone", { length: 64 })
      .notNull()
      .default("Europe/Berlin"),
    bonusCredits: int("bonus_credits", { unsigned: true }).notNull().default(0),
    promoCodeRequired: boolean("promo_code_required").notNull().default(false),
    promoCode: varchar("promo_code", { length: 64 }),
    newUsersOnly: boolean("new_users_only").notNull().default(false),
    existingUsersOnly: boolean("existing_users_only").notNull().default(false),
    singleUsePerUser: boolean("single_use_per_user").notNull().default(true),
    maxParticipants: int("max_participants", { unsigned: true }),
    minBalance: int("min_balance", { unsigned: true }),
    budgetCredits: int("budget_credits", { unsigned: true }),
    createdByAdminId: bigint("created_by_admin_id", {
      mode: "number",
      unsigned: true,
    }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("promotions_promo_code_unique").on(table.promoCode),
    index("promotions_active_idx").on(
      table.isActive,
      table.startsAt,
      table.endsAt
    ),
  ]
);

export const promotionRewards = mysqlTable(
  "promotion_rewards",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    promotionId: bigint("promotion_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credits: int("credits", { unsigned: true }).notNull(),
    creditTransactionId: bigint("credit_transaction_id", {
      mode: "number",
      unsigned: true,
    }).references(() => creditTransactions.id, { onDelete: "set null" }),
    promoCodeUsed: varchar("promo_code_used", { length: 64 }),
    notificationShownAt: timestamp("notification_shown_at", {
      mode: "string",
      fsp: 3,
    }),
    grantedAt: timestamp("granted_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("promotion_rewards_promotion_id_idx").on(table.promotionId),
    index("promotion_rewards_user_id_idx").on(table.userId),
    index("promotion_rewards_notification_idx").on(
      table.userId,
      table.notificationShownAt
    ),
    uniqueIndex("promotion_rewards_promo_user_uq").on(
      table.promotionId,
      table.userId
    ),
  ]
);

export const promotionLogs = mysqlTable(
  "promotion_logs",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    promotionId: bigint("promotion_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    promotionRewardId: bigint("promotion_reward_id", {
      mode: "number",
      unsigned: true,
    }).references(() => promotionRewards.id, { onDelete: "set null" }),
    credits: int("credits", { unsigned: true }).notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    adminId: bigint("admin_id", { mode: "number", unsigned: true }).references(
      () => users.id,
      { onDelete: "set null" }
    ),
    creditTransactionId: bigint("credit_transaction_id", {
      mode: "number",
      unsigned: true,
    }).references(() => creditTransactions.id, { onDelete: "set null" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    metadataJson: json("metadata_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("promotion_logs_promotion_id_idx").on(table.promotionId),
    index("promotion_logs_user_id_idx").on(table.userId),
    index("promotion_logs_created_at_idx").on(table.createdAt),
  ]
);

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

const requestStatusEnum = mysqlEnum("status", [
  "new",
  "processing",
  "answered",
  "archived",
]);

export const communicationSettings = mysqlTable("communication_settings", {
  id: int("id", { unsigned: true }).primaryKey().default(1),
  contactEmail: varchar("contact_email", { length: 255 })
    .notNull()
    .default("contact@synsight.de"),
  pressEmail: varchar("press_email", { length: 255 })
    .notNull()
    .default("press@synsight.de"),
  partnersEmail: varchar("partners_email", { length: 255 })
    .notNull()
    .default("partners@synsight.de"),
  supportEmail: varchar("support_email", { length: 255 })
    .notNull()
    .default("support@synsight.de"),
  privacyEmail: varchar("privacy_email", { length: 255 })
    .notNull()
    .default("datenschutz@synsight.de"),
  updatedByAdminId: bigint("updated_by_admin_id", {
    mode: "number",
    unsigned: true,
  }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
});

export const contactRequests = mysqlTable(
  "contact_requests",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    name: varchar("name", { length: 150 }).notNull(),
    company: varchar("company", { length: 200 }),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    subject: varchar("subject", { length: 200 }).notNull(),
    message: text("message").notNull(),
    status: requestStatusEnum.notNull().default("new"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("contact_requests_status_idx").on(table.status),
    index("contact_requests_created_at_idx").on(table.createdAt),
    index("contact_requests_email_idx").on(table.email),
  ]
);

export const supportRequests = mysqlTable(
  "support_requests",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    name: varchar("name", { length: 150 }).notNull(),
    company: varchar("company", { length: 200 }),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    subject: varchar("subject", { length: 200 }).notNull(),
    message: text("message").notNull(),
    status: requestStatusEnum.notNull().default("new"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("support_requests_status_idx").on(table.status),
    index("support_requests_created_at_idx").on(table.createdAt),
    index("support_requests_email_idx").on(table.email),
  ]
);

export const partnerRequests = mysqlTable(
  "partner_requests",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    name: varchar("name", { length: 150 }).notNull(),
    company: varchar("company", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    partnershipType: varchar("partnership_type", { length: 120 }).notNull(),
    message: text("message").notNull(),
    status: requestStatusEnum.notNull().default("new"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("partner_requests_status_idx").on(table.status),
    index("partner_requests_created_at_idx").on(table.createdAt),
    index("partner_requests_email_idx").on(table.email),
  ]
);

export const pressRequests = mysqlTable(
  "press_requests",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    name: varchar("name", { length: 150 }).notNull(),
    medium: varchar("medium", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    topic: varchar("topic", { length: 200 }).notNull(),
    message: text("message").notNull(),
    status: requestStatusEnum.notNull().default("new"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("press_requests_status_idx").on(table.status),
    index("press_requests_created_at_idx").on(table.createdAt),
    index("press_requests_email_idx").on(table.email),
  ]
);

export const platformSettings = mysqlTable("platform_settings", {
  id: int("id", { unsigned: true }).primaryKey().default(1),
  settingsJson: json("settings_json").notNull(),
  updatedByAdminId: bigint("updated_by_admin_id", {
    mode: "number",
    unsigned: true,
  }),
  updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
});

export const apiCredentials = mysqlTable(
  "api_credentials",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    provider: varchar("provider", { length: 64 }).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    encryptedSecret: text("encrypted_secret").notNull(),
    configJson: json("config_json"),
    isActive: boolean("is_active").notNull().default(true),
    lastSuccessAt: timestamp("last_success_at", { mode: "string", fsp: 3 }),
    lastErrorAt: timestamp("last_error_at", { mode: "string", fsp: 3 }),
    lastErrorMessage: text("last_error_message"),
    updatedByAdminId: bigint("updated_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [uniqueIndex("api_credentials_provider_unique").on(table.provider)]
);

export const advertisingCampaigns = mysqlTable(
  "advertising_campaigns",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),

    name: varchar("name", { length: 180 }).notNull(),
    platform: varchar("platform", { length: 64 }).notNull().default("other"),

    externalCampaignId: varchar("external_campaign_id", { length: 255 }),
    externalAccountId: varchar("external_account_id", { length: 255 }),

    status: mysqlEnum("status", [
      "draft",
      "active",
      "paused",
      "completed",
      "archived",
    ])
      .notNull()
      .default("draft"),

    objective: varchar("objective", { length: 120 }),
    landingUrl: varchar("landing_url", { length: 500 }),

    startsAt: date("starts_at", { mode: "string" }),
    endsAt: date("ends_at", { mode: "string" }),

    dailyBudgetEur: decimal("daily_budget_eur", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0.00"),

    totalBudgetEur: decimal("total_budget_eur", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0.00"),

    targetCountry: varchar("target_country", { length: 64 }),
    targetRegion: varchar("target_region", { length: 120 }),
    targetAudience: text("target_audience"),

    utmSource: varchar("utm_source", { length: 120 }),
    utmMedium: varchar("utm_medium", { length: 120 }),
    utmCampaign: varchar("utm_campaign", { length: 180 }),
    utmContent: varchar("utm_content", { length: 180 }),

    notes: text("notes"),

    createdByAdminId: bigint("created_by_admin_id", {
      mode: "number",
      unsigned: true,
    }).references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),

    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("advertising_campaigns_platform_idx").on(table.platform),
    index("advertising_campaigns_status_idx").on(table.status),
    index("advertising_campaigns_dates_idx").on(table.startsAt, table.endsAt),
  ]
);

export const advertisingDailyMetrics = mysqlTable(
  "advertising_daily_metrics",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),

    campaignId: bigint("campaign_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => advertisingCampaigns.id, {
        onDelete: "cascade",
      }),

    metricDate: date("metric_date", { mode: "string" }).notNull(),

    spendEur: decimal("spend_eur", {
      precision: 12,
      scale: 4,
    })
      .notNull()
      .default("0.0000"),

    impressions: bigint("impressions", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .default(0),

    reach: bigint("reach", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .default(0),

    clicks: bigint("clicks", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .default(0),

    conversions: decimal("conversions", {
      precision: 12,
      scale: 4,
    })
      .notNull()
      .default("0.0000"),

    conversionValueEur: decimal("conversion_value_eur", {
      precision: 12,
      scale: 4,
    })
      .notNull()
      .default("0.0000"),

    source: varchar("source", { length: 32 }).notNull().default("manual"),

    externalSyncId: varchar("external_sync_id", { length: 255 }),
    metaJson: json("meta_json"),

    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),

    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("advertising_metric_campaign_date_uq").on(
      table.campaignId,
      table.metricDate
    ),
    index("advertising_metric_date_idx").on(table.metricDate),
    index("advertising_metric_campaign_idx").on(table.campaignId),
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

export const intelligenceReports = mysqlTable(
  "intelligence_reports",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleKey: varchar("module_key", { length: 64 }).notNull(),
    subjectName: varchar("subject_name", { length: 255 }).notNull(),
    riskScore: int("risk_score", { unsigned: true }).notNull().default(0),
    riskLevel: varchar("risk_level", { length: 32 })
      .notNull()
      .default("niedrig"),
    hitCount: int("hit_count", { unsigned: true }).notNull().default(0),
    retentionDays: int("retention_days", { unsigned: true })
      .notNull()
      .default(30),
    expiresAt: timestamp("expires_at", { mode: "string", fsp: 3 }),
    reportJson: json("report_json").notNull(),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("intelligence_reports_user_module_unique").on(
      table.userId,
      table.moduleKey
    ),
    index("intelligence_reports_user_id_idx").on(table.userId),
    index("intelligence_reports_expires_at_idx").on(table.expiresAt),
  ]
);

export const searchProviderSettings = mysqlTable(
  "search_provider_settings",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    provider: varchar("provider", { length: 64 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    encryptedApiKey: text("encrypted_api_key"),
    status: varchar("status", { length: 32 }).notNull().default("unknown"),
    lastCheckAt: timestamp("last_check_at", { mode: "string", fsp: 3 }),
    lastSuccessAt: timestamp("last_success_at", { mode: "string", fsp: 3 }),
    lastErrorAt: timestamp("last_error_at", { mode: "string", fsp: 3 }),
    lastErrorMessage: text("last_error_message"),
    averageResponseTimeMs: int("average_response_time_ms", {
      unsigned: true,
    })
      .notNull()
      .default(0),
    dailyRequests: int("daily_requests", { unsigned: true })
      .notNull()
      .default(0),
    dailyRequestsDate: date("daily_requests_date", { mode: "string" }),
    totalRequests: bigint("total_requests", { mode: "number", unsigned: true })
      .notNull()
      .default(0),
    totalErrors: bigint("total_errors", { mode: "number", unsigned: true })
      .notNull()
      .default(0),
    apiVersion: varchar("api_version", { length: 64 }),
    configJson: json("config_json"),
    updatedByAdminId: bigint("updated_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("search_provider_settings_provider_unique").on(table.provider),
  ]
);

export const apiCostSettings = mysqlTable(
  "api_cost_settings",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    providerCode: varchar("provider_code", { length: 64 }).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    costPerRequestEur: decimal("cost_per_request_eur", {
      precision: 12,
      scale: 6,
    })
      .notNull()
      .default("0"),
    billingMode: varchar("billing_mode", { length: 32 })
      .notNull()
      .default("per_request"),
    costPer1mInputTokensEur: decimal("cost_per_1m_input_tokens_eur", {
      precision: 12,
      scale: 6,
    })
      .notNull()
      .default("0"),
    costPer1mOutputTokensEur: decimal("cost_per_1m_output_tokens_eur", {
      precision: 12,
      scale: 6,
    })
      .notNull()
      .default("0"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    isActive: boolean("is_active").notNull().default(true),
    notes: varchar("notes", { length: 500 }),
    updatedByAdminId: bigint("updated_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("api_cost_settings_provider_unique").on(table.providerCode),
  ]
);

export const apiUsageEvents = mysqlTable(
  "api_usage_events",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    providerCode: varchar("provider_code", { length: 64 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    referenceKey: varchar("reference_key", { length: 128 }),
    userId: bigint("user_id", { mode: "number", unsigned: true }),
    analysisId: bigint("analysis_id", { mode: "number", unsigned: true }),
    requestCount: int("request_count", { unsigned: true }).notNull().default(1),
    unitCostEur: decimal("unit_cost_eur", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    totalCostEur: decimal("total_cost_eur", { precision: 14, scale: 6 })
      .notNull()
      .default("0"),
    success: boolean("success").notNull().default(true),
    detail: varchar("detail", { length: 500 }),
    metaJson: json("meta_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("api_usage_events_provider_created_idx").on(
      table.providerCode,
      table.createdAt
    ),
    index("api_usage_events_created_idx").on(table.createdAt),
    index("api_usage_events_reference_idx").on(table.referenceKey),
    index("api_usage_events_analysis_id_idx").on(table.analysisId),
  ]
);

export const digitalExposureScans = mysqlTable(
  "digital_exposure_scans",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    startedAt: timestamp("started_at", { mode: "string", fsp: 3 }),
    completedAt: timestamp("completed_at", { mode: "string", fsp: 3 }),
    riskScore: int("risk_score", { unsigned: true }).notNull().default(0),
    summary: text("summary"),
    subjectName: varchar("subject_name", { length: 255 }),
    emailCount: int("email_count", { unsigned: true }).notNull().default(0),
    phoneCount: int("phone_count", { unsigned: true }).notNull().default(0),
    findingCount: int("finding_count", { unsigned: true }).notNull().default(0),
    retentionDays: int("retention_days").notNull().default(90),
    expiresAt: timestamp("expires_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("digital_exposure_scans_user_id_idx").on(table.userId),
    index("digital_exposure_scans_created_at_idx").on(table.createdAt),
    index("digital_exposure_scans_expires_at_idx").on(table.expiresAt),
  ]
);

export const digitalExposureResults = mysqlTable(
  "digital_exposure_results",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    scanId: bigint("scan_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => digitalExposureScans.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    riskLevel: varchar("risk_level", { length: 16 }).notNull().default("low"),
    sourceName: varchar("source_name", { length: 255 }),
    sourceDate: varchar("source_date", { length: 32 }),
    recommendation: text("recommendation"),
    sourceUrl: varchar("source_url", { length: 500 }),
    identifierMasked: varchar("identifier_masked", { length: 255 }),
    dataClassesJson: json("data_classes_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("digital_exposure_results_scan_id_idx").on(table.scanId),
    index("digital_exposure_results_type_idx").on(table.type),
  ]
);

export const apiUsageLogs = mysqlTable(
  "api_usage_logs",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    provider: varchar("provider", { length: 64 }).notNull(),
    requestType: varchar("request_type", { length: 64 }).notNull(),
    costEur: decimal("cost_eur", { precision: 14, scale: 6 })
      .notNull()
      .default("0"),
    userId: bigint("user_id", { mode: "number", unsigned: true }),
    analysisId: bigint("analysis_id", { mode: "number", unsigned: true }),
    analysisKey: varchar("analysis_key", { length: 64 }),
    success: boolean("success").notNull().default(true),
    detail: varchar("detail", { length: 500 }),
    metaJson: json("meta_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("api_usage_logs_provider_created_idx").on(
      table.provider,
      table.createdAt
    ),
    index("api_usage_logs_user_id_idx").on(table.userId),
    index("api_usage_logs_analysis_id_idx").on(table.analysisId),
    index("api_usage_logs_created_at_idx").on(table.createdAt),
  ]
);

export const usernameAnalysis = mysqlTable(
  "username_analysis",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    subjectUsername: varchar("subject_username", { length: 255 }),
    subjectName: varchar("subject_name", { length: 255 }),
    startedAt: timestamp("started_at", { mode: "string", fsp: 3 }),
    completedAt: timestamp("completed_at", { mode: "string", fsp: 3 }),
    identityScore: int("identity_score", { unsigned: true })
      .notNull()
      .default(0),
    riskScore: int("risk_score", { unsigned: true }).notNull().default(0),
    confidence: int("confidence", { unsigned: true }).notNull().default(0),
    hitCount: int("hit_count", { unsigned: true }).notNull().default(0),
    queryCount: int("query_count", { unsigned: true }).notNull().default(0),
    summary: text("summary"),
    settingsJson: json("settings_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("username_analysis_user_id_idx").on(table.userId),
    index("username_analysis_created_at_idx").on(table.createdAt),
  ]
);

export const usernameHits = mysqlTable(
  "username_hits",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    analysisId: bigint("analysis_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => usernameAnalysis.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 120 }).notNull(),
    category: varchar("category", { length: 64 }).notNull().default("Sonstige"),
    profileName: varchar("profile_name", { length: 255 }),
    profileUrl: varchar("profile_url", { length: 500 }),
    title: varchar("title", { length: 500 }),
    snippet: text("snippet"),
    visibleInfoJson: json("visible_info_json"),
    identityScore: int("identity_score", { unsigned: true })
      .notNull()
      .default(0),
    confidence: int("confidence", { unsigned: true }).notNull().default(0),
    riskLevel: varchar("risk_level", { length: 16 }).notNull().default("low"),
    firstSeen: varchar("first_seen", { length: 64 }),
    queryUsed: varchar("query_used", { length: 500 }),
    logoKey: varchar("logo_key", { length: 64 }),
    metaJson: json("meta_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("username_hits_analysis_id_idx").on(table.analysisId),
    index("username_hits_platform_idx").on(table.platform),
    index("username_hits_confidence_idx").on(table.confidence),
  ]
);

export const usernameReports = mysqlTable(
  "username_reports",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    analysisId: bigint("analysis_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => usernameAnalysis.id, { onDelete: "cascade" }),
    reportJson: json("report_json").notNull(),
    managementSummary: text("management_summary"),
    identityGraphJson: json("identity_graph_json"),
    platformOverviewJson: json("platform_overview_json"),
    timelineJson: json("timeline_json"),
    heatmapJson: json("heatmap_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("username_reports_analysis_id_unique").on(table.analysisId),
  ]
);

export const usernameAiReports = mysqlTable(
  "username_ai_reports",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    analysisId: bigint("analysis_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => usernameAnalysis.id, { onDelete: "cascade" }),
    model: varchar("model", { length: 120 }),
    promptHash: varchar("prompt_hash", { length: 64 }),
    content: text("content").notNull(),
    tokenUsageJson: json("token_usage_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [index("username_ai_reports_analysis_id_idx").on(table.analysisId)]
);

export const usernameCostLogs = mysqlTable(
  "username_cost_logs",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    analysisId: bigint("analysis_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => usernameAnalysis.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true }),
    serpapiRequests: int("serpapi_requests", { unsigned: true })
      .notNull()
      .default(0),
    serpapiCostEur: decimal("serpapi_cost_eur", { precision: 14, scale: 6 })
      .notNull()
      .default("0"),
    geminiTokens: int("gemini_tokens", { unsigned: true }).notNull().default(0),
    geminiCostEur: decimal("gemini_cost_eur", { precision: 14, scale: 6 })
      .notNull()
      .default("0"),
    synCredits: int("syn_credits", { unsigned: true }).notNull().default(0),
    totalApiCostEur: decimal("total_api_cost_eur", { precision: 14, scale: 6 })
      .notNull()
      .default("0"),
    estimatedProfitEur: decimal("estimated_profit_eur", {
      precision: 14,
      scale: 6,
    })
      .notNull()
      .default("0"),
    metaJson: json("meta_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("username_cost_logs_analysis_id_idx").on(table.analysisId),
    index("username_cost_logs_user_id_idx").on(table.userId),
    index("username_cost_logs_created_at_idx").on(table.createdAt),
  ]
);

export const usernameHitActions = mysqlTable(
  "username_hit_actions",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    analysisId: bigint("analysis_id", { mode: "number", unsigned: true }),
    sourceModule: varchar("source_module", { length: 64 })
      .notNull()
      .default("username_intelligence"),
    hitFingerprint: varchar("hit_fingerprint", { length: 64 }).notNull(),
    hitPlatform: varchar("hit_platform", { length: 120 }).notNull(),
    hitUrl: varchar("hit_url", { length: 1000 }),
    action: mysqlEnum("action", [
      "ignored",
      "self",
      "ordered",
      "resolved",
    ]).notNull(),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("username_hit_actions_user_mod_fp").on(
      table.userId,
      table.sourceModule,
      table.hitFingerprint
    ),
    index("username_hit_actions_user_idx").on(table.userId),
    index("username_hit_actions_action_idx").on(table.action),
  ]
);

export const synsightOrders = mysqlTable(
  "synsight_orders",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceModule: varchar("source_module", { length: 64 })
      .notNull()
      .default("username_intelligence"),
    hitFingerprint: varchar("hit_fingerprint", { length: 64 }).notNull(),
    hitPlatform: varchar("hit_platform", { length: 120 }).notNull(),
    hitUrl: varchar("hit_url", { length: 1000 }),
    title: varchar("title", { length: 255 }).notNull(),
    orderType: varchar("order_type", { length: 64 }).notNull(),
    status: mysqlEnum("status", [
      "offen",
      "in_bearbeitung",
      "erledigt",
      "abgelehnt",
      "vorbereitet",
    ])
      .notNull()
      .default("vorbereitet"),
    note: text("note"),
    staffMessage: varchar("staff_message", { length: 1000 }),
    creditsCharged: int("credits_charged", { unsigned: true }),
    requiresVollmacht: boolean("requires_vollmacht").notNull().default(false),
    vollmachtId: bigint("vollmacht_id", { mode: "number", unsigned: true }),
    capabilityOk: boolean("capability_ok"),
    capabilityReason: varchar("capability_reason", { length: 500 }),
    reviewedAt: timestamp("reviewed_at", { mode: "string", fsp: 3 }),
    submittedAt: timestamp("submitted_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("synsight_orders_user_idx").on(table.userId),
    index("synsight_orders_status_idx").on(table.status),
    index("synsight_orders_module_idx").on(table.sourceModule),
  ]
);

export const orderPricing = mysqlTable(
  "order_pricing",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    orderType: varchar("order_type", { length: 64 }).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    description: varchar("description", { length: 500 }),
    credits: int("credits", { unsigned: true }).notNull().default(0),
    requiresVollmacht: boolean("requires_vollmacht").notNull().default(true),
    synsightCapable: boolean("synsight_capable").notNull().default(true),
    capabilityHint: varchar("capability_hint", { length: 500 }),
    sortOrder: int("sort_order", { unsigned: true }).notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    updatedByAdminId: bigint("updated_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("order_pricing_type_unique").on(table.orderType),
    index("order_pricing_active_idx").on(table.isActive, table.sortOrder),
  ]
);

export const orderVollmachten = mysqlTable(
  "order_vollmachten",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: bigint("order_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => synsightOrders.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", [
      "generated",
      "uploaded",
      "verified",
      "rejected",
    ])
      .notNull()
      .default("generated"),
    templateHtml: text("template_html").notNull(),
    templatePath: varchar("template_path", { length: 500 }),
    signedPath: varchar("signed_path", { length: 500 }),
    signedMime: varchar("signed_mime", { length: 120 }),
    signedFileName: varchar("signed_file_name", { length: 255 }),
    rejectReason: varchar("reject_reason", { length: 1000 }),
    rejectedAt: timestamp("rejected_at", { mode: "string", fsp: 3 }),
    generatedAt: timestamp("generated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    uploadedAt: timestamp("uploaded_at", { mode: "string", fsp: 3 }),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("order_vollmachten_order_unique").on(table.orderId),
    index("order_vollmachten_user_idx").on(table.userId),
    index("order_vollmachten_status_idx").on(table.status),
  ]
);

export const usernameModuleSettings = mysqlTable("username_module_settings", {
  id: int("id", { unsigned: true }).primaryKey().default(1),
  isActive: boolean("is_active").notNull().default(true),
  apiEnabled: boolean("api_enabled").notNull().default(true),
  maxQueries: int("max_queries", { unsigned: true }).notNull().default(8),
  countries: varchar("countries", { length: 255 }).notNull().default("de"),
  language: varchar("language", { length: 16 }).notNull().default("de"),
  resultLimit: int("result_limit", { unsigned: true }).notNull().default(40),
  confidenceMin: int("confidence_min", { unsigned: true })
    .notNull()
    .default(60),
  synCredits: int("syn_credits", { unsigned: true }).notNull().default(10),
  serpapiCostEur: decimal("serpapi_cost_eur", { precision: 14, scale: 6 })
    .notNull()
    .default("0.023000"),
  geminiCostEur: decimal("gemini_cost_eur", { precision: 14, scale: 6 })
    .notNull()
    .default("0.002000"),
  markupPercent: decimal("markup_percent", { precision: 8, scale: 2 })
    .notNull()
    .default("100.00"),
  minProfitEur: decimal("min_profit_eur", { precision: 14, scale: 6 })
    .notNull()
    .default("0.050000"),
  creditValueEur: decimal("credit_value_eur", { precision: 14, scale: 6 })
    .notNull()
    .default("0.010000"),
  updatedByAdminId: bigint("updated_by_admin_id", {
    mode: "number",
    unsigned: true,
  }),
  updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
});

export const reverseImageModuleSettings = mysqlTable(
  "reverse_image_module_settings",
  {
    id: int("id", { unsigned: true }).primaryKey().default(1),
    isActive: boolean("is_active").notNull().default(true),
    publicScanActive: boolean("public_scan_active").notNull().default(true),
    faceVerificationActive: boolean("face_verification_active")
      .notNull()
      .default(true),
    apiEnabled: boolean("api_enabled").notNull().default(true),
    maxPagesPerQuery: int("max_pages_per_query", { unsigned: true })
      .notNull()
      .default(2),
    maxImagesPerQuery: int("max_images_per_query", { unsigned: true })
      .notNull()
      .default(100),
    identityScoreThreshold: int("identity_score_threshold", { unsigned: true })
      .notNull()
      .default(45),
    domainRelevanceMin: int("domain_relevance_min", { unsigned: true })
      .notNull()
      .default(35),
    aiRelevanceFilter: boolean("ai_relevance_filter").notNull().default(true),
    minConfidence: int("min_confidence", { unsigned: true })
      .notNull()
      .default(55),
    compareUrl: varchar("compare_url", { length: 500 })
      .notNull()
      .default("http://161.97.85.22:8000/compare"),
    similarityThreshold: decimal("similarity_threshold", {
      precision: 4,
      scale: 3,
    })
      .notNull()
      .default("0.600"),
    compareTimeoutMs: int("compare_timeout_ms", { unsigned: true })
      .notNull()
      .default(12_000),
    updatedByAdminId: bigint("updated_by_admin_id", {
      mode: "number",
      unsigned: true,
    }),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  }
);

const threatsSummaryStatusEnum = mysqlEnum("status", [
  "ready",
  "generating",
  "failed",
  "empty",
]);

/** Combined Bedrohungen KI-Lagebild — regenerated after each analysis. */
export const userThreatsSummaries = mysqlTable(
  "user_threats_summaries",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    summaryText: text("summary_text").notNull(),
    model: varchar("model", { length: 120 }),
    promptHash: varchar("prompt_hash", { length: 64 }),
    inputFingerprint: varchar("input_fingerprint", { length: 64 }).notNull(),
    threatCount: int("threat_count", { unsigned: true }).notNull().default(0),
    modulesJson: json("modules_json"),
    status: threatsSummaryStatusEnum.notNull().default("ready"),
    errorMessage: varchar("error_message", { length: 500 }),
    generatedAt: timestamp("generated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("user_threats_summaries_user_uq").on(table.userId),
    index("user_threats_summaries_fingerprint_idx").on(table.inputFingerprint),
  ]
);

/* ─── SEO Knowledge CMS (Admin) ─────────────────────────────────────────── */

const seoKnowledgeStatusEnum = mysqlEnum("status", [
  "draft",
  "published",
  "archived",
]);
const seoKnowledgePriorityEnum = mysqlEnum("seo_priority", [
  "hoch",
  "mittel",
  "niedrig",
]);
const seoKnowledgeIntentEnum = mysqlEnum("search_intent", [
  "informational",
  "commercial",
  "transactional",
  "navigational",
]);
const seoKnowledgeDifficultyEnum = mysqlEnum("difficulty", [
  "einsteiger",
  "fortgeschritten",
  "experte",
]);
const seoKnowledgeRiskEnum = mysqlEnum("risk_level", [
  "niedrig",
  "mittel",
  "hoch",
  "kritisch",
]);
const seoKnowledgeCtaPresetEnum = mysqlEnum("cta_preset", [
  "analyse_starten",
  "kostenlos_testen",
  "jetzt_pruefen",
  "custom",
]);
const seoKnowledgeSectionTypeEnum = mysqlEnum("section_type", [
  "content",
  "infobox",
  "hint",
  "code",
  "table",
  "list",
]);
const seoKnowledgeLinkTypeEnum = mysqlEnum("link_type", [
  "wissen",
  "analyse",
  "landing",
  "module",
]);

export const seoKnowledgePages = mysqlTable(
  "seo_knowledge_pages",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    language: varchar("language", { length: 8 }).notNull().default("de"),
    status: seoKnowledgeStatusEnum.notNull().default("draft"),
    category: varchar("category", { length: 64 }).notNull().default("OSINT"),
    targetModule: varchar("target_module", { length: 64 })
      .notNull()
      .default("dashboard"),
    seoPriority: seoKnowledgePriorityEnum.notNull().default("mittel"),
    searchIntent: seoKnowledgeIntentEnum.notNull().default("informational"),
    difficulty: seoKnowledgeDifficultyEnum.notNull().default("einsteiger"),
    riskLevel: seoKnowledgeRiskEnum.notNull().default("mittel"),
    searchVolume: int("search_volume", { unsigned: true }).notNull().default(0),
    keywordDifficulty: int("keyword_difficulty", { unsigned: true })
      .notNull()
      .default(0),
    seoTitle: varchar("seo_title", { length: 255 }),
    metaDescription: varchar("meta_description", { length: 500 }),
    metaKeywords: text("meta_keywords"),
    canonicalUrl: varchar("canonical_url", { length: 500 }),
    ogTitle: varchar("og_title", { length: 255 }),
    ogDescription: varchar("og_description", { length: 500 }),
    ogImageUrl: varchar("og_image_url", { length: 500 }),
    twitterCard: varchar("twitter_card", { length: 32 })
      .notNull()
      .default("summary_large_image"),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    heroTitle: varchar("hero_title", { length: 255 }),
    heroSubtitle: varchar("hero_subtitle", { length: 500 }),
    heroImageUrl: varchar("hero_image_url", { length: 500 }),
    intro: longtext("intro"),
    ctaPreset: seoKnowledgeCtaPresetEnum.notNull().default("jetzt_pruefen"),
    ctaLabel: varchar("cta_label", { length: 120 })
      .notNull()
      .default("Jetzt prüfen"),
    ctaHref: varchar("cta_href", { length: 500 })
      .notNull()
      .default("/#demo-scanner"),
    authorId: bigint("author_id", {
      mode: "number",
      unsigned: true,
    }).references(() => users.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 150 }),
    publishedAt: timestamp("published_at", { mode: "string", fsp: 3 }),
    deletedAt: timestamp("deleted_at", { mode: "string", fsp: 3 }),
    automationFlagsJson: json("automation_flags_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("seo_knowledge_pages_slug_lang_uq").on(
      table.slug,
      table.language
    ),
    index("seo_knowledge_pages_status_idx").on(table.status, table.deletedAt),
    index("seo_knowledge_pages_category_idx").on(table.category),
    index("seo_knowledge_pages_module_idx").on(table.targetModule),
    index("seo_knowledge_pages_priority_idx").on(table.seoPriority),
    index("seo_knowledge_pages_updated_idx").on(table.updatedAt),
    index("seo_knowledge_pages_volume_idx").on(table.searchVolume),
    index("seo_knowledge_pages_deleted_idx").on(table.deletedAt),
  ]
);

export const seoKnowledgeSections = mysqlTable(
  "seo_knowledge_sections",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    pageId: bigint("page_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => seoKnowledgePages.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull().default(0),
    sectionType: seoKnowledgeSectionTypeEnum.notNull().default("content"),
    heading: varchar("heading", { length: 255 }),
    body: longtext("body"),
    imageUrl: varchar("image_url", { length: 500 }),
    metaJson: json("meta_json"),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("seo_knowledge_sections_page_sort_idx").on(
      table.pageId,
      table.sortOrder
    ),
  ]
);

export const seoKnowledgeFaqs = mysqlTable(
  "seo_knowledge_faqs",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    pageId: bigint("page_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => seoKnowledgePages.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull().default(0),
    question: varchar("question", { length: 500 }).notNull(),
    answer: text("answer").notNull(),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("seo_knowledge_faqs_page_sort_idx").on(table.pageId, table.sortOrder),
  ]
);

export const seoKnowledgeLinks = mysqlTable(
  "seo_knowledge_links",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    pageId: bigint("page_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => seoKnowledgePages.id, { onDelete: "cascade" }),
    linkType: seoKnowledgeLinkTypeEnum.notNull().default("wissen"),
    target: varchar("target", { length: 500 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("seo_knowledge_links_page_sort_idx").on(
      table.pageId,
      table.sortOrder
    ),
  ]
);

export type DbUser = typeof users.$inferSelect;
export type DbProfile = typeof profiles.$inferSelect;
export type DbSession = typeof sessions.$inferSelect;
export type DbSecurityProfile = typeof securityProfiles.$inferSelect;
