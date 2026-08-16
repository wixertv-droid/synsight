import { eq } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import { apiCredentials } from "@/lib/database/schema";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-vault";
import {
  sanitizeSmtpError,
  sendSmtpMail,
  verifySmtpConnection,
  type SmtpRuntimeConfig,
} from "@/lib/email/smtp";

export const MAIL_ACCOUNT_KEYS = [
  "contact",
  "support",
  "press",
  "partner",
  "privacy",
  "newsletter",
  "system",
] as const;

export type MailAccountKey = (typeof MAIL_ACCOUNT_KEYS)[number];

const PROVIDERS: Record<MailAccountKey, string> = {
  contact: "smtp_contact",
  support: "smtp_support",
  press: "smtp_press",
  partner: "smtp_partner",
  privacy: "smtp_privacy",
  newsletter: "smtp_newsletter",
  system: "smtp_system",
};

export const MAIL_ACCOUNT_LABELS: Record<MailAccountKey, string> = {
  contact: "Kontakt",
  support: "Support",
  press: "Presse",
  partner: "Partnerschaften",
  privacy: "Datenschutz",
  newsletter: "Newsletter",
  system: "System / Noreply",
};

interface StoredConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
}

export interface MailAccountPublic {
  key: MailAccountKey;
  label: string;
  enabled: boolean;
  configured: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  passwordConfigured: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface MailSettingsPublic {
  server: {
    host: string;
    port: number;
    secure: boolean;
  };
  accounts: Record<MailAccountKey, MailAccountPublic>;
}

export interface MailAccountRuntime {
  enabled: boolean;
  config: SmtpRuntimeConfig | null;
  error?: string;
}

function assertAdmin(actor: AuthenticatedUser) {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function provider(key: MailAccountKey) {
  return PROVIDERS[key];
}

async function rowFor(key: MailAccountKey) {
  const db = getDatabase();
  if (!db) return null;

  const rows = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.provider, provider(key)))
    .limit(1);

  return rows[0] ?? null;
}

function parseConfig(value: unknown): StoredConfig | null {
  let raw = value;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  return {
    host: typeof obj.host === "string" ? obj.host.trim() : "",
    port:
      typeof obj.port === "number" && Number.isFinite(obj.port)
        ? Math.round(obj.port)
        : 465,
    secure: obj.secure === true,
    username: typeof obj.username === "string" ? obj.username.trim() : "",
    fromName:
      typeof obj.fromName === "string" && obj.fromName.trim()
        ? obj.fromName.trim()
        : "SynSight",
    fromEmail: typeof obj.fromEmail === "string" ? obj.fromEmail.trim() : "",
  };
}

function defaultConfig(): StoredConfig {
  return {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number.parseInt(process.env.SMTP_PORT ?? "465", 10) || 465,
    secure: process.env.SMTP_SECURE !== "false",
    username: "",
    fromName: "SynSight",
    fromEmail: "",
  };
}

function decryptPassword(value: string): string {
  return decryptSecret(value).trim();
}

function runtimeConfig(
  config: StoredConfig,
  password: string
): SmtpRuntimeConfig {
  if (!config.host || !config.username || !config.fromEmail || !password) {
    throw new Error("SMTP_CONFIG_INCOMPLETE");
  }

  return {
    SMTP_HOST: config.host,
    SMTP_PORT: config.port,
    SMTP_SECURE: config.secure ? "true" : "false",
    SMTP_USER: config.username,
    SMTP_PASS: password,
    SMTP_FROM: config.fromName
      ? `${config.fromName} <${config.fromEmail}>`
      : config.fromEmail,
  };
}

function mysqlNow() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

async function markSuccess(key: MailAccountKey) {
  const db = getDatabase();
  if (!db) return;

  await db
    .update(apiCredentials)
    .set({
      lastSuccessAt: mysqlNow(),
      lastErrorAt: null,
      lastErrorMessage: null,
    })
    .where(eq(apiCredentials.provider, provider(key)));
}

async function markError(key: MailAccountKey, message: string) {
  const db = getDatabase();
  if (!db) return;

  await db
    .update(apiCredentials)
    .set({
      lastErrorAt: mysqlNow(),
      lastErrorMessage: message.slice(0, 1000),
    })
    .where(eq(apiCredentials.provider, provider(key)));
}

export async function getMailSettings(
  actor: AuthenticatedUser
): Promise<MailSettingsPublic> {
  assertAdmin(actor);

  const rows = await Promise.all(
    MAIL_ACCOUNT_KEYS.map(async (key) => ({
      key,
      row: await rowFor(key),
    }))
  );

  let shared = defaultConfig();

  for (const item of rows) {
    const parsed = item.row ? parseConfig(item.row.configJson) : null;

    if (parsed?.host) {
      shared = parsed;
      break;
    }
  }

  const accounts = {} as Record<MailAccountKey, MailAccountPublic>;

  for (const { key, row } of rows) {
    const config = row ? (parseConfig(row.configJson) ?? shared) : shared;

    let passwordConfigured = false;

    if (row) {
      try {
        passwordConfigured = decryptPassword(row.encryptedSecret).length > 0;
      } catch {
        passwordConfigured = false;
      }
    }

    accounts[key] = {
      key,
      label: MAIL_ACCOUNT_LABELS[key],
      enabled: Boolean(row?.isActive),
      configured: Boolean(
        config.host && config.username && config.fromEmail && passwordConfigured
      ),
      username: config.username,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      passwordConfigured,
      lastSuccessAt: row?.lastSuccessAt ?? null,
      lastErrorAt: row?.lastErrorAt ?? null,
      lastErrorMessage: row?.lastErrorMessage ?? null,
    };
  }

  return {
    server: {
      host: shared.host,
      port: shared.port,
      secure: shared.secure,
    },
    accounts,
  };
}

export async function saveMailSettings(
  actor: AuthenticatedUser,
  input: {
    server: {
      host: string;
      port: number;
      secure: boolean;
    };
    accounts: Record<
      MailAccountKey,
      {
        enabled: boolean;
        username: string;
        password?: string;
        fromName: string;
        fromEmail: string;
      }
    >;
  }
): Promise<MailSettingsPublic> {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  for (const key of MAIL_ACCOUNT_KEYS) {
    const account = input.accounts[key];
    const current = await rowFor(key);

    let password = account.password?.trim() ?? "";

    if (!password && current) {
      try {
        password = decryptPassword(current.encryptedSecret);
      } catch {
        password = "";
      }
    }

    if (account.enabled && !password) {
      throw new Error(`SMTP_PASSWORD_REQUIRED:${key}`);
    }

    const config: StoredConfig = {
      host: input.server.host.trim(),
      port: input.server.port,
      secure: input.server.secure,
      username: account.username.trim(),
      fromName:
        account.fromName.trim() || `SynSight ${MAIL_ACCOUNT_LABELS[key]}`,
      fromEmail: account.fromEmail.trim().toLowerCase(),
    };

    if (account.enabled) {
      runtimeConfig(config, password);
    }

    await db
      .insert(apiCredentials)
      .values({
        provider: provider(key),
        label: `SMTP ${MAIL_ACCOUNT_LABELS[key]}`,
        encryptedSecret: encryptSecret(password),
        configJson: config,
        isActive: account.enabled,
        updatedByAdminId: Number(actor.id),
      })
      .onDuplicateKeyUpdate({
        set: {
          label: `SMTP ${MAIL_ACCOUNT_LABELS[key]}`,
          encryptedSecret: encryptSecret(password),
          configJson: config,
          isActive: account.enabled,
          updatedByAdminId: Number(actor.id),
        },
      });
  }

  return getMailSettings(actor);
}

export async function resolveMailAccountRuntime(
  key: MailAccountKey,
  options?: { allowDisabled?: boolean }
): Promise<MailAccountRuntime> {
  const row = await rowFor(key);

  if (!row) {
    return {
      enabled: false,
      config: null,
      error: "SMTP_ACCOUNT_NOT_CONFIGURED",
    };
  }

  if (!row.isActive && !options?.allowDisabled) {
    return {
      enabled: false,
      config: null,
    };
  }

  try {
    const config = parseConfig(row.configJson);
    if (!config) throw new Error("SMTP_CONFIG_INCOMPLETE");

    const password = decryptPassword(row.encryptedSecret);

    return {
      enabled: Boolean(row.isActive),
      config: runtimeConfig(config, password),
    };
  } catch (error) {
    return {
      enabled: Boolean(row.isActive),
      config: null,
      error:
        error instanceof Error
          ? error.message
          : "SMTP-Konfiguration nicht lesbar.",
    };
  }
}

export async function testMailAccount(
  actor: AuthenticatedUser,
  key: MailAccountKey
) {
  assertAdmin(actor);

  try {
    const runtime = await resolveMailAccountRuntime(key, {
      allowDisabled: true,
    });

    if (!runtime.config) {
      throw new Error(runtime.error ?? "SMTP_CONFIG_INCOMPLETE");
    }

    const result = await verifySmtpConnection(runtime.config);

    if (!result.ok) {
      const message = result.error ?? "SMTP-Verbindung fehlgeschlagen.";
      await markError(key, message);
      return { ok: false, message };
    }

    await markSuccess(key);

    return {
      ok: true,
      message: `${MAIL_ACCOUNT_LABELS[key]}: SMTP-Verbindung erfolgreich.`,
      via: result.via,
    };
  } catch (error) {
    const message = sanitizeSmtpError(error);
    await markError(key, message);

    return { ok: false, message };
  }
}

export async function sendMailAccountTest(
  actor: AuthenticatedUser,
  key: MailAccountKey,
  to: string
) {
  assertAdmin(actor);

  try {
    const runtime = await resolveMailAccountRuntime(key, {
      allowDisabled: true,
    });

    if (!runtime.config) {
      throw new Error(runtime.error ?? "SMTP_CONFIG_INCOMPLETE");
    }

    const result = await sendSmtpMail(runtime.config, {
      from: runtime.config.SMTP_FROM ?? runtime.config.SMTP_USER ?? "SynSight",
      to,
      subject: `SynSight SMTP-Test · ${MAIL_ACCOUNT_LABELS[key]}`,
      text:
        `SMTP-Test erfolgreich.\n\n` +
        `Konto: ${MAIL_ACCOUNT_LABELS[key]}\n` +
        `Benutzer: ${runtime.config.SMTP_USER}`,
      html:
        `<p><strong>SynSight SMTP-Test erfolgreich.</strong></p>` +
        `<p>Konto: ${MAIL_ACCOUNT_LABELS[key]}</p>`,
    });

    await markSuccess(key);

    return {
      ok: true,
      message: `${MAIL_ACCOUNT_LABELS[key]}: Testmail erfolgreich versendet.`,
      messageId: result.messageId,
    };
  } catch (error) {
    const message = sanitizeSmtpError(error);
    await markError(key, message);

    return { ok: false, message };
  }
}
