"use client";

import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const traces = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Alte Accounts",
    description: "Vergessene Profile auf Plattformen, die Sie längst nicht mehr nutzen.",
    risk: "MITTEL",
    color: "text-yellow-400",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
    title: "Öffentliche Profile",
    description: "Social-Media-Präsenzen, die mehr preisgeben als beabsichtigt.",
    risk: "NIEDRIG",
    color: "text-green-400",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Datenlecks",
    description: "Kompromittierte Passwörter und E-Mail-Adressen in Darknet-Datenbanken.",
    risk: "HOCH",
    color: "text-red-400",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Bilder",
    description: "Fotos und visuelle Inhalte, die ohne Ihre Zustimmung verbreitet werden.",
    risk: "MITTEL",
    color: "text-yellow-400",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    title: "Erwähnungen",
    description: "Nennungen in Foren, Artikeln und sozialen Netzwerken weltweit.",
    risk: "NIEDRIG",
    color: "text-green-400",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: "Digitale Fußabdrücke",
    description: "Die Gesamtheit Ihrer Online-Aktivitäten — jeder Klick hinterlässt Spuren.",
    risk: "HOCH",
    color: "text-red-400",
  },
];

export default function DigitalTraces() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="traces" className="section-shell relative section-padding overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_36%,rgba(41,182,246,.055),transparent_32rem)] pointer-events-none" />
      <div className="absolute left-0 top-28 h-px w-1/3 bg-gradient-to-r from-cyber-blue/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hud-label">
            02 / Digitale Spuren
          </span>
          <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
            Jeder Mensch hinterlässt{" "}
            <span className="cyber-gradient">digitale Spuren</span>
          </h2>
          <p className="text-slate-300/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Jede Anmeldung, jedes Foto, jeder Kommentar — alles wird gespeichert,
            indexiert und ist potenziell für immer abrufbar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {traces.map((trace, index) => (
            <TraceCard key={trace.title} trace={trace} index={index} />
          ))}
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
          <span
            className={`font-mono text-[10px] tracking-wider px-2 py-1 rounded border border-current/20 ${trace.color}`}
          >
            RISIKO: {trace.risk}
          </span>
        </div>
        <h3 className="text-lg font-medium tracking-[-.02em] mb-2 text-white/90 group-hover:text-cyan-100 transition-colors">
          {trace.title}
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
