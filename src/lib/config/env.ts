import { z } from "zod";

const optionalUrl = z
  .string()
  .url()
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
    DATABASE_URL: optionalUrl,
    APP_URL: z.string().url().default("http://localhost:3000"),
    SESSION_SECRET: z.string().min(32).optional(),
    IMAGE_ENCRYPTION_KEY: z.string().min(32).optional(),
    ALLOW_DEV_AUTH: z.enum(["true", "false"]).default("false"),
    EMAIL_DELIVERY_MODE: z
      .enum(["log-link", "disabled", "provider"])
      .default("disabled"),
    /** Self-serve registration. Forced off in production unless explicitly enabled. */
    ALLOW_PUBLIC_REGISTRATION: z.enum(["true", "false"]).optional(),
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
    ALLOW_PUBLIC_REGISTRATION: process.env.ALLOW_PUBLIC_REGISTRATION,
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
 * Public self-registration:
 * - development/test: allowed by default
 * - production: disabled unless ALLOW_PUBLIC_REGISTRATION=true AND email can be delivered
 */
export function isPublicRegistrationAllowed(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") {
    return process.env.ALLOW_PUBLIC_REGISTRATION !== "false";
  }

  if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    return false;
  }

  const mode = process.env.EMAIL_DELIVERY_MODE ?? "disabled";
  if (mode === "disabled") return false;
  if (mode === "provider" && !process.env.EMAIL_PROVIDER_API_KEY) return false;
  return true;
}
