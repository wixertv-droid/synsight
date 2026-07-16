/**
 * Persistence-oriented domain entities.
 *
 * These interfaces describe data as it exists in the MySQL model
 * (`database/migrations/001_initial_schema.sql` +
 * `002_production_identity.sql`). They are intentionally decoupled from
 * `types/platform.ts`, which holds UI-facing view models — components should
 * never assume a page renders these entities directly; the service layer maps
 * between the two.
 */

export type UserStatus =
  "pending_verification" | "active" | "suspended" | "deleted";

export interface User {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  status: UserStatus;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: number;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export type ProfileGender =
  "female" | "male" | "non_binary" | "prefer_not_to_say" | "other";

export interface Profile {
  userId: number;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  gender?: ProfileGender | null;
  phone: string | null;
  company: string | null;
  location?: string | null;
  addressLine?: string | null;
  previousLocations?: string[] | null;
  region: string;
  locale: string;
  publicAlias: string | null;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ProfileAliasType =
  "public_alias" | "former_name" | "nickname" | "username" | "gaming_name";

export interface ProfileAlias {
  id: number;
  userId: number;
  alias: string;
  aliasType: ProfileAliasType;
  createdAt: string;
}

export interface ProfilePhoneNumber {
  id: number;
  userId: number;
  phoneNumber: string;
  label: string | null;
  createdAt: string;
}

export interface ProfileAdditionalEmail {
  id: number;
  userId: number;
  email: string;
  createdAt: string;
}

export type SocialAccountStatus = "active" | "former" | "unknown";

export interface SocialAccount {
  id: number;
  userId: number;
  platform: string;
  username: string;
  profileUrl: string | null;
  accountStatus?: SocialAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProfileImageType =
  "front" | "left_profile" | "right_profile" | "angled";

export interface ProfileImage {
  id: number;
  userId: number;
  imageType: ProfileImageType;
  storagePath: string;
  originalPath?: string | null;
  analysisPath?: string | null;
  thumbnailPath?: string | null;
  contentHash?: string | null;
  mimeType?: string | null;
  byteSize?: number | null;
  uploadedAt: string;
}

export type DigitalTraceType =
  "website" | "domain" | "company" | "public_profile";

export interface DigitalTrace {
  id: number;
  userId: number;
  traceType: DigitalTraceType;
  value: string;
  createdAt: string;
}

export interface SecurityProfile {
  id: number;
  userId: number;
  monitoringEnabled: boolean;
  criticalAlerts: boolean;
  weeklySummary: boolean;
  aiRecommendations: boolean;
  securityScore: number | null;
  lastAnalysisAt: string | null;
  nextScanAt: string | null;
  consentMonitoringAt: string | null;
}

export type AnalysisReportStatus =
  "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AnalysisReport {
  id: number;
  userId: number;
  reportType: "initial" | "scheduled" | "manual";
  status: AnalysisReportStatus;
  overallScore: number | null;
  signalsCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AnalysisReportItem {
  id: number;
  reportId: number;
  itemType: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  source: string | null;
  metadataJson: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string;
  currency: string;
  featuresJson: string[] | null;
  isActive: boolean;
}

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "cancelled" | "expired";

export interface Subscription {
  id: number;
  userId: number;
  planId: number;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
}

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Payment {
  id: number;
  userId: number;
  subscriptionId: number | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface UserSettings {
  userId: number;
  theme: string;
  notificationsJson: Record<string, unknown> | null;
  locale: string;
  timezone: string;
}

export interface AuditEvent {
  id: number;
  userId: number | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
}

export type UserTokenType = "password_reset" | "email_verification" | "api_key";

export interface UserToken {
  id: number;
  userId: number;
  tokenHash: string;
  tokenType: UserTokenType;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}
