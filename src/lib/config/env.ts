import { z } from "zod";

/** MariaDB/MySQL connection URIs are not always accepted by Zod's URL() helper. */
const optionalDatabaseUrl = z
  .string()
  .regex(/^mysql:\/\//i, "DATABASE_URL must use mysql://…")
  .optional()
  .or(z.literal("").transform(() => undefined));

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /**
     * When true (typical for staging/production deploy targets), MySQL is
     * mandatory and in-memory fallbacks are rejected at boot/health checks.
     */
    REQUIRE_DATABASE: z.enum(["true", "false"]).default("false"),
    DATABASE_URL: optionalDatabaseUrl,
    APP_URL: z.string().url().default("http://localhost:3000"),
    SESSION_SECRET: z.string().min(32).optional(),
    IMAGE_ENCRYPTION_KEY: z.string().min(32).optional(),
    ALLOW_DEV_AUTH: z.enum(["true", "false"]).default("false"),
    EMAIL_DELIVERY_MODE: z
      .enum(["log-link", "disabled", "provider"])
      .default("log-link"),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.enum(["true", "false"]).default("false"),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    SMTP_FROM: z.string().min(3).optional(),
    /** Self-serve registration. Set "false" to disable. */
    ALLOW_PUBLIC_REGISTRATION: z.enum(["true", "false"]).optional(),
    /**
     * When true, new registrations are activated immediately (no email wait).
     * Intended for database / auth integration testing.
     */
    AUTO_VERIFY_EMAIL: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((env, ctx) => {
    // Production requires MySQL unless explicitly opted out (e2e/local prod.mode).
    const requireDatabase =
      env.REQUIRE_DATABASE === "true" ||
      (env.NODE_ENV === "production" &&
        process.env.REQUIRE_DATABASE !== "false");

    if (requireDatabase && !env.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when REQUIRE_DATABASE/production.",
      });
    }

    if (env.NODE_ENV === "production" && !env.SESSION_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET is required in production.",
      });
    }

    if (env.NODE_ENV === "production" && env.ALLOW_DEV_AUTH === "true") {
      ctx.addIssue({
        code: "custom",
        path: ["ALLOW_DEV_AUTH"],
        message: "Development authentication cannot run in production.",
      });
    }

    // SMTP credentials are validated at send time in `src/lib/email/smtp.ts`.
    // Do not fail getEnvironment() here — that aborts registration after the
    // user row was already inserted.
  });

export type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | null = null;

function parseEnv() {
  return environmentSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE_DATABASE: process.env.REQUIRE_DATABASE,
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: process.env.APP_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    IMAGE_ENCRYPTION_KEY: process.env.IMAGE_ENCRYPTION_KEY,
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH,
    EMAIL_DELIVERY_MODE: process.env.EMAIL_DELIVERY_MODE,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    ALLOW_PUBLIC_REGISTRATION: process.env.ALLOW_PUBLIC_REGISTRATION,
    AUTO_VERIFY_EMAIL: process.env.AUTO_VERIFY_EMAIL,
  });
}

export function getEnvironment(): Environment {
  if (cachedEnvironment) return cachedEnvironment;

  const result = parseEnv();
  if (!result.success) {
    throw new Error(
      `Invalid server environment: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }

  cachedEnvironment = result.data;
  return cachedEnvironment;
}

/** Test helper — clears cached env between Vitest cases. */
export function resetEnvironmentCache(): void {
  cachedEnvironment = null;
}

export function validateEnvironment(): {
  valid: boolean;
  issues: string[];
} {
  const result = parseEnv();
  return {
    valid: result.success,
    issues: result.success
      ? []
      : result.error.issues.map((issue) => issue.path.join(".")),
  };
}

export function isDatabaseRequired(): boolean {
  if (process.env.REQUIRE_DATABASE === "true") return true;
  if (process.env.REQUIRE_DATABASE === "false") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Public self-registration — open unless explicitly disabled.
 * Set ALLOW_PUBLIC_REGISTRATION=false to lock registration again.
 */
export function isPublicRegistrationAllowed(): boolean {
  return process.env.ALLOW_PUBLIC_REGISTRATION !== "false";
}

/** Activate accounts immediately after register (skip inbox wait). */
export function isAutoVerifyEmailEnabled(): boolean {
  return process.env.AUTO_VERIFY_EMAIL === "true";
}
