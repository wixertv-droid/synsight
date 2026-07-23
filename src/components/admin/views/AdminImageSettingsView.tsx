"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformSettings } from "@/lib/services/admin-platform-service";

const FIELD_LABELS: Record<keyof PlatformSettings, string> = {
  imageMaxUploadMb: "Maximale Dateigröße (MB)",
  imageCompressionQuality: "Kompressionsqualität",
  imageWebpQuality: "WebP Qualität",
  imageThumbnailQuality: "Thumbnail Qualität",
  imageMaxResolution: "Maximale Auflösung (px)",
  encryptOriginals: "Original verschlüsseln",
  generateAnalysisImages: "Analysebilder erzeugen",
};

export default function AdminImageSettingsView() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/platform-settings");
    const body = await response.json();
    if (body.success) setSettings(body.data.settings);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = await response.json();
      if (body.success) {
        setSettings(body.data.settings);
        setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <p className="text-sm text-white/40">Einstellungen werden geladen…</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(FIELD_LABELS) as Array<keyof PlatformSettings>).map(
          (key) => (
            <label
              key={key}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
            >
              <p className="font-mono text-[8px] text-white/30">
                {FIELD_LABELS[key]}
              </p>
              {typeof settings[key] === "boolean" ? (
                <select
                  value={settings[key] ? "true" : "false"}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            [key]: event.target.value === "true",
                          }
                        : current
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                >
                  <option value="true">Ja</option>
                  <option value="false">Nein</option>
                </select>
              ) : (
                <input
                  type="number"
                  value={settings[key]}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            [key]: Number.parseInt(event.target.value, 10),
                          }
                        : current
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80 outline-none focus:border-cyber-cyan/35"
                />
              )}
            </label>
          )
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2.5 text-sm font-medium text-cyber-cyan disabled:opacity-50"
        >
          {busy ? "Speichern…" : "Einstellungen speichern"}
        </button>
        {saved ? (
          <span className="text-xs text-emerald-300/75">Gespeichert</span>
        ) : null}
      </div>
    </div>
  );
}
