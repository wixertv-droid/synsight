/**
 * PM2 process file for SynSight on Debian.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart synsight
 *
 * Important: set APP_URL to the exact public origin users type in the browser
 * BEFORE `npm run build`. HTTP origins must stay http:// until TLS is live.
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
      },
    },
  ],
};
