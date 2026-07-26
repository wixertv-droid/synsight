import type { SynSightOrderType } from "@/lib/analysis/username/types";

export interface OrderPriceDefault {
  orderType: SynSightOrderType;
  label: string;
  description: string;
  credits: number;
  requiresVollmacht: boolean;
  synsightCapable: boolean;
  capabilityHint: string;
  sortOrder: number;
}

export const DEFAULT_ORDER_PRICES: readonly OrderPriceDefault[] = [
  {
    orderType: "profile_delete",
    label: "Profil-Löschung",
    description: "Löschung öffentlicher Profile bei Plattformen.",
    credits: 25,
    requiresVollmacht: true,
    synsightCapable: true,
    capabilityHint:
      "SynSight kann Löschanfragen bei unterstützten Plattformen einreichen.",
    sortOrder: 10,
  },
  {
    orderType: "google_removal",
    label: "Google-Entfernung",
    description: "Entfernung von Suchtreffern / Snippets bei Google.",
    credits: 15,
    requiresVollmacht: true,
    synsightCapable: true,
    capabilityHint:
      "Entfernung über Google-Prozesse möglich, sofern Rechtsgrundlage vorliegt.",
    sortOrder: 20,
  },
  {
    orderType: "forum_contact",
    label: "Foren-Kontakt",
    description: "Kontaktaufnahme mit Foren-/Community-Betreibern.",
    credits: 10,
    requiresVollmacht: false,
    synsightCapable: true,
    capabilityHint: "Kontaktaufnahme möglich; Löschung hängt vom Betreiber ab.",
    sortOrder: 30,
  },
  {
    orderType: "gdpr",
    label: "DSGVO-Auskunft / Löschung",
    description:
      "Formelle Datenschutzanfrage (Auskunft, Löschung, Berichtigung).",
    credits: 40,
    requiresVollmacht: true,
    synsightCapable: true,
    capabilityHint:
      "SynSight erstellt und übermittelt DSGVO-Anfragen im Auftrag.",
    sortOrder: 40,
  },
  {
    orderType: "cache_removal",
    label: "Cache- / Index-Entfernung",
    description: "Entfernung aus Caches und Suchindexen.",
    credits: 12,
    requiresVollmacht: false,
    synsightCapable: true,
    capabilityHint: "Cache-/Index-Anfragen sind in der Regel möglich.",
    sortOrder: 50,
  },
  {
    orderType: "privacy_request",
    label: "Privacy-Request",
    description: "Allgemeine Datenschutz- / Privacy-Anfrage.",
    credits: 30,
    requiresVollmacht: true,
    synsightCapable: true,
    capabilityHint:
      "Privacy-Requests können gestellt werden, Erfolg abhängig vom Empfänger.",
    sortOrder: 60,
  },
];

export const ORDER_TYPE_LABELS: Record<SynSightOrderType, string> =
  Object.fromEntries(
    DEFAULT_ORDER_PRICES.map((row) => [row.orderType, row.label])
  ) as Record<SynSightOrderType, string>;

export const MODULE_LABELS: Record<string, string> = {
  google_search: "Google Analysis",
  username_intelligence: "Username Intelligence",
  digital_leak_exposure: "Digital Exposure",
};
