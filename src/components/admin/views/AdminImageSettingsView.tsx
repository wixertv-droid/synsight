"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformSettings } from "@/lib/services/admin-platform-service";

const inputClass =
  "mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35";

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
      <h3 className="text-sm font-medium text-white/80">{title}</h3>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/35">
        {description}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Setting({
  title,
  description,
  recommendation,
  children,
}: {
  title: string;
  description: string;
  recommendation?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/40">
        {title}
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-white/35">
        {description}
      </p>

      {recommendation ? (
        <p className="mt-2 rounded-lg border border-cyber-cyan/10 bg-cyber-cyan/[0.025] px-3 py-2 text-[10px] leading-relaxed text-cyber-cyan/60">
          Empfehlung: {recommendation}
        </p>
      ) : null}

      {children}
    </label>
  );
}

export default function AdminImageSettingsView() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/platform-settings");
      const body = await response.json();

      if (!response.ok || !body?.success) {
        setError(
          body?.error?.message ??
            "Bild- und Upload-Einstellungen konnten nicht geladen werden."
        );
        return;
      }

      setSettings(body.data.settings);
    } catch {
      setError("Verbindung zur Plattform-Konfiguration fehlgeschlagen.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) {
    setSaved(false);
    setSettings((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  }

  async function save() {
    if (!settings) return;

    setBusy(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageMaxUploadMb: settings.imageMaxUploadMb,
          imageCompressionQuality: settings.imageCompressionQuality,
          imageWebpQuality: settings.imageWebpQuality,
          imageThumbnailQuality: settings.imageThumbnailQuality,
          imageMaxResolution: settings.imageMaxResolution,
          encryptOriginals: settings.encryptOriginals,
          generateAnalysisImages: settings.generateAnalysisImages,

          // Gehört fachlich zu Digital Leak, muss beim vollständigen
          // Platform-Settings-Update aber erhalten bleiben.
          digitalLeakDefaultRetentionDays:
            settings.digitalLeakDefaultRetentionDays,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.success) {
        setError(
          body?.error?.message ??
            "Einstellungen konnten nicht gespeichert werden."
        );
        return;
      }

      setSettings(body.data.settings);
      setSaved(true);
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <p className="text-sm text-white/40">
        Bild- und Upload-Einstellungen werden geladen…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-cyber-cyan/15 bg-[#060d16]/90 p-5 md:p-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyber-cyan/45">
          MEDIA PIPELINE
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white/90">
          Bilder & Uploads
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/40">
          Zentrale technische Einstellungen für hochgeladene Bilder. Hier
          bestimmen Sie Dateigröße, Auflösung, Kompression, Vorschaubilder und
          den Umgang mit Originaldateien.
        </p>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-xs leading-relaxed text-white/35">
            Höhere Qualitäts- und Auflösungswerte verbessern die Bildqualität,
            erhöhen aber Speicherbedarf und Verarbeitungszeit. Die angezeigten
            Empfehlungen orientieren sich an den aktuellen
            SynSight-Standardwerten.
          </p>
        </div>
      </section>

      <Group
        title="1 · Upload"
        description="Begrenzt Größe und Auflösung eingehender Bilddateien."
      >
        <Setting
          title="Maximale Dateigröße"
          description="Größte erlaubte Dateigröße eines einzelnen Bild-Uploads. Das Backend akzeptiert Werte zwischen 1 und 256 MB."
          recommendation="12 MB entspricht dem aktuellen SynSight-Standard."
        >
          <div className="relative">
            <input
              type="number"
              min={1}
              max={256}
              value={settings.imageMaxUploadMb}
              onChange={(event) =>
                update(
                  "imageMaxUploadMb",
                  Number.parseInt(event.target.value, 10)
                )
              }
              className={inputClass}
            />
            <span className="pointer-events-none absolute right-3 top-[22px] text-xs text-white/25">
              MB
            </span>
          </div>
        </Setting>

        <Setting
          title="Maximale Auflösung"
          description="Begrenzt die maximale Bildauflösung der Verarbeitung. Sehr große Bilder benötigen mehr Arbeitsspeicher und CPU-Zeit."
          recommendation="2048 px für Profil-, Analyse- und Webbilder."
        >
          <div className="relative">
            <input
              type="number"
              min={256}
              max={8192}
              step={128}
              value={settings.imageMaxResolution}
              onChange={(event) =>
                update(
                  "imageMaxResolution",
                  Number.parseInt(event.target.value, 10)
                )
              }
              className={inputClass}
            />
            <span className="pointer-events-none absolute right-3 top-[22px] text-xs text-white/25">
              px
            </span>
          </div>
        </Setting>
      </Group>

      <Group
        title="2 · Bildoptimierung"
        description="Steuert Qualität und Dateigröße der erzeugten Bildvarianten. Werte reichen jeweils von 1 bis 100."
      >
        <Setting
          title="Kompressionsqualität"
          description="Allgemeine Qualitätsstufe der Bildverarbeitung. Niedrige Werte erzeugen kleinere Dateien, können aber sichtbare Qualitätsverluste verursachen."
          recommendation="82 ist der aktuelle Standard."
        >
          <input
            type="number"
            min={1}
            max={100}
            value={settings.imageCompressionQuality}
            onChange={(event) =>
              update(
                "imageCompressionQuality",
                Number.parseInt(event.target.value, 10)
              )
            }
            className={inputClass}
          />
        </Setting>

        <Setting
          title="WebP-Qualität"
          description="Qualität der WebP-Dateien, die für moderne Browser und schnelle Darstellung verwendet werden."
          recommendation="80 bietet einen guten Kompromiss aus Qualität und Dateigröße."
        >
          <input
            type="number"
            min={1}
            max={100}
            value={settings.imageWebpQuality}
            onChange={(event) =>
              update(
                "imageWebpQuality",
                Number.parseInt(event.target.value, 10)
              )
            }
            className={inputClass}
          />
        </Setting>

        <Setting
          title="Thumbnail-Qualität"
          description="Qualität kleiner Vorschaubilder. Da Thumbnails kleiner dargestellt werden, kann die Qualität etwas niedriger sein."
          recommendation="72 ist der aktuelle Standard."
        >
          <input
            type="number"
            min={1}
            max={100}
            value={settings.imageThumbnailQuality}
            onChange={(event) =>
              update(
                "imageThumbnailQuality",
                Number.parseInt(event.target.value, 10)
              )
            }
            className={inputClass}
          />
        </Setting>
      </Group>

      <Group
        title="3 · Speicherung & Sicherheit"
        description="Steuert den Umgang mit den hochgeladenen Originalbildern."
      >
        <Setting
          title="Originaldateien verschlüsseln"
          description="Legt fest, ob gespeicherte Originalbilder verschlüsselt abgelegt werden. Das betrifft besonders sensible Referenz- und Profilbilder."
          recommendation="Aktiviert lassen."
        >
          <select
            value={settings.encryptOriginals ? "true" : "false"}
            onChange={(event) =>
              update("encryptOriginals", event.target.value === "true")
            }
            className={inputClass}
          >
            <option value="true">Ja · Originale verschlüsseln</option>
            <option value="false">Nein · unverschlüsselt speichern</option>
          </select>
        </Setting>
      </Group>

      <Group
        title="4 · Analysebilder"
        description="Steuert zusätzliche Bildvarianten, die für Analysefunktionen erzeugt werden."
      >
        <Setting
          title="Analysebilder erzeugen"
          description="Erlaubt der Bild-Pipeline, optimierte Bildvarianten für Analyseprozesse zu erzeugen. Diese können unabhängig vom Original verwendet werden."
          recommendation="Aktiviert lassen, solange Bildanalysen verwendet werden."
        >
          <select
            value={settings.generateAnalysisImages ? "true" : "false"}
            onChange={(event) =>
              update("generateAnalysisImages", event.target.value === "true")
            }
            className={inputClass}
          >
            <option value="true">Ja · Analysebilder erzeugen</option>
            <option value="false">Nein · keine Analysebilder erzeugen</option>
          </select>
        </Setting>
      </Group>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-5 py-2.5 text-sm font-medium text-cyber-cyan disabled:opacity-50"
        >
          {busy ? "Speichern…" : "Bild-Einstellungen speichern"}
        </button>

        {saved ? (
          <span className="text-xs text-emerald-300/75">
            ✓ Einstellungen gespeichert
          </span>
        ) : null}

        {error ? (
          <span className="text-xs text-rose-200/80" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
