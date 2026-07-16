import type { NextConfig } from "next";

/**
 * HTTPS-only headers must NOT key off NODE_ENV alone.
 * `next build` always runs with NODE_ENV=production; baking
 * `upgrade-insecure-requests` into every production artifact breaks HTTP
 * hostnames (VPS IP / domain without TLS) — CSS, fonts and JS fail with
 * SSL errors and the UI renders as an unstyled document.
 */
function isHttpsEnforced(): boolean {
  if (process.env.FORCE_HTTPS === "true") return true;
  if (process.env.FORCE_HTTPS === "false") return false;
  const appUrl = process.env.APP_URL?.trim() ?? "";
  return appUrl.startsWith("https://");
}

const enforceHttps = isHttpsEnforced();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self'",
  ...(enforceHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders: { key: string; value: string }[] = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

if (enforceHttps) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["argon2", "sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
