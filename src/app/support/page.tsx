import type { Metadata } from "next";
import { Suspense } from "react";
import CompanyPage from "@/components/layout/CompanyPage";
import SupportForm from "@/components/company/SupportForm";
import SupportStatusIndicator from "@/components/support/SupportStatusIndicator";

export const metadata: Metadata = {
  title: "Support — SynSight",
  description:
    "Eröffnen Sie ein Support-Ticket für technische Fragen, Plattformprobleme und Datenschutzanfragen.",
};

export default function SupportPage() {
  return (
    <CompanyPage
      label="Unternehmen / Support"
      title="Support-Ticket eröffnen"
      subtitle="Beschreiben Sie Ihr Anliegen — wir erfassen es strukturiert und leiten es an das Support-Team."
      maxWidthClassName="max-w-3xl"
    >
      <section aria-labelledby="support-status-heading" className="mb-8">
        <h2
          id="support-status-heading"
          className="mb-3 font-mono text-[9px] tracking-[.14em] text-white/30"
        >
          SUPPORT ONLINE
        </h2>
        <SupportStatusIndicator />
      </section>

      <section aria-labelledby="support-form-heading">
        <div className="mb-8">
          <h2
            id="support-form-heading"
            className="text-xl font-medium tracking-[-.02em] text-white/85"
          >
            Nachricht an den SynSight Support
          </h2>
          <p className="mt-2 text-sm text-white/35">
            Für technische Probleme, Kontofragen, Plattformmeldungen und
            Anfragen zum Datenschutz. Bitte schreiben Sie mindestens 10 Zeichen
            in die Nachricht.
          </p>
        </div>
        <Suspense fallback={null}>
          <SupportForm />
        </Suspense>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            TECHNIK
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Fehlermeldungen, Login-Probleme, Analysen und technische Rückfragen.
          </p>
        </article>
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            KONTO
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Fragen zu Zugriff, Registrierung, Profil und SynCredits.
          </p>
        </article>
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            DATENSCHUTZ
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Datenschutzanfragen können ebenfalls als Ticket eingereicht werden.
          </p>
        </article>
      </section>
    </CompanyPage>
  );
}
