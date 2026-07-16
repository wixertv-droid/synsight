/**
 * PM2 process file for SynSight on Debian.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart synsight --update-env
 *
 * Set APP_URL to your HTTPS domain before `npm run build`.
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
        // Public registration enabled for testing (verification links → PM2 logs)
        ALLOW_PUBLIC_REGISTRATION: "true",
        EMAIL_DELIVERY_MODE: "log-link",
      },
    },
  ],
};
