"use client";

import { useCallback, useEffect, useState } from "react";
import type { FinanceOverview } from "@/lib/services/finance-service";
import type { SerpApiAccountSnapshot } from "@/lib/services/search-provider-service";

function formatDay(date: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(date));
  } catch {
    return date.slice(5);
  }
}

export default function AdminFinanceOverviewView() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [serpAccount, setSerpAccount] = useState<SerpApiAccountSnapshot | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [financeRes, accountRes] = await Promise.all([
      fetch("/api/admin/finance/overview"),
      fetch("/api/admin/search-provider/account"),
    ]);
    const financeBody = await financeRes.json().catch(() => null);
    if (!financeRes.ok || !financeBody?.success) {
      setError(financeBody?.error?.message ?? "Finanzübersicht nicht ladbar.");
      return;
    }
    setOverview(financeBody.data.overview);

    const accountBody = await accountRes.json().catch(() => null);
    if (accountRes.ok && accountBody?.success) {
      setSerpAccount(accountBody.data.account);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <p className="rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100/70">
        {error}
      </p>
    );
  }

  if (!overview) {
    return <p className="text-sm text-white/40">Finanzen werden geladen…</p>;
  }

  const maxBar = Math.max(
    ...overview.dailySeries.map((day) => Math.max(day.income, day.expense)),
    0.01
  );

  return (
    <div className="space-y-6">
      <section className="intel-cyber-hud relative overflow-hidden rounded-[1.3rem] border border-cyber-cyan/20 bg-[#050b14]/95 p-5 md:p-6">
        <div className="intel-cyber-hex opacity-40" aria-hidden="true" />
        <div className="intel-cyber-scanlines" aria-hidden="true" />
        <div className="relative z-[1]">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/60">
            FINANCE HUD · EINNAHMEN / AUSGABEN
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Einnahmen",
                value: overview.incomeLabel,
                tone: "text-emerald-200/85",
              },
              {
                label: "API-Ausgaben",
                value: overview.expenseLabel,
                tone: "text-rose-200/85",
              },
              {
                label: "Saldo",
                value: overview.balanceLabel,
                tone: "text-cyber-cyan/90",
              },
              {
                label: "API Calls heute",
                value: String(overview.apiCallsToday),
                tone: "text-white/80",
              },
            ].map((card) => (
              <article
                key={card.label}
                className="rounded-xl border border-white/[0.08] bg-black/30 p-4"
              >
                <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
                  {card.label.toUpperCase()}
                </p>
                <p className={`mt-2 text-xl font-semibold ${card.tone}`}>
                  {card.value}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {serpAccount ? (
        <section className="rounded-[1.2rem] border border-cyber-cyan/20 bg-cyber-cyan/[0.04] p-5">
          <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/60">
            SERPAPI PLAN · ACCOUNT API (KOSTENLOS)
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3">
              <p className="font-mono text-[8px] text-white/30">PLAN</p>
              <p className="mt-1 text-sm text-white/80">
                {serpAccount.planName ?? "—"}
              </p>
            </article>
            <article className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3">
              <p className="font-mono text-[8px] text-white/30">VERBLEIBEND</p>
              <p className="mt-1 text-sm text-emerald-100/80">
                {serpAccount.totalSearchesLeft.toLocaleString("de-DE")}
              </p>
            </article>
            <article className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3">
              <p className="font-mono text-[8px] text-white/30">
                VERBRAUCH MONAT
              </p>
              <p className="mt-1 text-sm text-white/80">
                {serpAccount.thisMonthUsage.toLocaleString("de-DE")} /{" "}
                {serpAccount.searchesPerMonth.toLocaleString("de-DE")}
              </p>
            </article>
            <article className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3">
              <p className="font-mono text-[8px] text-white/30">
                GESCHÄTZTE AUSGABEN
              </p>
              <p className="mt-1 text-sm text-rose-100/80">
                {serpAccount.estimatedMonthSpendUsd.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "USD",
                })}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="intel-cyber-hud relative overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-[#060d16] p-5">
          <div className="intel-cyber-hex opacity-30" aria-hidden="true" />
          <div className="relative z-[1]">
            <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
              14-TAGE SIGNAL · INCOME / EXPENSE
            </p>
            <div className="mt-5 flex h-44 items-end gap-1.5">
              {overview.dailySeries.map((day) => (
                <div
                  key={day.date}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  title={`${formatDay(day.date)} · +${day.income.toFixed(2)} / -${day.expense.toFixed(2)}`}
                >
                  <div className="flex w-full items-end justify-center gap-0.5">
                    <div
                      className="w-[42%] rounded-t bg-gradient-to-t from-emerald-500/20 to-emerald-300/80"
                      style={{
                        height: `${Math.max(4, (day.income / maxBar) * 140)}px`,
                      }}
                    />
                    <div
                      className="w-[42%] rounded-t bg-gradient-to-t from-rose-500/20 to-rose-300/80"
                      style={{
                        height: `${Math.max(4, (day.expense / maxBar) * 140)}px`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[7px] text-white/25">
                    {formatDay(day.date)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 font-mono text-[9px] text-white/35">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />{" "}
                Einnahmen
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />{" "}
                API-Ausgaben
              </span>
            </div>
          </div>
        </article>

        <article className="rounded-[1.2rem] border border-white/[0.08] bg-[#060d16] p-5">
          <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
            API KOSTEN NACH PROVIDER
          </p>
          <ul className="mt-4 space-y-3">
            {overview.expenseByProvider.length === 0 ? (
              <li className="text-sm text-white/40">
                Noch keine API-Kosten erfasst. Preise unter API-Ausgaben setzen.
              </li>
            ) : (
              overview.expenseByProvider.map((item) => (
                <li key={item.providerCode}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-white/60">{item.label}</span>
                    <span className="font-mono text-rose-100/75">
                      {item.totalCostEur.toFixed(4)} €
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500/40 to-rose-300"
                      style={{
                        width: `${Math.max(
                          6,
                          (item.totalCostEur /
                            Math.max(
                              ...overview.expenseByProvider.map(
                                (row) => row.totalCostEur
                              ),
                              0.01
                            )) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[9px] text-white/30">
                    {item.requestCount} Requests
                  </p>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.015] p-5">
        <p className="font-mono text-[8px] tracking-[.14em] text-white/30">
          EINNAHMEN NACH ZAHLUNGSANBIETER
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.incomeByProvider.length === 0 ? (
            <p className="text-sm text-white/40">
              Noch keine abgeschlossenen Zahlungen in den letzten 14 Tagen.
            </p>
          ) : (
            overview.incomeByProvider.map((item) => (
              <article
                key={item.provider}
                className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] px-4 py-3"
              >
                <p className="font-mono text-[9px] tracking-[.12em] text-emerald-100/60">
                  {item.provider.toUpperCase()}
                </p>
                <p className="mt-2 text-lg text-white/85">
                  {item.totalEur.toFixed(2)} €
                </p>
                <p className="mt-1 font-mono text-[10px] text-white/35">
                  {item.count} Transaktionen
                </p>
              </article>
            ))
          )}
        </div>
        <p className="mt-4 font-mono text-[10px] text-white/30">
          API Calls gesamt · {overview.apiCallsTotal} · Payments ·{" "}
          {overview.paymentsCount}
        </p>
      </section>
    </div>
  );
}
