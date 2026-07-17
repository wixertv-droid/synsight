import type { Metadata } from "next";
import LegalDocument, { LegalPanel } from "@/components/layout/LegalDocument";
import StatusComponentGrid from "@/components/status/StatusComponentGrid";
import {
  formatStatusTimestamp,
  getOverallStatusLabel,
  getPublicSystemStatus,
} from "@/lib/content/system-status";

export const metadata: Metadata = {
  title: "Systemstatus — SynSight",
  description:
    "SynSight Systemstatus — Transparenz über die Verfügbarkeit unserer Plattform.",
};

export const dynamic = "force-dynamic";

export default function StatusPage() {
  const status = getPublicSystemStatus();
  const updatedLabel = formatStatusTimestamp(status.updatedAtIso);

  return (
    <LegalDocument
      label="Operations / Status"
      title="SynSight Systemstatus"
      subtitle="Transparenz über die Verfügbarkeit unserer Plattform."
      updatedAt={updatedLabel}
      nav={[
        { id: "overview", label: "Gesamtstatus" },
        { id: "components", label: "Komponenten" },
        { id: "maintenance", label: "Wartung" },
        { id: "history", label: "Historie" },
      ]}
    >
      <LegalPanel
        id="overview"
        title="Gesamtstatus"
        info="Der Gesamtstatus fasst die Erreichbarkeit der Kernsysteme zusammen. Später können hier Live-Health-Checks einfließen."
      >
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.6)]" />
            </span>
            <p className="font-mono text-sm tracking-[.16em] text-emerald-100/80">
              {getOverallStatusLabel(status.overall)}
            </p>
          </div>
          <p className="mt-3 text-sm text-white/45">{status.headline}</p>
          <p className="mt-4 font-mono text-[9px] tracking-[.14em] text-white/30">
            LETZTE AKTUALISIERUNG / {updatedLabel}
          </p>
        </div>
      </LegalPanel>

      <LegalPanel
        id="components"
        title="Komponentenübersicht"
        info="Jede Komponente kann später an ein internes Monitoring angebunden werden (API, Datenbank, KI-Services)."
      >
        <StatusComponentGrid components={status.components} />
      </LegalPanel>

      <LegalPanel
        id="maintenance"
        title="Geplante Wartungen"
        info="Hier erscheinen künftige Wartungsfenster, sobald sie geplant und kommuniziert werden."
      >
        {status.maintenance.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5">
            <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
              MAINTENANCE WINDOW
            </p>
            <p className="mt-2 text-sm text-white/50">
              Derzeit sind keine Wartungsarbeiten geplant.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {status.maintenance.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-4"
              >
                <p className="font-mono text-[9px] tracking-[.14em] text-amber-100/55">
                  {item.windowLabel}
                </p>
                <p className="mt-2 text-sm text-white/55">{item.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </LegalPanel>

      <LegalPanel
        id="history"
        title="Historie"
        info="Vergangene Ereignisse und Releases helfen, die Betriebsstabilität nachzuvollziehen."
      >
        <ul className="space-y-3">
          {status.history.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/55">
                  {event.date}
                </span>
                <span className="font-mono text-[8px] tracking-[.12em] text-white/28">
                  {event.severity.toUpperCase()}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-white/75">
                {event.title}
              </p>
              <p className="mt-1 text-sm text-white/40">{event.summary}</p>
            </li>
          ))}
        </ul>
      </LegalPanel>
    </LegalDocument>
  );
}
