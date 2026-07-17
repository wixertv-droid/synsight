/**
 * Ops helper: verify SMTP connectivity and send a test message.
 *
 * Loads `.env.production` (same as PM2 ecosystem) so you can run:
 *
 *   npm run email:test -- you@example.com
 *
 * from /opt/synsight without exporting SMTP_* manually.
 */
import path from "node:path";
import { createRequire } from "node:module";
import { getEnvironment, resetEnvironmentCache } from "../src/lib/config/env";
import {
  sanitizeSmtpError,
  sendSmtpMail,
  verifySmtpConnection,
} from "../src/lib/email/smtp";

const require = createRequire(__filename);
const { loadEnvFile, mergeDeploymentEnv } =
  require("../deployment/env-file.cjs") as {
    loadEnvFile: (filePath: string) => Record<string, string>;
    mergeDeploymentEnv: (
      processEnv: NodeJS.ProcessEnv,
      fileEnv: Record<string, string>
    ) => Record<string, string | undefined>;
  };

function loadSmtpEnvFromFiles(): void {
  const root = path.join(__dirname, "..");
  const candidates = [
    path.join(root, ".env.production"),
    path.join(root, ".env.local"),
    path.join(root, ".env"),
  ];

  let merged = { ...process.env } as NodeJS.ProcessEnv;
  const loaded: string[] = [];

  for (const filePath of candidates) {
    const fileEnv = loadEnvFile(filePath);
    if (Object.keys(fileEnv).length === 0) continue;
    merged = mergeDeploymentEnv(merged, fileEnv) as NodeJS.ProcessEnv;
    loaded.push(path.basename(filePath));
  }

  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) process.env[key] = value;
  }

  if (loaded.length > 0) {
    console.info(`[email:test] loaded env from: ${loaded.join(", ")}`);
  } else {
    console.warn(
      "[email:test] no .env.production/.env.local found — using process env only"
    );
  }
}

function missingSmtpKeys(): string[] {
  const required = [
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ] as const;
  return required.filter((key) => !process.env[key]?.trim());
}

async function main() {
  loadSmtpEnvFromFiles();
  resetEnvironmentCache();

  const missing = missingSmtpKeys();
  if (missing.length > 0) {
    console.error(
      `[email:test] SMTP configuration is incomplete. Missing: ${missing.join(", ")}`
    );
    console.error(
      "Tragen Sie die Werte in /opt/synsight/.env.production ein und erneut ausführen."
    );
    process.exit(1);
  }

  const env = getEnvironment();
  const to = process.argv[2] || env.SMTP_USER;

  if (!to) {
    console.error("Usage: npm run email:test -- recipient@example.com");
    process.exit(1);
  }

  console.info("[email:test] verifying SMTP…", {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    from: env.SMTP_FROM,
  });

  const verified = await verifySmtpConnection(env);
  if (!verified.ok) {
    console.error("[email:test] verify failed:", verified.error);
    process.exit(2);
  }
  console.info("[email:test] verify ok via", verified.via);

  const result = await sendSmtpMail(env, {
    from: env.SMTP_FROM as string,
    to,
    subject: "SynSight SMTP Test",
    text: "Dies ist eine SynSight SMTP-Testnachricht. Der Versand funktioniert.",
    html: "<p>Dies ist eine <strong>SynSight</strong> SMTP-Testnachricht. Der Versand funktioniert.</p>",
  });

  console.info("[email:test] sent", {
    to,
    messageId: result.messageId,
    via: result.via,
  });
}

main().catch((error) => {
  console.error("[email:test] failed:", sanitizeSmtpError(error));
  process.exit(1);
});
