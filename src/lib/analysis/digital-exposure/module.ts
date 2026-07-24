import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

export const digitalLeakExposureModule: IntelligenceModuleDefinition = {
  key: "digital_leak_exposure",
  title: "Digital Leak & Exposure Scan",
  estimatedDurationLabel: "ca. 15–45 Sekunden",
  minScanMs: 8000,
  maxScanMs: 12000,
  scanSteps: [
    {
      id: "prep",
      label: "Identifikatoren werden geladen",
      terminal: "EXPOSURE · load emails + phones from identity",
      atMs: 0,
    },
    {
      id: "dehashed",
      label: "DeHashed.com Abfrage",
      terminal: "DEHASHED · search email+phone · metadata only",
      atMs: 1600,
    },
    {
      id: "phone",
      label: "Telefon-Exposure Prüfung",
      terminal: "PHONE · dehashed phone query · no invention",
      atMs: 3600,
    },
    {
      id: "score",
      label: "Exposure Risk Score",
      terminal: "SCORE · breach + password_exposure weights",
      atMs: 5200,
    },
    {
      id: "report",
      label: "Cybersecurity Report wird erstellt",
      terminal: "REPORT · metadata only · no passwords stored",
      atMs: 7000,
    },
  ],
};
