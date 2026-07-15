import type { Metadata } from "next";
import SettingsPanel from "@/components/settings/SettingsPanel";

export const metadata: Metadata = {
  title: "Einstellungen — SynSight",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-6xl">
      <div className="mb-8">
        <span className="hud-label">System / Konfiguration</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
          Einstellungen
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/30">
          Kontrollieren Sie Überwachung, Warnungen und den Schutz Ihres
          SynSight Kontos.
        </p>
      </div>
      <SettingsPanel />
    </main>
  );
}
