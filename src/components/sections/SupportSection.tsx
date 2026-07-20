"use client";

import SupportStatusIndicator from "@/components/support/SupportStatusIndicator";
import SupportTicketForm from "@/components/support/SupportTicketForm";

export default function SupportSection() {
  return (
    <section
      id="support"
      className="relative border-t border-white/[0.06] bg-space-black py-24"
    >
      <div className="section-padding mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/55">
            SUPPORT
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white md:text-4xl">
            Hilfe, wenn Sie sie brauchen
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/40">
            Eröffnen Sie ein Support-Ticket — wir melden uns innerhalb der
            konfigurierten Erreichbarkeitszeiten.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <SupportStatusIndicator />
            <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
                STATUS-LOGIK
              </p>
              <ul className="mt-3 space-y-2 text-sm text-white/45">
                <li>
                  <span className="text-emerald-300">Grün</span> — Support
                  online in der Erreichbarkeitszeit
                </li>
                <li>
                  <span className="text-amber-300">Orange</span> — innerhalb der
                  Support-Zeiten (z. B. 9–18 Uhr)
                </li>
                <li>
                  <span className="text-rose-300">Rot</span> — außerhalb der
                  Zeiten, auch wenn jemand online ist
                </li>
              </ul>
            </article>
          </div>

          <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <h3 className="text-lg font-medium text-white/85">
              Support-Ticket erstellen
            </h3>
            <p className="mt-2 text-sm text-white/35">
              Für technische Probleme, Konto-Fragen und Plattform-Support.
            </p>
            <div className="mt-6">
              <SupportTicketForm source="public" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
