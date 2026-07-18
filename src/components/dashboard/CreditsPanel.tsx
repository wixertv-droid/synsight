import Link from "next/link";
import InfoHeading from "@/components/ui/InfoHeading";
import InfoPanel from "@/components/ui/InfoPanel";
import { guidance } from "@/lib/content/guidance";
import { getCreditsOverview } from "@/lib/services/credits-service";
import { getPublicPricingCatalog } from "@/lib/services/pricing-service";

interface CreditsPanelProps {
  userId: number;
}

export default async function CreditsPanel({ userId }: CreditsPanelProps) {
  const [overview, catalog] = await Promise.all([
    getCreditsOverview(userId),
    getPublicPricingCatalog(),
  ]);
  const monthBudgetHint = Math.max(
    overview.balance + overview.spentThisMonth,
    1
  );
  const spentRatio = Math.min(
    100,
    Math.round((overview.spentThisMonth / monthBudgetHint) * 100)
  );
  const recentCharges = overview.recentTransactions
    .filter((transaction) => transaction.amount < 0)
    .slice(0, 5);

  return (
    <section
      id="syncredits-dashboard"
      className="mb-6 rounded-[1.4rem] border border-cyber-cyan/15 bg-cyber-cyan/[0.03] p-5 md:p-6"
      aria-labelledby="credits-heading"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-[200px]">
          <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
            SYNCREDITS
          </p>
          <InfoHeading
            as="h2"
            id="credits-heading"
            label="Aktuelles Guthaben"
            info={guidance.dashboard.syncredits}
            className="mt-2 text-xl font-medium tracking-[-.02em] text-white/90"
          />
          <p className="mt-4 text-4xl font-semibold text-cyber-cyan/90">
            {overview.balance.toLocaleString("de-DE")}
          </p>
          <p className="mt-1 text-xs text-white/35">SynCredits verfügbar</p>

          <div className="mt-5">
            <div className="flex items-center justify-between font-mono text-[8px] tracking-[.12em] text-white/28">
              <span>VERBRAUCH DIESER MONAT</span>
              <span>{overview.spentThisMonth.toLocaleString("de-DE")}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan"
                style={{ width: `${spentRatio}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="#analysis-pricing"
              className="inline-flex rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-4 py-2.5 text-xs font-semibold text-space-black transition hover:brightness-110"
            >
              SynCredits aufladen
            </Link>
            <Link
              href="/#syncredits"
              className="inline-flex rounded-lg border border-white/10 px-4 py-2.5 text-xs text-white/60 transition hover:border-cyber-blue/40 hover:text-white"
            >
              Preisübersicht
            </Link>
          </div>
        </div>

        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-space-black/40 p-4">
            <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
              LETZTE ABBUCHUNGEN
            </p>
            <ul className="mt-3 space-y-2">
              {recentCharges.length === 0 ? (
                <li>
                  <InfoPanel
                    compact
                    title="Noch keine Abbuchungen"
                    description={guidance.empty.transactions}
                    actionLabel="SynCredits aufladen"
                    actionHref="#analysis-pricing"
                  />
                </li>
              ) : (
                recentCharges.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-2 text-xs last:border-0"
                  >
                    <span className="truncate text-white/55">
                      {tx.description}
                    </span>
                    <span
                      className={
                        tx.amount >= 0
                          ? "font-mono text-cyber-cyan/80"
                          : "font-mono text-amber-200/70"
                      }
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div
            id="analysis-pricing"
            className="rounded-xl border border-white/[0.07] bg-space-black/40 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8px] tracking-[.14em] text-white/28">
                ANALYSEPREISE
              </p>
              <Link
                href="/dashboard/analysis"
                className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/60 transition hover:text-cyber-cyan"
              >
                ALLE ANGEBOTE →
              </Link>
            </div>
            <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {[...catalog.analyses]
                .sort((a, b) => a.credits - b.credits)
                .map((price) => {
                  const isPremium =
                    price.key === "full_identity_analysis" ||
                    price.key === "deep_intelligence";
                  return (
                    <li
                      key={price.key}
                      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs ${
                        isPremium
                          ? "border border-cyber-cyan/20 bg-cyber-cyan/[0.05] text-white/75"
                          : "text-white/50"
                      }`}
                    >
                      <span className="truncate">{price.label}</span>
                      <span
                        className={`shrink-0 font-mono ${
                          isPremium ? "text-cyber-cyan" : "text-white/70"
                        }`}
                      >
                        {price.credits} Cr
                      </span>
                    </li>
                  );
                })}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-white/30">
              Preise aufsteigend sortiert. Pakete sind hervorgehoben — dort
              erhalten Sie den größten Überblick pro Start.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
