/**
 * PM2 process file for SynSight — auth + MariaDB server deploy.
 *
 * Set APP_URL / DATABASE_URL / SESSION_SECRET in the process environment
 * (or `.env.production`) before start. Example:
 *
 *   export APP_URL=https://synsight.de
 *   pm2 start ecosystem.config.cjs --update-env
 */
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
        APP_URL: process.env.APP_URL || "https://synsight.de",
        ALLOW_PUBLIC_REGISTRATION: "true",
        AUTO_VERIFY_EMAIL: "true",
        EMAIL_DELIVERY_MODE: "log-link",
        // Production default is strict; same-origin Sec-Fetch-Site still passes.
        CSRF_STRICT: process.env.CSRF_STRICT || "true",
        ALLOW_DEV_AUTH: "false",
      },
    },
  ],
};
