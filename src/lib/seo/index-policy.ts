/**
 * Indexierungsrichtlinie — welche Bereiche crawlbare Indexierung erhalten.
 */

export type IndexDecision = {
  index: boolean;
  follow: boolean;
  reason: string;
};

/** Pfad-Präfixe die niemals indexiert werden dürfen */
export const NOINDEX_PREFIXES = [
  "/login",
  "/register",
  "/dashboard",
  "/profile",
  "/settings",
  "/onboarding",
  "/admin",
  "/api",
  "/m/",
  "/results",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verification-",
  "/support-desk",
] as const;

export function shouldIndexPath(pathname: string): IndexDecision {
  const path = pathname.split("?")[0] || "/";
  for (const prefix of NOINDEX_PREFIXES) {
    if (path === prefix || path.startsWith(prefix)) {
      return {
        index: false,
        follow: false,
        reason: `Privater/app-interner Bereich (${prefix})`,
      };
    }
  }
  return {
    index: true,
    follow: true,
    reason: "Öffentliche Informations-/Landingpage",
  };
}

export const robotsPrivate = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
} as const;

export const robotsPublic = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1,
  },
} as const;
