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
