import type { AnalysisKey } from "@/lib/credits/pricing";

/**
 * Client-safe maps: public SEO/tool slugs & demo fields → admin analysis keys.
 * Keep server helpers in `active-modules.ts` so client bundles stay free of DB code.
 */

export const TOOL_SLUG_TO_ANALYSIS_KEYS: Record<string, AnalysisKey[]> = {
  "google-analyse": ["google_search"],
  "username-suche": ["username_intelligence", "alias_analysis"],
  "digital-footprint": [
    "full_identity_analysis",
    "deep_intelligence",
    "google_search",
  ],
  "reverse-image-search": [
    "public_image_exposure_scan",
    "reverse_image_discovery",
    "reverse_image_search",
  ],
  "email-check": ["digital_leak_exposure", "email_analysis"],
  "telefon-check": ["digital_leak_exposure", "phone_analysis"],
  "social-media-analyse": ["social_media"],
  "osint-analyse": [
    "deep_intelligence",
    "full_identity_analysis",
    "google_search",
  ],
  personensuche: ["person_search", "full_identity_analysis"],
  "datenleck-pruefen": ["digital_leak_exposure"],
};

export type DemoFieldKey = "email" | "username" | "phone";

/** DemoScanner input fields → admin modules that unlock them */
export const DEMO_FIELD_TO_ANALYSIS_KEYS: Record<DemoFieldKey, AnalysisKey[]> =
  {
    email: ["digital_leak_exposure", "email_analysis"],
    username: ["username_intelligence", "alias_analysis"],
    phone: ["digital_leak_exposure", "phone_analysis"],
  };

export function isToolVisibleForKeys(
  slug: string,
  activeKeys: Set<string>
): boolean {
  const required = TOOL_SLUG_TO_ANALYSIS_KEYS[slug];
  if (!required || required.length === 0) return false;
  return required.some((key) => activeKeys.has(key));
}

export function filterDemoFieldsByActiveKeys(
  activeKeys: Set<string>
): DemoFieldKey[] {
  return (Object.keys(DEMO_FIELD_TO_ANALYSIS_KEYS) as DemoFieldKey[]).filter(
    (field) =>
      DEMO_FIELD_TO_ANALYSIS_KEYS[field].some((key) => activeKeys.has(key))
  );
}
