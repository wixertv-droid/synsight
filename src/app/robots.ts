import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/analysen", "/hilfe", "/blog", "/*.css", "/*.js"],
        disallow: [
          "/login",
          "/register",
          "/dashboard",
          "/profile",
          "/settings",
          "/onboarding",
          "/admin",
          "/api/",
          "/results",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/verification-",
          "/support-desk",
          "/m/",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/analysen", "/hilfe", "/blog"],
        disallow: ["/dashboard", "/profile", "/login", "/register", "/api/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: ["/dashboard", "/profile", "/login", "/register", "/api/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/"],
        disallow: ["/dashboard", "/profile", "/login", "/register", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/"],
        disallow: ["/dashboard", "/profile", "/login", "/register", "/api/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/"],
        disallow: ["/dashboard", "/profile", "/login", "/register", "/api/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
