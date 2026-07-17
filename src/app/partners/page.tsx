import type { Metadata } from "next";
import CompanyPage from "@/components/layout/CompanyPage";
import PartnerForm from "@/components/company/PartnerForm";

export const metadata: Metadata = {
  title: "Partnerschaften — SynSight",
  description:
    "Gemeinsam digitale Sicherheit neu definieren — Technologiepartner, Integrationen und Kooperationen.",
};

const areas = [
  {
    title: "Technologiepartner",
    text: "Gemeinsame Entwicklung und Plattform-Integrationen für Identitätsanalyse und Sicherheit.",
  },
  {
    title: "Unternehmen",
    text: "Strategische Zusammenarbeit für Organisationen, die digitale Transparenz skalieren wollen.",
  },
  {
    title: "Integrationen",
    text: "Anbindung an bestehende Security-, Compliance- und Identity-Workflows.",
  },
  {
    title: "Kooperationen",
    text: "Forschung, Content und gemeinsame Initiativen rund um digitale Identität.",
  },
];

export default function PartnersPage() {
  return (
    <CompanyPage
      label="Unternehmen / Partnerschaften"
      title="Gemeinsam digitale Sicherheit neu definieren"
      subtitle="Wir suchen Partner, die Transparenz, Technologie und Vertrauen in der digitalen Welt voranbringen."
      maxWidthClassName="max-w-5xl"
    >
      <section aria-labelledby="partner-areas-heading">
        <h2
          id="partner-areas-heading"
          className="text-xl font-medium tracking-[-.02em] text-white/85"
        >
          Partnerschaftsbereiche
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {areas.map((area, index) => (
            <article
              key={area.title}
              className="glass hardware-panel rounded-2xl border border-white/[0.07] p-5 transition hover:border-cyber-cyan/20"
            >
              <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/50">
                AREA / {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-lg text-white/85">{area.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/40">
                {area.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="partner-form-heading" className="max-w-3xl">
        <div className="mb-8">
          <h2
            id="partner-form-heading"
            className="text-xl font-medium tracking-[-.02em] text-white/85"
          >
            Partnerschaft anfragen
          </h2>
          <p className="mt-2 text-sm text-white/35">
            Beschreiben Sie kurz Ihr Unternehmen und die gewünschte Form der
            Zusammenarbeit.
          </p>
        </div>
        <PartnerForm />
      </section>
    </CompanyPage>
  );
}
