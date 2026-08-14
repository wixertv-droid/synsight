"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import StatusDot from "@/components/ui/StatusDot";
import InfoTooltip from "@/components/ui/InfoTooltip";

interface SectionMetric {
  label: string;
  value: number;
  display?: string;
}

interface FinanceDay {
  date: string;
  income: number;
  expense: number;
}

interface ExpenseProvider {
  providerCode: string;
  label: string;
  totalCostEur: number;
  requestCount: number;
}

interface DashboardData {
  system: {
    systemStatus: string;
    databaseStatus: string;
    memoryMb: number;
  };

  userStats: {
    registrationsToday: number;
    activeUsers: number;
    verifiedUsers: number;
    averageSynCredits: number;
  };

  inbox: {
    total: number;
    newCount: number;
    byChannel?: {
      contact?: {
        total: number;
        newCount: number;
      };
      support?: {
        total: number;
        newCount: number;
      };
      press?: {
        total: number;
        newCount: number;
      };
      partner?: {
        total: number;
        newCount: number;
      };
    };
  };

  activeAnalyses: number;
  activePromotions: number;
  openTickets: number;

  finance: {
    incomeEur: number;
    expenseEur: number;
    balanceEur: number;

    incomeLabel: string;
    expenseLabel: string;
    balanceLabel: string;

    apiCallsToday: number;
    apiCallsTotal: number;
    paymentsCount: number;

    dailySeries: FinanceDay[];
    expenseByProvider: ExpenseProvider[];
  };

  sections: Record<
    string,
    {
      label: string;
      href: string;
      metrics: SectionMetric[];
    }
  >;
}

function shortDate(value: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(value));
  } catch {
    return value.slice(5);
  }
}

function money(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export default function AdminDashboardTiles() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (response) => {
        const body = await response.json().catch(() => null);

        if (!response.ok || !body?.success) {
          throw new Error(
            body?.error?.message ?? "Dashboard konnte nicht geladen werden."
          );
        }

        setData(body.data);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Dashboard konnte nicht geladen werden."
        );
      });
  }, []);

  const maxFinanceBar = useMemo(() => {
    if (!data) return 1;

    return Math.max(
      0.01,
      ...data.finance.dailySeries.map((day) =>
        Math.max(day.income, day.expense)
      )
    );
  }, [data]);

  const maxProviderCost = useMemo(() => {
    if (!data) return 1;

    return Math.max(
      0.0001,
      ...data.finance.expenseByProvider.map((row) => row.totalCostEur)
    );
  }, [data]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-white/40">
        Admin Control Center wird geladen…
      </p>
    );
  }

  const systemOnline = data.system.systemStatus === "operational";

  const databaseOnline = data.system.databaseStatus === "operational";

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          {
            label: "System",
            value: systemOnline ? "Online" : "Degraded",
            sub: "Plattformstatus",
            good: systemOnline,
          },
          {
            label: "Datenbank",
            value: databaseOnline ? "Online" : "Offline",
            sub: "MariaDB",
            good: databaseOnline,
          },
          {
            label: "Benutzer aktiv",
            value: String(data.userStats.activeUsers),
            sub: `${data.userStats.registrationsToday} neu heute`,
            good: true,
          },
          {
            label: "Support",
            value: String(data.openTickets),
            sub: "neue Nachrichten",
            good: data.openTickets === 0,
          },
          {
            label: "API Calls",
            value: String(data.finance.apiCallsToday),
            sub: "heute",
            good: true,
          },
          {
            label: "Saldo",
            value: data.finance.balanceLabel,
            sub: "letzte 14 Tage",
            good: data.finance.balanceEur >= 0,
          },
        ].map((card) => (
          <article
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#060d16]/90 p-4"
          >
            <div
              className={`absolute right-3 top-3 h-1.5 w-1.5 rounded-full ${
                card.good ? "bg-emerald-300" : "bg-amber-300"
              }`}
            />

            <p className="font-mono text-[8px] uppercase tracking-[.13em] text-white/30">
              {card.label}
            </p>

            <p className="mt-3 text-xl font-semibold text-white/82">
              {card.value}
            </p>

            <p className="mt-1 text-[10px] text-white/28">{card.sub}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="relative overflow-hidden rounded-[1.3rem] border border-cyber-cyan/15 bg-[#050b14]/95 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
                BUSINESS SIGNAL · 14 TAGE
              </p>

              <h2 className="mt-2 text-lg font-medium text-white/85">
                Einnahmen vs. API-Kosten
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Tatsächliche erfasste Zahlungen und API-Nutzung.
              </p>
            </div>

            <Link
              href="/admin/geschaeft/uebersicht"
              className="rounded-lg border border-cyber-cyan/20 px-3 py-2 text-[10px] text-cyan-100/60"
            >
              Finanzbereich →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="font-mono text-[8px] text-white/25">EINNAHMEN</p>
              <p className="mt-1 text-lg text-emerald-200/80">
                {data.finance.incomeLabel}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="font-mono text-[8px] text-white/25">API-KOSTEN</p>
              <p className="mt-1 text-lg text-rose-200/80">
                {data.finance.expenseLabel}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="font-mono text-[8px] text-white/25">SALDO</p>
              <p className="mt-1 text-lg text-cyan-100/80">
                {data.finance.balanceLabel}
              </p>
            </div>
          </div>

          {data.finance.dailySeries.length ? (
            <div className="mt-6">
              <div className="flex h-48 items-end gap-1.5">
                {data.finance.dailySeries.map((day) => (
                  <div
                    key={day.date}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                    title={`${shortDate(day.date)} · Einnahmen ${money(
                      day.income
                    )} · API ${money(day.expense)}`}
                  >
                    <div className="flex h-40 w-full items-end justify-center gap-0.5">
                      <div
                        className="w-[42%] rounded-t bg-gradient-to-t from-emerald-500/20 to-emerald-300/80"
                        style={{
                          height: `${Math.max(
                            day.income > 0 ? 4 : 0,
                            (day.income / maxFinanceBar) * 150
                          )}px`,
                        }}
                      />

                      <div
                        className="w-[42%] rounded-t bg-gradient-to-t from-rose-500/20 to-rose-300/80"
                        style={{
                          height: `${Math.max(
                            day.expense > 0 ? 4 : 0,
                            (day.expense / maxFinanceBar) * 150
                          )}px`,
                        }}
                      />
                    </div>

                    <span className="font-mono text-[7px] text-white/20">
                      {shortDate(day.date)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-5 font-mono text-[8px] text-white/30">
                <span>● Einnahmen</span>
                <span>● API-Kosten</span>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-white/30">
              Noch keine Finanzdaten vorhanden.
            </p>
          )}
        </article>

        <article className="rounded-[1.3rem] border border-white/[0.07] bg-[#060d16]/90 p-5">
          <p className="font-mono text-[9px] tracking-[.16em] text-white/35">
            BENUTZER · SNAPSHOT
          </p>

          <div className="mt-5 space-y-5">
            {[
              {
                label: "Aktive Benutzer",
                value: data.userStats.activeUsers,
                max: Math.max(
                  data.userStats.activeUsers,
                  data.userStats.verifiedUsers,
                  1
                ),
              },
              {
                label: "Verifizierte Benutzer",
                value: data.userStats.verifiedUsers,
                max: Math.max(
                  data.userStats.activeUsers,
                  data.userStats.verifiedUsers,
                  1
                ),
              },
              {
                label: "Registrierungen heute",
                value: data.userStats.registrationsToday,
                max: Math.max(data.userStats.activeUsers, 1),
              },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/45">{row.label}</span>

                  <span className="font-mono text-white/75">{row.value}</span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyber-blue/50 to-cyber-cyan"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          row.value > 0 ? 4 : 0,
                          (row.value / row.max) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-4">
              <div className="rounded-lg bg-black/20 p-3">
                <p className="font-mono text-[7px] text-white/25">
                  Ø SYNCREDITS
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {data.userStats.averageSynCredits}
                </p>
              </div>

              <div className="rounded-lg bg-black/20 p-3">
                <p className="font-mono text-[7px] text-white/25">
                  AKTIVE ANALYSEN
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {data.activeAnalyses}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.2rem] border border-white/[0.07] bg-[#060d16]/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] tracking-[.15em] text-white/35">
                API COST DISTRIBUTION
              </p>
              <h2 className="mt-2 text-base font-medium text-white/75">
                Kosten nach Anbieter
              </h2>
            </div>

            <Link
              href="/admin/geschaeft/api-kosten"
              className="text-[10px] text-cyber-cyan/55"
            >
              Details →
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {data.finance.expenseByProvider.length === 0 ? (
              <p className="text-sm text-white/30">
                Noch keine API-Kosten erfasst.
              </p>
            ) : (
              data.finance.expenseByProvider
                .slice()
                .sort((a, b) => b.totalCostEur - a.totalCostEur)
                .slice(0, 6)
                .map((row) => (
                  <div key={row.providerCode}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-white/50">{row.label}</span>

                      <span className="font-mono text-rose-100/70">
                        {money(row.totalCostEur)}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500/40 to-rose-300/80"
                        style={{
                          width: `${Math.max(
                            3,
                            (row.totalCostEur / maxProviderCost) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 font-mono text-[8px] text-white/20">
                      {row.requestCount} Requests
                    </p>
                  </div>
                ))
            )}
          </div>
        </article>

        <article className="rounded-[1.2rem] border border-white/[0.07] bg-[#060d16]/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] tracking-[.15em] text-white/35">
                SUPPORT SIGNAL
              </p>

              <h2 className="mt-2 text-base font-medium text-white/75">
                Kommunikation
              </h2>
            </div>

            <Link
              href="/admin/support/nachrichten"
              className="text-[10px] text-cyber-cyan/55"
            >
              Inbox →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Neue Nachrichten",
                value: data.inbox.newCount,
              },
              {
                label: "Gesamt Inbox",
                value: data.inbox.total,
              },
              {
                label: "Support neu",
                value: data.inbox.byChannel?.support?.newCount ?? 0,
              },
              {
                label: "Kontakt neu",
                value: data.inbox.byChannel?.contact?.newCount ?? 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.06] bg-black/20 p-4"
              >
                <p className="font-mono text-[8px] text-white/25">
                  {item.label.toUpperCase()}
                </p>

                <p className="mt-2 text-xl text-white/75">{item.value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section>
        <div className="mb-4">
          <p className="font-mono text-[9px] tracking-[.16em] text-white/30">
            CONTROL CENTER
          </p>

          <h2 className="mt-2 text-lg font-medium text-white/80">
            Bereiche & Schnellzugriff
          </h2>

          <p className="mt-1 text-xs text-white/30">
            Die wichtigsten Kennzahlen jedes Verwaltungsbereichs auf einen
            Blick.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(data.sections).map(([key, section]) => (
            <Link
              key={key}
              href={section.href}
              className="group rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-5 transition hover:border-cyber-cyan/25 hover:bg-cyber-cyan/[0.025]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[9px] tracking-[.13em] text-cyber-cyan/50">
                  {section.label.toUpperCase()}
                </p>

                <span className="text-cyber-cyan/25 transition group-hover:text-cyber-cyan/60">
                  →
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {section.metrics.map((metric) => (
                  <li
                    key={metric.label}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="inline-flex items-center gap-1 text-white/38">
                      {metric.label}

                      <InfoTooltip label={metric.label}>
                        {`Kennzahl aus dem Bereich ${section.label}.`}
                      </InfoTooltip>
                    </span>

                    <span className="font-mono text-white/70">
                      {metric.display ?? metric.value}
                    </span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
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
          <InfoTooltip label="Admin Control Center">
            Zentrale Übersicht über Benutzer, Analysen, Website, APIs, Finanzen,
            Support sowie Systemzustand.
          </InfoTooltip>
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/35">
          Betriebszentrale für SynSight — wichtige Kennzahlen, Kosten,
          Benutzeraktivität und Systemzustand auf einen Blick.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.025] px-3 py-2 font-mono text-[8px] tracking-[.14em] text-emerald-100/55">
        <StatusDot pulse />
        ADMIN SESSION / {email}
      </div>
    </header>
  );
}
