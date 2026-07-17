"use client";

import { useEffect, useState } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";

const reasons = [
  "Keine monatlichen Kosten",
  "Jederzeit aufladbar",
  "Transparente Preise",
  "Jede Analyse einzeln berechnet",
  "Volle Kostenkontrolle",
  "Keine versteckten Gebühren",
];

export default function SynCreditsSection() {
  const [packages, setPackages] = useState<
    Array<{
      code: string;
      name: string;
      credits: number;
      bonusCredits: number;
      totalCredits: number;
      priceLabel: string;
      badge: string | null;
      isPopular: boolean;
    }>
  >([]);

  useEffect(() => {
    let active = true;
    fetch("/api/pricing")
      .then((response) => response.json())
      .then((body) => {
        if (active && body.success) setPackages(body.data.packages);
      })
      .catch(() => {
        // Never show stale code prices when the DB catalog is unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="syncredits"
      className="section-shell section-padding relative overflow-hidden"
      aria-labelledby="syncredits-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,191,255,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(41,182,246,0.06),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="hud-label inline-flex items-center gap-2">
            SynCredits
            <InfoTooltip label="SynCredits">
              {guidance.landing.syncredits}
            </InfoTooltip>
          </p>
          <h2
            id="syncredits-heading"
            className="mt-5 text-3xl font-semibold tracking-[-.04em] text-white md:text-5xl"
          >
            Bezahle nur für das,{" "}
            <span className="cyber-gradient">was du wirklich nutzt.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/40 md:text-base">
            Keine Abonnements. Keine versteckten Kosten. Volle Kostenkontrolle.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((pack) => {
            const featured = pack.isPopular;
            return (
              <article
                key={pack.code}
                className={`hardware-panel relative overflow-hidden rounded-[1.4rem] border p-6 transition duration-500 ${
                  featured
                    ? "border-cyber-cyan/35 bg-cyber-cyan/[0.06] shadow-[0_0_60px_rgba(0,191,255,0.08)]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-cyber-blue/30"
                }`}
              >
                {pack.badge ? (
                  <span className="absolute right-4 top-4 rounded-md border border-cyber-cyan/25 bg-cyber-cyan/10 px-2 py-1 font-mono text-[8px] tracking-[.14em] text-cyber-cyan/80">
                    {pack.badge}
                  </span>
                ) : null}
                <p className="font-mono text-[8px] tracking-[.16em] text-white/30">
                  {pack.name.toUpperCase()}
                </p>
                <p className="mt-5 text-4xl font-semibold tracking-[-.04em] text-white">
                  {pack.totalCredits.toLocaleString("de-DE")}
                </p>
                <p className="mt-1 text-sm text-white/35">SynCredits</p>
                <p className="mt-6 text-2xl font-medium text-cyber-cyan/90">
                  {pack.priceLabel}
                </p>
                <p className="mt-2 text-xs text-white/28">
                  {pack.credits.toLocaleString("de-DE")} Basis
                  {pack.bonusCredits > 0
                    ? ` + ${pack.bonusCredits.toLocaleString("de-DE")} Bonus`
                    : ""}
                </p>
                <a
                  href="/register"
                  className={`mt-8 flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    featured
                      ? "bg-gradient-to-r from-cyber-blue to-cyber-cyan text-space-black hover:brightness-110"
                      : "border border-white/10 bg-white/[0.03] text-white/80 hover:border-cyber-blue/40 hover:text-white"
                  }`}
                >
                  SynCredits laden
                </a>
              </article>
            );
          })}
          {packages.length === 0 ? (
            <p className="col-span-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 text-center text-sm text-white/35">
              Preisübersicht wird geladen…
            </p>
          ) : null}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h3 className="text-2xl font-semibold tracking-[-.03em] text-white">
              Warum SynCredits?
            </h3>
            <ul className="mt-6 space-y-3">
              {reasons.map((reason) => (
                <li
                  key={reason}
                  className="flex items-start gap-3 text-sm text-white/55"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-cyber-cyan/10 text-[10px] text-cyber-cyan">
                    ✓
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <p className="font-mono text-[8px] tracking-[.16em] text-cyber-blue/60">
              NUTZUNGSMODELL
            </p>
            <p className="mt-4 text-lg text-white/80">
              Jede Analyse hat einen klaren Credit-Preis. Vor dem Start sehen
              Sie die Kosten — nach Abschluss Ihr neues Guthaben.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/35">
              Vorbereitet für Stripe, PayPal, Apple Pay, Google Pay und SEPA.
              Abrechnung erfolgt paketbasiert über SynCredits, nicht über
              Monatsabos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
