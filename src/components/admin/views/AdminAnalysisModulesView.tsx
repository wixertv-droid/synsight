"use client";

import { useCallback, useEffect, useState } from "react";

import type { UsernameModuleSettings } from "@/lib/analysis/username/types";
import type { ReverseImageModuleSettings } from "@/lib/analysis/reverse-image/settings-types";
import { DIGITAL_LEAK_RETENTION_PRESETS } from "@/lib/analysis/retention";
import type { PlatformSettings } from "@/lib/services/admin-platform-service";

export type AdminAnalysisPanel =
  "overview" | "username" | "digital-leak" | "reverse-image";

interface AnalysisRow {
  id: number;
  analysisKey: string;
  label: string;
  credits: number;
  isActive: boolean;
  sortOrder: number;
}

const emptyUsername: UsernameModuleSettings = {
  isActive: true,
  apiEnabled: true,
  maxQueries: 8,
  countries: "de",
  language: "de",
  resultLimit: 40,
  confidenceMin: 60,
  synCredits: 10,
  serpapiCostEur: 0.023,
  geminiCostEur: 0.002,
  markupPercent: 100,
  minProfitEur: 0.05,
  creditValueEur: 0.01,
};

const emptyReverseImage: ReverseImageModuleSettings = {
  isActive: true,
  publicScanActive: true,
  faceVerificationActive: true,
  apiEnabled: true,
  maxPagesPerQuery: 2,
  maxImagesPerQuery: 100,
  identityScoreThreshold: 45,
  domainRelevanceMin: 35,
  aiRelevanceFilter: true,
  minConfidence: 55,
  compareUrl: "http://161.97.85.22:8000/compare",
  similarityThreshold: 0.35,
  compareTimeoutMs: 12000,
};

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-medium tracking-[-.02em] text-white/88">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  recommendation,
  children,
}: {
  label: string;
  hint?: string;
  recommendation?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <span className="font-mono text-[8px] uppercase tracking-[.12em] text-white/32">
        {label}
      </span>

      {hint ? (
        <p className="mt-2 text-[11px] leading-relaxed text-white/38">{hint}</p>
      ) : null}

      {recommendation ? (
        <p className="mt-2 rounded-lg border border-cyber-cyan/10 bg-cyber-cyan/[0.025] px-3 py-2 text-[10px] leading-relaxed text-cyber-cyan/55">
          Empfehlung: {recommendation}
        </p>
      ) : null}

      <div className="mt-3">{children}</div>
    </label>
  );
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.012] p-4 md:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white/75">{title}</h3>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-white/30">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#070d16] px-3 py-2.5 text-sm text-white/80 outline-none focus:border-cyber-cyan/35";

const MODULE_INFO: Record<
  string,
  {
    group: "identity" | "leaks" | "images" | "other";
    description: string;
    details?: string;
    settingsHref?: string;
  }
> = {
  username_intelligence: {
    group: "identity",
    description:
      "Sucht nach öffentlich sichtbaren Profilen, Accounts und Erwähnungen eines Benutzernamens.",
    details:
      "Hilft zu erkennen, auf welchen Plattformen ein Benutzername öffentlich mit der digitalen Identität verbunden werden kann.",
    settingsHref: "/admin/analysen/username",
  },

  google_search: {
    group: "identity",
    description:
      "Analysiert öffentlich indexierte Webseiten und Suchmaschinentreffer zur digitalen Identität.",
    details:
      "Findet öffentlich sichtbare Informationen, Erwähnungen und Quellen im offenen Web.",
  },

  digital_leak_exposure: {
    group: "leaks",
    description:
      "Prüft E-Mail-Adressen und Telefonnummern gemeinsam auf bekannte Datenleaks und kompromittierte Datensätze.",
    details:
      "Dieses Modul ersetzt die früher getrennten Telefon- und E-Mail-Analysen.",
    settingsHref: "/admin/analysen/digital-leak",
  },

  public_image_exposure_scan: {
    group: "images",
    description:
      "Sucht im öffentlich indexierten Web nach Bildern, die zur untersuchten Identität passen könnten.",
    details:
      "Die Suche bewertet Fundstelle, Kontext, Domain und weitere Identitätsmerkmale.",
    settingsHref: "/admin/analysen/reverse-image",
  },

  face_identity_verification: {
    group: "images",
    description:
      "Vergleicht gefundene Bilder mit den hinterlegten Referenzbildern der Person.",
    details:
      "Face Identity reduziert Fehlzuordnungen und bestätigt, ob ein gefundener Bildtreffer wahrscheinlich dieselbe Person zeigt.",
    settingsHref: "/admin/analysen/reverse-image",
  },
};

const MODULE_GROUPS = [
  {
    id: "identity",
    title: "Digitale Identität & Web",
    description:
      "Analysen für Benutzernamen, öffentliche Profile und frei zugängliche Web-Fundstellen.",
  },
  {
    id: "leaks",
    title: "Leaks & Kontaktdaten",
    description:
      "Analysen für kompromittierte E-Mail-Adressen, Telefonnummern und bekannte Datenlecks.",
  },
  {
    id: "images",
    title: "Bilder & Identität",
    description:
      "Öffentliche Bildersuche und biometrischer Vergleich mit Referenzbildern.",
  },
  {
    id: "other",
    title: "Weitere Analysen",
    description:
      "Weitere Analysefunktionen, die keiner speziellen Kategorie zugeordnet sind.",
  },
] as const;

export default function AdminAnalysisModulesView({
  panel = "overview",
}: {
  panel?: AdminAnalysisPanel;
}) {
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [moduleBusy, setModuleBusy] = useState<number | null>(null);
  const [moduleMsg, setModuleMsg] = useState<string | null>(null);

  const [username, setUsername] =
    useState<UsernameModuleSettings>(emptyUsername);
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);

  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [retentionBusy, setRetentionBusy] = useState(false);
  const [retentionMsg, setRetentionMsg] = useState<string | null>(null);

  const [reverseImage, setReverseImage] =
    useState<ReverseImageModuleSettings>(emptyReverseImage);
  const [reverseBusy, setReverseBusy] = useState(false);
  const [reverseMsg, setReverseMsg] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    const response = await fetch("/api/admin/pricing");
    const body = await response.json().catch(() => null);

    if (response.ok && body?.success) {
      setRows(body.data.analyses);
    }
  }, []);

  const loadUsername = useCallback(async () => {
    const response = await fetch("/api/admin/username-module");
    const body = await response.json().catch(() => null);

    if (response.ok && body?.success) {
      setUsername(body.data.settings);
    }
  }, []);

  const loadPlatform = useCallback(async () => {
    const response = await fetch("/api/admin/platform-settings");
    const body = await response.json().catch(() => null);

    if (response.ok && body?.success) {
      setPlatform(body.data.settings);
    }
  }, []);

  const loadReverseImage = useCallback(async () => {
    const response = await fetch("/api/admin/reverse-image-module");
    const body = await response.json().catch(() => null);

    if (response.ok && body?.success) {
      setReverseImage(body.data.settings);
    }
  }, []);

  useEffect(() => {
    if (panel === "overview") void loadModules();
    if (panel === "username") void loadUsername();
    if (panel === "digital-leak") void loadPlatform();
    if (panel === "reverse-image") void loadReverseImage();
  }, [panel, loadModules, loadUsername, loadPlatform, loadReverseImage]);

  async function toggleModule(row: AnalysisRow) {
    setModuleBusy(row.id);
    setModuleMsg(null);

    const nextActive = !row.isActive;

    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert",
          analysisKey: row.analysisKey,
          label: row.label,
          description: null,
          credits: row.credits,
          isActive: nextActive,
          sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : 100,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setModuleMsg(
          body?.error?.message ??
            `Modul „${row.label}“ konnte nicht gespeichert werden.`
        );
        return;
      }

      // Runtime-Synchronisierung übernimmt zentral der Pricing-Service.
      await loadModules();

      setModuleMsg(
        `„${row.label}“ ist jetzt ${nextActive ? "aktiv" : "inaktiv"}.`
      );
    } catch {
      setModuleMsg(`Modul „${row.label}“ konnte nicht gespeichert werden.`);
    } finally {
      setModuleBusy(null);
    }
  }

  async function saveUsername() {
    setUsernameBusy(true);
    setUsernameMsg(null);

    try {
      const response = await fetch("/api/admin/username-module", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiEnabled: username.apiEnabled,
          maxQueries: username.maxQueries,
          countries: username.countries,
          language: username.language,
          resultLimit: username.resultLimit,
          confidenceMin: username.confidenceMin,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setUsernameMsg(
          body?.error?.message ??
            "Einstellungen konnten nicht gespeichert werden."
        );
        return;
      }

      setUsername(body.data.settings);
      setUsernameMsg("Einstellungen gespeichert.");
    } finally {
      setUsernameBusy(false);
    }
  }

  async function saveRetention(days: number) {
    if (!platform) return;

    setRetentionBusy(true);
    setRetentionMsg(null);

    try {
      const response = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageMaxUploadMb: platform.imageMaxUploadMb,
          imageCompressionQuality: platform.imageCompressionQuality,
          imageWebpQuality: platform.imageWebpQuality,
          imageThumbnailQuality: platform.imageThumbnailQuality,
          imageMaxResolution: platform.imageMaxResolution,
          encryptOriginals: platform.encryptOriginals,
          generateAnalysisImages: platform.generateAnalysisImages,
          digitalLeakDefaultRetentionDays: days,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setRetentionMsg(
          body?.error?.message ??
            "Aufbewahrungsdauer konnte nicht gespeichert werden."
        );
        return;
      }

      setPlatform(body.data.settings);
      setRetentionMsg("Aufbewahrungsdauer gespeichert.");
    } finally {
      setRetentionBusy(false);
    }
  }

  async function saveReverseImage() {
    setReverseBusy(true);
    setReverseMsg(null);

    try {
      const response = await fetch("/api/admin/reverse-image-module", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiEnabled: reverseImage.apiEnabled,
          maxPagesPerQuery: reverseImage.maxPagesPerQuery,
          maxImagesPerQuery: reverseImage.maxImagesPerQuery,
          identityScoreThreshold: reverseImage.identityScoreThreshold,
          domainRelevanceMin: reverseImage.domainRelevanceMin,
          aiRelevanceFilter: reverseImage.aiRelevanceFilter,
          minConfidence: reverseImage.minConfidence,
          compareUrl: reverseImage.compareUrl,
          similarityThreshold: reverseImage.similarityThreshold,
          compareTimeoutMs: reverseImage.compareTimeoutMs,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setReverseMsg(
          body?.error?.message ??
            "Einstellungen konnten nicht gespeichert werden."
        );
        return;
      }

      setReverseImage(body.data.settings);
      setReverseMsg("Reverse Image & Face Einstellungen gespeichert.");
    } finally {
      setReverseBusy(false);
    }
  }

  if (panel === "overview") {
    const active = rows.filter((row) => row.isActive).length;

    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-cyber-cyan/15 bg-[#060d16]/90 p-5 md:p-6">
          <SectionHeader
            eyebrow="ANALYSIS CONTROL CENTER"
            title="Modulübersicht"
            description="Zentrale Freigabe aller Analyseprodukte. Technische Detailparameter werden in den jeweiligen Untermenüs gepflegt."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
              <p className="font-mono text-[8px] text-white/25">MODULE</p>
              <p className="mt-2 text-2xl text-white/80">{rows.length}</p>
            </div>

            <div className="rounded-xl border border-emerald-400/10 bg-black/20 p-4">
              <p className="font-mono text-[8px] text-white/25">AKTIV</p>
              <p className="mt-2 text-2xl text-emerald-100/70">{active}</p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
              <p className="font-mono text-[8px] text-white/25">INAKTIV</p>
              <p className="mt-2 text-2xl text-white/50">
                {Math.max(0, rows.length - active)}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {MODULE_GROUPS.map((group) => {
            const groupRows = rows.filter(
              (row) =>
                (MODULE_INFO[row.analysisKey]?.group ?? "other") === group.id
            );

            if (groupRows.length === 0) return null;

            return (
              <section
                key={group.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.012] p-4 md:p-5"
              >
                <div className="mb-4">
                  <h3 className="text-base font-medium text-white/82">
                    {group.title}
                  </h3>

                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/32">
                    {group.description}
                  </p>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {groupRows.map((row) => {
                    const info = MODULE_INFO[row.analysisKey];

                    return (
                      <article
                        key={row.id}
                        className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-white/82">
                              {row.label}
                            </h4>

                            <p className="mt-2 text-xs leading-relaxed text-white/45">
                              {info?.description ??
                                "Analysemodul der SynSight-Plattform."}
                            </p>

                            {info?.details ? (
                              <p className="mt-2 text-[10px] leading-relaxed text-white/28">
                                {info.details}
                              </p>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            disabled={moduleBusy === row.id}
                            onClick={() => void toggleModule(row)}
                            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium ${
                              row.isActive
                                ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-100/75"
                                : "border-white/10 bg-black/20 text-white/40"
                            }`}
                          >
                            {moduleBusy === row.id
                              ? "Speichern…"
                              : row.isActive
                                ? "Aktiv"
                                : "Inaktiv"}
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
                          <div>
                            <span className="font-mono text-[8px] text-white/22">
                              {row.analysisKey}
                            </span>

                            <p className="mt-1 text-[9px] text-white/25">
                              {row.credits} SynCredits · Preisverwaltung unter
                              Geschäft & Finanzen
                            </p>
                          </div>

                          {info?.settingsHref ? (
                            <a
                              href={info.settingsHref}
                              className="rounded-lg border border-cyber-cyan/15 px-3 py-2 text-[10px] text-cyber-cyan/60 hover:border-cyber-cyan/35 hover:text-cyber-cyan"
                            >
                              Einstellungen →
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {moduleMsg ? (
          <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-white/55">
            {moduleMsg}
          </p>
        ) : null}
      </div>
    );
  }

  if (panel === "username") {
    return (
      <div className="space-y-5">
        <section className="rounded-2xl border border-cyber-cyan/15 bg-[#060d16]/90 p-5 md:p-6">
          <SectionHeader
            eyebrow="USERNAME INTELLIGENCE"
            title="Username Intelligence konfigurieren"
            description="Steuert, wie intensiv nach einem Benutzernamen gesucht wird und welche Treffer anschließend als relevant gelten. Der Modulstatus wird in der Modulübersicht verwaltet; Preise und SynCredits befinden sich unter Geschäft & Finanzen."
          />

          <div className="rounded-xl border border-cyber-cyan/10 bg-cyber-cyan/[0.025] p-4">
            <p className="text-xs leading-relaxed text-white/42">
              Beispiel: Ein Scan nach „Anja1921“ kann mehrere Suchanfragen
              erzeugen, Treffer aus verschiedenen Quellen sammeln und diese
              anschließend nach Relevanz bewerten. Die Einstellungen unten
              bestimmen Suchumfang und Trefferqualität.
            </p>
          </div>
        </section>

        <SettingsGroup
          title="1 · Grundfunktion"
          description="Technische Freigabe der externen Such- und Analysefunktionen."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="API aktiv"
              hint="Erlaubt dem Modul, seine benötigten externen Such- und Analyseaufrufe auszuführen. Ist dieser Schalter aus, kann das Produkt zwar im Katalog aktiv sein, die eigentliche externe Analyse wird jedoch blockiert."
              recommendation="Im normalen Betrieb aktiviert lassen. Nur bei Wartung oder Problemen mit dem Provider deaktivieren."
            >
              <input
                type="checkbox"
                checked={username.apiEnabled}
                onChange={(event) =>
                  setUsername((current) => ({
                    ...current,
                    apiEnabled: event.target.checked,
                  }))
                }
              />
            </Field>
          </div>
        </SettingsGroup>

        <SettingsGroup
          title="2 · Suchumfang"
          description="Bestimmt, wie breit und tief nach dem Benutzernamen gesucht wird. Höhere Werte können mehr Treffer liefern, benötigen aber mehr Zeit und API-Aufrufe."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field
              label="Maximale Suchanfragen"
              hint="Legt fest, wie viele einzelne Suchabfragen maximal für eine Analyse erzeugt werden. Mehr Abfragen erhöhen die Chance auf zusätzliche Fundstellen."
              recommendation="6–8 für einen gründlichen Scan. Das Backend erlaubt aktuell 5–8."
            >
              <input
                type="number"
                min={5}
                max={8}
                value={username.maxQueries}
                onChange={(event) =>
                  setUsername((current) => ({
                    ...current,
                    maxQueries: Number(event.target.value),
                  }))
                }
                className={inputClass}
              />
            </Field>

            <Field
              label="Länder / Suchregion"
              hint="Bevorzugte Region für Suchergebnisse. „de“ priorisiert Ergebnisse aus Deutschland."
              recommendation="de für den deutschen Markt."
            >
              <input
                value={username.countries}
                onChange={(event) =>
                  setUsername((current) => ({
                    ...current,
                    countries: event.target.value,
                  }))
                }
                placeholder="de"
                className={inputClass}
              />
            </Field>

            <Field
              label="Sprache"
              hint="Bevorzugte Sprache für Suche und Auswertung."
              recommendation="de für deutsche Benutzer und deutschsprachige Ergebnisse."
            >
              <input
                value={username.language}
                onChange={(event) =>
                  setUsername((current) => ({
                    ...current,
                    language: event.target.value,
                  }))
                }
                placeholder="de"
                className={inputClass}
              />
            </Field>

            <Field
              label="Ergebnislimit"
              hint="Maximale Anzahl gefundener Treffer, die anschließend weiterverarbeitet werden. Ein höherer Wert kann mehr schwache Randtreffer enthalten."
              recommendation="30–60 für einen guten Kompromiss aus Abdeckung und Verarbeitung."
            >
              <input
                type="number"
                min={5}
                max={200}
                value={username.resultLimit}
                onChange={(event) =>
                  setUsername((current) => ({
                    ...current,
                    resultLimit: Number(event.target.value),
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SettingsGroup>

        <SettingsGroup
          title="3 · Trefferqualität"
          description="Hier wird festgelegt, wie streng SynSight Treffer bewertet. Höhere Schwellen reduzieren schwache Treffer, können aber auch echte Randtreffer aussortieren."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Confidence Minimum"
              hint="Treffer unterhalb dieses Qualitätswerts werden verworfen. Niedriger bedeutet mehr Ergebnisse und mehr mögliche Fehlzuordnungen; höher bedeutet weniger, dafür strengere Treffer."
              recommendation="55–70. 60 ist ein guter Ausgangswert."
            >
              <input
                type="number"
                min={0}
                max={100}
                value={username.confidenceMin}
                onChange={(event) =>
                  setUsername((current) => ({
                    ...current,
                    confidenceMin: Number(event.target.value),
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SettingsGroup>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={usernameBusy}
            onClick={() => void saveUsername()}
            className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-5 py-2.5 text-sm text-cyber-cyan"
          >
            {usernameBusy ? "Speichern…" : "Username-Einstellungen speichern"}
          </button>

          {usernameMsg ? (
            <span className="text-xs text-white/45">{usernameMsg}</span>
          ) : null}
        </div>
      </div>
    );
  }

  if (panel === "digital-leak") {
    return (
      <div className="space-y-5">
        <section className="rounded-2xl border border-cyber-cyan/15 bg-[#060d16]/90 p-5 md:p-6">
          <SectionHeader
            eyebrow="DIGITAL LEAK & EXPOSURE"
            title="Digital Leak & Exposure"
            description="Gemeinsame Analyse für hinterlegte E-Mail-Adressen und Telefonnummern. Das Modul ersetzt die früher getrennten Telefon- und E-Mail-Analysen."
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                E-MAIL-ADRESSEN
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/42">
                Prüft die im Profil hinterlegten E-Mail-Adressen auf bekannte
                Datenleaks und Exposure-Fundstellen.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                TELEFONNUMMERN
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/42">
                Bezieht hinterlegte Telefonnummern in dieselbe Exposure-Analyse
                ein, sofern die verwendeten Datenquellen Treffer dazu liefern.
              </p>
            </div>
          </div>
        </section>

        <SettingsGroup
          title="Aufbewahrung & Datenschutz"
          description="Steuert, wie lange neu erzeugte Analyseergebnisse standardmäßig gespeichert werden."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Standard-Aufbewahrung"
              hint="Gilt für neu erzeugte Digital-Leak-Ergebnisse. Eine Änderung dieses Wertes verändert bestehende Ergebnisse nicht rückwirkend."
              recommendation="Nur so lange speichern, wie es für Produktfunktion und Kundenzweck tatsächlich benötigt wird."
            >
              <select
                disabled={!platform || retentionBusy}
                value={String(platform?.digitalLeakDefaultRetentionDays ?? 90)}
                onChange={(event) =>
                  void saveRetention(Number(event.target.value))
                }
                className={inputClass}
              >
                {DIGITAL_LEAK_RETENTION_PRESETS.map((preset) => (
                  <option key={preset.days} value={preset.days}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </SettingsGroup>

        {retentionMsg ? (
          <p className="text-xs text-white/45">{retentionMsg}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-violet-400/15 bg-[#060d16]/90 p-5 md:p-6">
        <SectionHeader
          eyebrow="REVERSE IMAGE & FACE"
          title="Public Image Exposure & Face Identity"
          description="Steuert öffentliche Bildersuche, Relevanzbewertung und den Vergleich gefundener Bilder mit den Referenzbildern des Benutzers. Die Hauptaktivierung der Produkte erfolgt ausschließlich in der Modulübersicht."
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="font-mono text-[8px] tracking-[.12em] text-violet-300/50">
              PUBLIC IMAGE EXPOSURE
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/42">
              Sucht nach öffentlich indexierten Bildern, die anhand von
              Benutzername, Namen und weiteren Identitätsmerkmalen relevant sein
              könnten.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="font-mono text-[8px] tracking-[.12em] text-violet-300/50">
              FACE IDENTITY
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/42">
              Vergleicht geeignete Fundbilder mit hinterlegten Referenzbildern,
              um mögliche Fehlzuordnungen zu reduzieren.
            </p>
          </div>
        </div>
      </section>

      <SettingsGroup
        title="1 · Grundfunktionen"
        description="Technische Verarbeitung und zusätzliche Relevanzbewertung."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="API aktiv"
            hint="Erlaubt die technischen Backend-Aufrufe des Reverse-Image-Moduls. Der Produktstatus selbst wird separat in der Modulübersicht gesteuert."
            recommendation="Im normalen Betrieb eingeschaltet lassen."
          >
            <input
              type="checkbox"
              checked={reverseImage.apiEnabled}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  apiEnabled: event.target.checked,
                }))
              }
            />
          </Field>

          <Field
            label="KI-Relevanzfilter"
            hint="Bewertet gefundene Bilder zusätzlich anhand ihres Kontexts und ihrer Wahrscheinlichkeit, zur gesuchten Identität zu gehören."
            recommendation="Aktiviert lassen, wenn möglichst wenige irrelevante Treffer angezeigt werden sollen."
          >
            <input
              type="checkbox"
              checked={reverseImage.aiRelevanceFilter}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  aiRelevanceFilter: event.target.checked,
                }))
              }
            />
          </Field>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="2 · Suchumfang"
        description="Begrenzt, wie viele Suchergebnisse und Bilder verarbeitet werden. Größere Werte erhöhen die Abdeckung, benötigen aber mehr Zeit und Ressourcen."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Max. Seiten pro Suchanfrage"
            hint="Bestimmt, wie viele Ergebnisseiten je Suchanfrage abgearbeitet werden."
            recommendation="2 Seiten für den normalen Betrieb. 3–4 nur für besonders intensive Suchen."
          >
            <input
              type="number"
              min={1}
              max={4}
              value={reverseImage.maxPagesPerQuery}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  maxPagesPerQuery: Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Max. Bilder pro Suchanfrage"
            hint="Maximale Anzahl gefundener Bilder, die pro Suchanfrage verarbeitet werden. Mehr Bilder erhöhen die Trefferchance, erzeugen aber deutlich mehr Verarbeitung."
            recommendation="60–120. 100 ist ein guter Ausgangswert."
          >
            <input
              type="number"
              min={20}
              max={200}
              step={10}
              value={reverseImage.maxImagesPerQuery}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  maxImagesPerQuery: Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="3 · Trefferqualität"
        description="Diese Werte entscheiden, welche Fundbilder als relevant oder als mögliche Identitätsübereinstimmung bewertet werden."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label="Identity Score Minimum"
            hint="Gesamtbewertung dafür, wie gut ein Fundbild zur gesuchten digitalen Identität passt. Niedriger liefert mehr mögliche Treffer; höher filtert aggressiver."
            recommendation="40–55. 45 ist ein ausgewogener Ausgangswert."
          >
            <input
              type="number"
              min={20}
              max={95}
              value={reverseImage.identityScoreThreshold}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  identityScoreThreshold: Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Domain-Relevanz Minimum"
            hint="Bewertet, wie aussagekräftig die Fundquelle für die gesuchte Identität ist. Ein hoher Wert reduziert Treffer von schwachen oder wenig relevanten Seiten."
            recommendation="30–45. 35 bietet meist einen guten Mittelweg."
          >
            <input
              type="number"
              min={0}
              max={95}
              value={reverseImage.domainRelevanceMin}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  domainRelevanceMin: Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Mindest-Confidence"
            hint="Allgemeine Mindest-Sicherheit der Relevanzbewertung. Treffer darunter werden nicht als ausreichend zuverlässig behandelt."
            recommendation="50–65. Der aktuelle Standardwert 55 ist ein guter Ausgangspunkt."
          >
            <input
              type="number"
              min={30}
              max={95}
              value={reverseImage.minConfidence}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  minConfidence: Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Face Similarity Schwelle"
            hint="Mindestähnlichkeit für den eigentlichen Gesichtsvergleich. Ein niedriger Wert erhöht die Empfindlichkeit, aber auch die Gefahr falscher Übereinstimmungen."
            recommendation="0,35–0,50 zum Start. Bei zu vielen Fehlzuordnungen schrittweise erhöhen."
          >
            <input
              type="number"
              min={0.35}
              max={0.95}
              step={0.05}
              value={reverseImage.similarityThreshold}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  similarityThreshold: Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="4 · Server & Verbindung"
        description="Verbindung zum internen Face-Comparison-Dienst. Diese Werte sollten normalerweise nur bei Serveränderungen oder technischen Problemen angepasst werden."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Field
              label="Face Intelligence URL"
              hint="Interner HTTP-Endpunkt des Servers, der den eigentlichen Gesichtsvergleich ausführt."
              recommendation="Nur ändern, wenn der Face-Server oder dessen Port umzieht."
            >
              <input
                type="url"
                value={reverseImage.compareUrl}
                onChange={(event) =>
                  setReverseImage((current) => ({
                    ...current,
                    compareUrl: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Timeout"
            hint="Maximale Wartezeit auf eine Antwort des Face-Servers. Ist sie zu niedrig, können langsame Vergleiche unnötig abbrechen."
            recommendation="10.000–20.000 ms. 12.000 ms ist ein guter Ausgangswert."
          >
            <input
              type="number"
              min={3000}
              max={60000}
              step={1000}
              value={reverseImage.compareTimeoutMs}
              onChange={(event) =>
                setReverseImage((current) => ({
                  ...current,
                  compareTimeoutMs: Number(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
        </div>
      </SettingsGroup>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={reverseBusy}
          onClick={() => void saveReverseImage()}
          className="rounded-lg border border-violet-400/35 bg-violet-400/[0.08] px-5 py-2.5 text-sm text-violet-200"
        >
          {reverseBusy ? "Speichern…" : "Reverse-Image-Einstellungen speichern"}
        </button>

        {reverseMsg ? (
          <span className="text-xs text-white/45">{reverseMsg}</span>
        ) : null}
      </div>
    </div>
  );
}
