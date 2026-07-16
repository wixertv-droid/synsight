/**
 * PM2 process file for SynSight — open for database / auth testing.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart synsight --update-env
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
        ALLOW_PUBLIC_REGISTRATION: "true",
        AUTO_VERIFY_EMAIL: "true",
        EMAIL_DELIVERY_MODE: "log-link",
        CSRF_STRICT: "false",
        ALLOW_DEV_AUTH: "false",
      },
    },
  ],
};
