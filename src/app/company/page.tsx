import type { Metadata } from "next";
import CompanyPage from "@/components/layout/CompanyPage";
import CompanyTimeline from "@/components/company/CompanyTimeline";

export const metadata: Metadata = {
  title: "Über SynSight — Unternehmen",
  description:
    "SynSight – Die Zukunft der digitalen Identitätssicherheit. Vision, Mission und Entwicklungspfad.",
};

const helpPoints = [
  "öffentliche digitale Spuren zu verstehen",
  "Sicherheitsrisiken zu erkennen",
  "Datenlecks aufzudecken",
  "Online-Präsenz besser zu kontrollieren",
  "digitale Identität langfristig zu schützen",
];

export default function CompanyAboutPage() {
  return (
    <CompanyPage
      label="Unternehmen / Über SynSight"
      title="SynSight – Die Zukunft der digitalen Identitätssicherheit"
      subtitle="Eine intelligente Plattform zur Analyse, Transparenz und zum Schutz Ihrer digitalen Spuren."
      maxWidthClassName="max-w-5xl"
    >
      <section aria-labelledby="company-profile-heading">
        <div className="glass hardware-panel rounded-[1.4rem] border border-cyber-blue/15 p-6 md:p-10">
          <span className="hud-label">Unternehmensprofil</span>
          <h2
            id="company-profile-heading"
            className="mt-4 text-2xl font-semibold tracking-[-.03em] text-white md:text-3xl"
          >
            SynSight analysiert digitale Identitäten.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/40 md:text-base">
            Wir helfen Menschen und Unternehmen dabei, Orientierung in einer
            Welt zu finden, in der öffentliche Daten, Profile und Signale
            ständig wachsen — und oft unsichtbar bleiben.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {helpPoints.map((point, index) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <span className="mt-0.5 font-mono text-[9px] tracking-[.14em] text-cyber-cyan/55">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-white/55">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="company-vision-heading">
        <div className="relative overflow-hidden rounded-[1.4rem] border border-cyber-cyan/15 bg-gradient-to-br from-cyber-blue/[0.08] via-transparent to-cyber-cyan/[0.04] p-6 md:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyber-cyan/[0.08] blur-[70px]"
          />
          <span className="hud-label">Vision</span>
          <h2 id="company-vision-heading" className="sr-only">
            Vision
          </h2>
          <blockquote className="relative mt-5 max-w-3xl text-xl font-light leading-relaxed tracking-[-.02em] text-white/80 md:text-2xl">
            „Das Internet vergisst nichts.
            <span className="mt-4 block text-white/45">
              SynSight schafft Transparenz darüber, welche Informationen
              öffentlich sichtbar sind und wie Menschen ihre digitale Identität
              schützen können.“
            </span>
          </blockquote>
        </div>
      </section>

      <CompanyTimeline />
    </CompanyPage>
  );
}
