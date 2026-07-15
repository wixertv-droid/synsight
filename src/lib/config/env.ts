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
    DATABASE_URL: optionalUrl,
    APP_URL: z.string().url().default("http://localhost:3000"),
    SESSION_SECRET: z.string().min(32).optional(),
    ALLOW_DEV_AUTH: z.enum(["true", "false"]).default("false"),
    EMAIL_DELIVERY_MODE: z
      .enum(["log-link", "disabled", "provider"])
      .default("disabled"),
  })
  .superRefine((env, ctx) => {
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

export function getEnvironment(): Environment {
  if (cachedEnvironment) return cachedEnvironment;

  const result = environmentSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: process.env.APP_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH,
    EMAIL_DELIVERY_MODE: process.env.EMAIL_DELIVERY_MODE,
  });

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

export function validateEnvironment(): {
  valid: boolean;
  issues: string[];
} {
  const result = environmentSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: process.env.APP_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH,
    EMAIL_DELIVERY_MODE: process.env.EMAIL_DELIVERY_MODE,
  });
  return {
    valid: result.success,
    issues: result.success
      ? []
      : result.error.issues.map((issue) => issue.path.join(".")),
  };
}
