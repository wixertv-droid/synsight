"use client";

import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const traces = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Alte Accounts",
    description:
      "Vergessene Profile können persönliche Daten länger sichtbar halten als beabsichtigt.",
    risk: "MITTEL",
    color: "text-yellow-400",
    info: "Alte Konten sind Registrierungen, die Sie vielleicht nicht mehr nutzen, aber die weiterhin öffentlich sichtbar sein können.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
    title: "Öffentliche Profile",
    description:
      "Social-Media-Präsenzen, die mehr preisgeben als beabsichtigt.",
    risk: "NIEDRIG",
    color: "text-green-400",
    info: "Öffentliche Profile zeigen Informationen über Sie, die jeder im Internet sehen kann – zum Beispiel Fotos, Beruf oder Wohnort.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Datenlecks",
    description:
      "Hinweise auf kompromittierte E-Mail-Adressen oder Zugangsdaten in bekannten Leaks.",
    risk: "HOCH",
    color: "text-red-400",
    info: guidance.landing.dataLeaks,
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Bilder",
    description:
      "Fotos und visuelle Inhalte, die ohne Ihre Zustimmung verbreitet werden.",
    risk: "MITTEL",
    color: "text-yellow-400",
    info: guidance.landing.reverseImage,
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    title: "Erwähnungen",
    description:
      "Nennungen in Foren, Artikeln und sozialen Netzwerken weltweit.",
    risk: "NIEDRIG",
    color: "text-green-400",
    info: "Erwähnungen sind Stellen im Internet, an denen Ihr Name oder Ihre Angaben auftauchen – zum Beispiel in Foren oder Artikeln.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: "Digitale Fußabdrücke",
    description:
      "Verteilte Signale ergeben zusammen ein überraschend genaues Bild Ihrer Online-Präsenz.",
    risk: "HOCH",
    color: "text-red-400",
    info: guidance.landing.digitalTraces,
  },
];

export default function DigitalTraces() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="traces"
      className="section-shell relative section-padding overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_36%,rgba(41,182,246,.055),transparent_32rem)] pointer-events-none" />
      <div className="absolute left-0 top-28 h-px w-1/3 bg-gradient-to-r from-cyber-blue/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hud-label inline-flex items-center justify-center gap-2">
            04 / Ihre digitale Spur
            <InfoTooltip label="Digitale Spuren">
              {guidance.landing.digitalTraces}
            </InfoTooltip>
          </span>
          <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
            Was online bleibt, sollte{" "}
            <span className="cyber-gradient">nicht unsichtbar bleiben.</span>
          </h2>
          <p className="text-slate-300/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Alte Accounts, öffentliche Profile und Erwähnungen verteilen sich
            über Jahre und Plattformen. SynSight führt sie in einem
            verständlichen Überblick zusammen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {traces.map((trace, index) => (
            <TraceCard key={trace.title} trace={trace} index={index} />
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center text-center">
          <p className="mb-5 max-w-xl text-sm leading-relaxed text-white/40">
            Sie müssen nicht selbst herausfinden, welche Spur relevant ist.
            SynSight priorisiert die Signale für Sie.
          </p>
          <Button
            onClick={() =>
              document
                .getElementById("demo-scanner")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Eigene digitale Spur prüfen
          </Button>
        </div>
      </div>
    </section>
  );
}

function TraceCard({
  trace,
  index,
}: {
  trace: (typeof traces)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <GlassCard className="h-full group min-h-[250px]">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.025] text-cyber-blue group-hover:border-cyber-blue/20 group-hover:bg-cyber-blue/[0.06] transition-colors">
            {trace.icon}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[10px] tracking-wider px-2 py-1 rounded border border-current/20 ${trace.color}`}
            >
              RISIKO: {trace.risk}
            </span>
            <InfoTooltip label={`Risiko ${trace.risk}`}>
              {trace.risk === "HOCH"
                ? "Hohes Risiko bedeutet: Hier sollten Sie zeitnah handeln."
                : trace.risk === "MITTEL"
                  ? "Mittleres Risiko bedeutet: Prüfen Sie, ob Sie etwas ändern möchten."
                  : "Niedriges Risiko bedeutet: Derzeit kein dringender Handlungsbedarf."}
            </InfoTooltip>
          </div>
        </div>
        <h3 className="mb-2 flex items-center gap-2 text-lg font-medium tracking-[-.02em] text-white/90 transition-colors group-hover:text-cyan-100">
          {trace.title}
          <InfoTooltip label={trace.title}>{trace.info}</InfoTooltip>
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          {trace.description}
        </p>

        {/* Scan line effect on hover */}
        <div className="mt-4 h-[1px] bg-gradient-to-r from-transparent via-cyber-blue/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </GlassCard>
    </div>
  );
}
