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
const path = require("node:path");
const {
  loadEnvFile,
  mergeDeploymentEnv,
} = require("./deployment/env-file.cjs");

const fileEnv = loadEnvFile(path.join(__dirname, ".env.production"));
// .env.production MUST win over stale shell/PM2 dump values.
const merged = mergeDeploymentEnv(process.env, fileEnv);

if (!merged.DATABASE_URL) {
  console.error(
    "[ecosystem] DATABASE_URL fehlt in .env.production — Auth wird fehlschlagen."
  );
}

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
        // Prefer provider when .env.production sets it; else keep log-link fallback.
        EMAIL_DELIVERY_MODE: merged.EMAIL_DELIVERY_MODE || "log-link",
        SMTP_HOST: merged.SMTP_HOST,
        SMTP_PORT: merged.SMTP_PORT || "465",
        SMTP_SECURE: merged.SMTP_SECURE || "true",
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
