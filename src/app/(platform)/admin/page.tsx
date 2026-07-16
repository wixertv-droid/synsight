import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminUserControl from "@/components/admin/AdminUserControl";
import StatusDot from "@/components/ui/StatusDot";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSystemStatus } from "@/lib/services/admin-service";

export const metadata: Metadata = {
  title: "Administration — SynSight Control Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const comingSoon = [
  "Finanzübersicht",
  "Umsätze",
  "Zahlungsanbieter",
  "KI-Auslastung",
  "API-Verbrauch",
  "Benutzerstatistiken",
  "Analysestatistiken",
  "Systemlogs",
  "Audit-Protokolle",
  "Support",
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const system = await getAdminSystemStatus(user);
  const statusCards = [
    {
      label: "Systemstatus",
      value: system.systemStatus === "operational" ? "Operational" : "Degraded",
      good: system.systemStatus === "operational",
    },
    {
      label: "Serverstatus",
      value: system.serverStatus === "online" ? "Online" : system.serverStatus,
      good: system.serverStatus === "online",
    },
    {
      label: "Datenbankstatus",
      value:
        system.databaseStatus === "connected"
          ? "Connected"
          : system.databaseStatus,
      good: system.databaseStatus === "connected",
    },
    { label: "Version", value: `v${system.version}`, good: true },
    {
      label: "Benutzer gesamt",
      value: system.usersTotal.toLocaleString("de-DE"),
      good: true,
    },
    {
      label: "Administratoren",
      value: system.administratorsTotal.toLocaleString("de-DE"),
      good: true,
    },
    {
      label: "Registrierungen heute",
      value: system.registrationsToday.toLocaleString("de-DE"),
      good: true,
    },
    {
      label: "Registrierungen gesamt",
      value: system.registrationsTotal.toLocaleString("de-DE"),
      good: true,
    },
  ];

  return (
    <main id="synsight-admin" className="mx-auto max-w-[1500px]">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="hud-label">Restricted / Administration</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
            Admin Control Center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/35">
            Security Operations Console für Systemzustand, Benutzer und
            revisionssichere SynCredits-Steuerung.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.025] px-3 py-2 font-mono text-[8px] tracking-[.14em] text-emerald-100/55">
          <StatusDot pulse />
          ADMIN SESSION / {user.email}
        </div>
      </div>

      <section
        className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Systemstatus"
      >
        {statusCards.map((card) => (
          <article
            key={card.label}
            className="hardware-panel rounded-xl border border-white/[0.07] bg-white/[0.018] p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] tracking-[.13em] text-white/28">
                {card.label.toUpperCase()}
              </p>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  card.good
                    ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.45)]"
                    : "bg-amber-300"
                }`}
              />
            </div>
            <p className="mt-4 text-xl font-medium text-white/80">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <AdminUserControl />

      <section className="mt-6" aria-labelledby="future-admin-heading">
        <div className="mb-4">
          <p className="font-mono text-[8px] tracking-[.16em] text-white/25">
            CONTROL MODULES / ROADMAP
          </p>
          <h2
            id="future-admin-heading"
            className="mt-2 text-xl font-medium text-white/75"
          >
            Erweiterte Administration
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {comingSoon.map((label, index) => (
            <article
              key={label}
              className="relative min-h-32 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.012] p-4 opacity-60"
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(41,182,246,.025))]" />
              <p className="relative font-mono text-[8px] text-cyber-blue/35">
                MODULE {String(index + 1).padStart(2, "0")}
              </p>
              <p className="relative mt-4 text-sm text-white/55">{label}</p>
              <span className="relative mt-5 inline-flex rounded border border-white/[0.07] px-2 py-1 font-mono text-[7px] tracking-[.12em] text-white/25">
                COMING SOON
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
