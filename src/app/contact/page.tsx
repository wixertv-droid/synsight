import type { Metadata } from "next";
import CompanyPage from "@/components/layout/CompanyPage";
import ContactForm from "@/components/company/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt — SynSight",
  description:
    "Kontaktieren Sie das SynSight Team für Produktfragen, Support und allgemeine Anliegen.",
};

export default function ContactPage() {
  return (
    <CompanyPage
      label="Unternehmen / Kontakt"
      title="Kontakt"
      subtitle="Schreiben Sie uns — wir antworten strukturiert, diskret und zeitnah."
      maxWidthClassName="max-w-3xl"
    >
      <section aria-labelledby="contact-form-heading">
        <div className="mb-8">
          <h2
            id="contact-form-heading"
            className="text-xl font-medium tracking-[-.02em] text-white/85"
          >
            Nachricht an SynSight
          </h2>
          <p className="mt-2 text-sm text-white/35">
            Für allgemeine Anfragen, Produktinteresse und organisatorische
            Themen.
          </p>
        </div>
        <ContactForm />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            ALLGEMEIN
          </p>
          <p className="mt-3 text-sm text-white/55">
            <a
              href="mailto:contact@synsight.de"
              className="text-cyber-cyan/80 transition hover:text-cyber-cyan"
            >
              contact@synsight.de
            </a>
          </p>
          <p className="mt-2 text-xs text-white/30">
            Allgemeine und organisatorische Anfragen
          </p>
        </article>
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            SUPPORT
          </p>
          <p className="mt-3 text-sm text-white/55">
            <a
              href="mailto:support@synsight.de"
              className="text-cyber-cyan/80 transition hover:text-cyber-cyan"
            >
              support@synsight.de
            </a>
          </p>
          <p className="mt-2 text-xs text-white/30">
            Technische Probleme und Plattformfragen
          </p>
        </article>
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-white/30">
            ANTWORTZEIT
          </p>
          <p className="mt-3 text-sm text-white/55">
            In der Regel innerhalb von 1–2 Werktagen.
          </p>
        </article>
      </section>
    </CompanyPage>
  );
}
