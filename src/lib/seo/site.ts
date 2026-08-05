/**
 * Canonical site configuration for SEO, schema, and social previews.
 * Single source of truth — do not invent conflicting NAP elsewhere.
 */

export const SITE = {
  name: "SynSight",
  legalName: "SynSight",
  tagline: "Digitale Identität erkennen und schützen",
  description:
    "SynSight ist eine Cybersecurity- und OSINT-Plattform zur Analyse öffentlicher Profile, Datenlecks und digitaler Spuren. KI macht Risiken verständlich und zeigt klare nächste Schritte.",
  url: process.env.APP_URL?.replace(/\/$/, "") || "https://synsight.de",
  locale: "de_DE",
  language: "de",
  alternateLanguages: ["de"] as const, // en vorbereitet
  twitterHandle: "@synsight",
  email: {
    contact: "hello@synsight.de",
    privacy: "datenschutz@synsight.de",
    press: "press@synsight.de",
    partners: "partners@synsight.de",
  },
  /** NAP-Vorbereitung für Local SEO / Unternehmensprofil */
  nap: {
    name: "SynSight",
    streetAddress: "", // vor öffentlichem Produktstart ergänzen
    addressLocality: "Deutschland",
    postalCode: "",
    addressCountry: "DE",
    telephone: "",
    email: "hello@synsight.de",
  },
  sameAs: [] as string[], // Social-Profile nach Veröffentlichung ergänzen
  foundingDate: "2025",
  areaServed: "DE",
  themeColor: "#29B6F6",
  backgroundColor: "#03050A",
} as const;

export type SiteConfig = typeof SITE;

export function absoluteUrl(path = "/"): string {
  const base = SITE.url;
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
