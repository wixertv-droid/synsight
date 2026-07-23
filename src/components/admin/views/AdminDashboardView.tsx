"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusDot from "@/components/ui/StatusDot";
import InfoTooltip from "@/components/ui/InfoTooltip";

interface SectionMetric {
  label: string;
  value: number;
  display?: string;
}

interface DashboardData {
  system: { systemStatus: string; memoryMb: number };
  sections: Record<
    string,
    { label: string; href: string; metrics: SectionMetric[] }
  >;
  openTickets: number;
  failedLogins: number;
}

export default function AdminDashboardTiles() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setData(body.data);
      })
      .catch(() => undefined);
  }, []);

  if (!data) {
    return <p className="text-sm text-white/40">Dashboard wird geladen…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "System",
            value: data.system.systemStatus,
            tone: data.system.systemStatus === "operational",
          },
          { label: "RAM (MB)", value: data.system.memoryMb, tone: true },
          { label: "Offene Tickets", value: data.openTickets, tone: true },
          { label: "Fehl-Logins", value: data.failedLogins, tone: true },
        ].map((card) => (
          <article
            key={card.label}
            className="hardware-panel rounded-xl border border-white/[0.07] p-4"
          >
            <p className="font-mono text-[8px] text-white/28">
              {card.label.toUpperCase()}
            </p>
            <p className="mt-3 text-xl text-white/80">{card.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {Object.values(data.sections).map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="hardware-panel group rounded-[1.3rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-5 transition hover:border-cyber-cyan/25"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-white/88">
                {section.label}
              </h2>
              <StatusDot pulse tone="online" />
            </div>
            <ul className="mt-4 space-y-2">
              {section.metrics.map((metric) => (
                <li
                  key={metric.label}
                  className="flex items-center justify-between rounded-lg border border-white/[0.05] px-3 py-2 text-[12px]"
                >
                  <span className="text-white/45">{metric.label}</span>
                  <span className="font-medium text-cyber-cyan/85">
                    {metric.display ?? metric.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[8px] tracking-[.12em] text-white/25 group-hover:text-cyber-cyan/60">
              MODUL ÖFFNEN →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminDashboardHeader({ email }: { email: string }) {
  return (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <span className="hud-label">Restricted / Administration</span>
        <h1 className="mt-4 flex flex-wrap items-center text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
          Admin Control Center
          <InfoTooltip label="Admin SOC">
            Vier Bereiche: Benutzer, Marketing, Website und Support. Alle
            bestehenden APIs und Funktionen bleiben erhalten — nur neu
            strukturiert.
          </InfoTooltip>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/35">
          Security Operations Console — Live-KPIs, Benutzersteuerung und
          Plattform-Management.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.025] px-3 py-2 font-mono text-[8px] tracking-[.14em] text-emerald-100/55">
        <StatusDot pulse />
        ADMIN SESSION / {email}
      </div>
    </header>
  );
}
