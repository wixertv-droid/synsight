"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import StatusDot from "@/components/ui/StatusDot";

const initialSettings = {
  monitoring: true,
  criticalAlerts: true,
  weeklySummary: false,
  aiRecommendations: true,
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState(initialSettings);

  const toggle = (key: keyof typeof settings) =>
    setSettings((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="glass-strong hardware-panel rounded-[1.4rem] p-6 md:p-8">
        <div className="border-b border-white/[0.06] pb-6">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
            SCHUTZ & BENACHRICHTIGUNGEN
          </p>
          <p className="mt-2 text-xs text-white/28">
            Steuern Sie Monitoring und Kommunikation.
          </p>
        </div>
        <div className="mt-4 divide-y divide-white/[0.05]">
          {[
            ["monitoring", "Kontinuierliche Überwachung", "Neue öffentliche Risikosignale regelmäßig prüfen."],
            ["criticalAlerts", "Kritische Warnungen", "Bei Hinweisen mit hoher Priorität sofort informieren."],
            ["weeklySummary", "Wöchentliche Zusammenfassung", "Eine kompakte Übersicht Ihrer Sicherheitsentwicklung."],
            ["aiRecommendations", "KI-Empfehlungen", "Nächste Schritte automatisch nach Wirkung priorisieren."],
          ].map(([key, title, description]) => {
            const settingKey = key as keyof typeof settings;
            const enabled = settings[settingKey];
            return (
              <div key={key} className="flex items-center gap-5 py-5">
                <div className="flex-1">
                  <p className="text-sm text-white/72">{title}</p>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-white/25">
                    {description}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggle(settingKey)}
                  className={`relative h-7 w-12 rounded-full border transition-all duration-300 ${
                    enabled
                      ? "border-cyber-blue/30 bg-cyber-blue/20"
                      : "border-white/[0.08] bg-white/[0.025]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full transition-all duration-300 ${
                      enabled
                        ? "left-6 bg-cyber-cyan shadow-[0_0_10px_rgba(112,231,255,.35)]"
                        : "left-1 bg-white/25"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="space-y-6">
        <section className="glass hardware-panel rounded-[1.4rem] p-6">
          <div className="flex items-center gap-2">
            <StatusDot pulse />
            <p className="font-mono text-[9px] tracking-[.15em] text-emerald-100/50">
              KONTO GESCHÜTZT
            </p>
          </div>
          <h2 className="mt-5 text-lg font-medium text-white/80">
            Zwei-Faktor-Authentifizierung
          </h2>
          <p className="mt-2 text-[10px] leading-relaxed text-white/28">
            Für dieses Demo-Konto als aktiv dargestellt. Die echte
            Authentifizierung wird über den späteren Auth-Service verwaltet.
          </p>
          <Button variant="secondary" size="sm" className="mt-5 w-full">
            Sicherheitsmethode verwalten
          </Button>
        </section>

        <section className="glass hardware-panel rounded-[1.4rem] p-6">
          <p className="font-mono text-[9px] tracking-[.15em] text-white/25">
            AKTIVE SITZUNG
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/35">
              ◫
            </div>
            <div>
              <p className="text-xs text-white/62">Aktueller Browser</p>
              <p className="mt-1 font-mono text-[7px] tracking-wider text-white/20">
                LINUX · EU REGION · JETZT
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
