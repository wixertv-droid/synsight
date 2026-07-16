import type { NextConfig } from "next";
import {
  BASE_SECURITY_HEADERS,
  buildContentSecurityPolicy,
} from "./src/lib/security/csp";

/**
 * CSP here is always HTTP-safe (no protocol upgrades).
 * HSTS / HTTPS upgrades are applied at runtime in middleware only when the
 * request itself is HTTPS — so http://IP:3000 never breaks.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["argon2", "sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(false),
          },
          ...BASE_SECURITY_HEADERS,
        ],
      },
    ];
  },
};

export default nextConfig;
