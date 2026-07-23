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
  finance?: {
    incomeLabel: string;
    expenseLabel: string;
    balanceLabel: string;
    apiCallsToday: number;
  };
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

      {data.finance ? (
        <section className="hardware-panel rounded-[1.3rem] border border-white/[0.08] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                FINANZEN · KURZ
              </p>
              <h2 className="mt-2 text-lg font-medium text-white/88">
                Einnahmen & API-Ausgaben
              </h2>
            </div>
            <Link
              href="/admin/finanzen/uebersicht"
              className="rounded border border-cyber-cyan/30 px-2 py-1 font-mono text-[10px] text-cyber-cyan/80"
            >
              ZUM FINANZBEREICH →
            </Link>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Einnahmen", value: data.finance.incomeLabel },
              { label: "API-Ausgaben", value: data.finance.expenseLabel },
              { label: "Saldo", value: data.finance.balanceLabel },
              {
                label: "API Calls heute",
                value: String(data.finance.apiCallsToday),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
              >
                <dt className="font-mono text-[8px] text-white/30">
                  {item.label.toUpperCase()}
                </dt>
                <dd className="mt-1 text-sm text-white/80">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(data.sections).map(([key, section]) => (
          <Link
            key={key}
            href={section.href}
            className="hardware-panel rounded-[1.2rem] border border-white/[0.07] p-5 transition hover:border-cyber-cyan/25"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
                {section.label.toUpperCase()}
              </p>
              <StatusDot
                tone={
                  section.metrics[0]?.display === "Degraded"
                    ? "danger"
                    : "online"
                }
              />
            </div>
            <ul className="mt-4 space-y-2">
              {section.metrics.map((metric) => (
                <li
                  key={metric.label}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="inline-flex items-center gap-1 text-white/45">
                    {metric.label}
                    <InfoTooltip label={metric.label}>
                      {`Kennzahl aus dem Admin-Bereich ${section.label}.`}
                    </InfoTooltip>
                  </span>
                  <span className="font-mono text-white/75">
                    {metric.display ?? metric.value}
                  </span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </section>
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
            Fünf Bereiche: Benutzer, Marketing, Website, Finanzen und Support.
            Alle bestehenden APIs und Funktionen bleiben erhalten — nur neu
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
