import type { Metadata } from "next";
import CompanyPage from "@/components/layout/CompanyPage";
import PressForm from "@/components/company/PressForm";

export const metadata: Metadata = {
  title: "Presse — SynSight",
  description:
    "Pressebereich von SynSight — Medienkontakt, Presseanfragen und Materialien.",
};

export default function PressPage() {
  return (
    <CompanyPage
      label="Unternehmen / Presse"
      title="Presse & Medien"
      subtitle="Professioneller Ansprechpunkt für Redaktionen, Podcasts und Fachmedien."
      maxWidthClassName="max-w-5xl"
    >
      <section
        aria-labelledby="press-overview-heading"
        className="grid gap-4 lg:grid-cols-3"
      >
        <article className="glass hardware-panel rounded-2xl border border-white/[0.07] p-5 lg:col-span-1">
          <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
            ÜBER SYNSIGHT
          </p>
          <h2
            id="press-overview-heading"
            className="mt-3 text-lg text-white/85"
          >
            Kurzprofil
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/40">
            SynSight ist eine KI-gestützte Plattform für Transparenz und Schutz
            digitaler Identitäten — entwickelt mit Fokus auf Nachvollziehbarkeit
            und europäische Datenschutzprinzipien.
          </p>
        </article>
        <article className="glass hardware-panel rounded-2xl border border-white/[0.07] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
            MEDIENKONTAKT
          </p>
          <h3 className="mt-3 text-lg text-white/85">Direkt</h3>
          <p className="mt-3 text-sm text-white/45">
            <a
              href="mailto:press@synsight.de"
              className="text-cyber-cyan/80 transition hover:text-cyber-cyan"
            >
              press@synsight.de
            </a>
          </p>
        </article>
        <article className="glass hardware-panel rounded-2xl border border-white/[0.07] p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-cyber-cyan/50">
            DOWNLOADS
          </p>
          <h3 className="mt-3 text-lg text-white/85">Medienkit</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/40">
            Logos, Screenshots und Pressetexte werden vorbereitet und hier
            freigeschaltet.
          </p>
          <span className="mt-4 inline-flex rounded border border-white/10 px-2 py-1 font-mono text-[8px] tracking-[.12em] text-white/28">
            IN VORBEREITUNG
          </span>
        </article>
      </section>

      <section aria-labelledby="press-form-heading" className="max-w-3xl">
        <div className="mb-8">
          <h2
            id="press-form-heading"
            className="text-xl font-medium tracking-[-.02em] text-white/85"
          >
            Presseanfrage
          </h2>
          <p className="mt-2 text-sm text-white/35">
            Für Interviews, Statements, Hintergrundgespräche und
            Produktinformationen.
          </p>
        </div>
        <PressForm />
      </section>
    </CompanyPage>
  );
}
