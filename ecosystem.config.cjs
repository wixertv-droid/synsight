/**
 * PM2 process file for SynSight — auth + MariaDB server deploy.
 *
 * Loads `/opt/synsight/.env.production` into the process env so DATABASE_URL,
 * SESSION_SECRET and SMTP_* are always available. Do NOT rely on PM2
 * `env_file` — many PM2 versions ignore it.
 *
 *   cd /opt/synsight
 *   pm2 delete synsight 2>/dev/null || true
 *   pm2 start ecosystem.config.cjs --update-env
 *   pm2 save
 */
const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const fileEnv = loadEnvFile(path.join(__dirname, ".env.production"));
const merged = { ...fileEnv, ...process.env };

module.exports = {
  apps: [
    {
      name: "synsight",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        REQUIRE_DATABASE: "true",
        DATABASE_URL: merged.DATABASE_URL,
        SESSION_SECRET: merged.SESSION_SECRET,
        IMAGE_ENCRYPTION_KEY: merged.IMAGE_ENCRYPTION_KEY,
        APP_URL: merged.APP_URL || "https://synsight.de",
        PRIVATE_STORAGE_ROOT: merged.PRIVATE_STORAGE_ROOT,
        ALLOW_PUBLIC_REGISTRATION: merged.ALLOW_PUBLIC_REGISTRATION || "true",
        AUTO_VERIFY_EMAIL: merged.AUTO_VERIFY_EMAIL || "false",
        EMAIL_DELIVERY_MODE: merged.EMAIL_DELIVERY_MODE || "provider",
        SMTP_HOST: merged.SMTP_HOST,
        SMTP_PORT: merged.SMTP_PORT || "587",
        SMTP_SECURE: merged.SMTP_SECURE || "false",
        SMTP_USER: merged.SMTP_USER,
        SMTP_PASS: merged.SMTP_PASS,
        SMTP_FROM: merged.SMTP_FROM,
        CSRF_STRICT: merged.CSRF_STRICT || "true",
        COOKIE_SECURE: merged.COOKIE_SECURE || "true",
        ALLOW_DEV_AUTH: "false",
      },
    },
  ],
};
