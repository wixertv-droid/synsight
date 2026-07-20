"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminSupportSettingsView() {
  const [settings, setSettings] = useState({
    supportHoursStart: "09:00",
    supportHoursEnd: "18:00",
    supportTimezone: "Europe/Berlin",
    supportResponseText: "In der Regel innerhalb von 1–2 Werktagen",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/support/settings");
    const body = await response.json();
    if (body.success) setSettings(body.data.settings);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/support/settings", {
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

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-white/45">
        Steuert die grün/orange/rot-Anzeige im Dashboard und auf der Startseite.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["supportHoursStart", "Start (HH:MM)"],
          ["supportHoursEnd", "Ende (HH:MM)"],
          ["supportTimezone", "Zeitzone"],
        ].map(([key, label]) => (
          <label
            key={key}
            className="rounded-xl border border-white/[0.07] p-4"
          >
            <span className="font-mono text-[8px] text-white/30">{label}</span>
            <input
              value={settings[key as keyof typeof settings]}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
            />
          </label>
        ))}
      </div>
      <label className="block rounded-xl border border-white/[0.07] p-4">
        <span className="font-mono text-[8px] text-white/30">ANTWORTTEXT</span>
        <input
          value={settings.supportResponseText}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              supportResponseText: event.target.value,
            }))
          }
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg border border-cyber-cyan/35 bg-cyber-cyan/[0.08] px-4 py-2.5 text-sm text-cyber-cyan"
        >
          {busy ? "Speichern…" : "Support-Zeiten speichern"}
        </button>
        {saved ? (
          <span className="text-xs text-emerald-300/75">Gespeichert</span>
        ) : null}
      </div>
    </div>
  );
}
