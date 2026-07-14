"use client";

import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const trustItems = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Nachvollziehbare KI",
    description:
      "Moderne KI-Modelle strukturieren Signale, ohne die Entscheidung vor Ihnen zu verbergen.",
    stats: "Erklärbare Ergebnisse",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Datenschutz",
    description:
      "Datensparsame Produktentwicklung und verschlüsselte Übertragung sind Teil der Architektur.",
    stats: "Privacy by Design",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Sicherheit",
    description:
      "Zugriffe und Datenflüsse werden nach dem Zero-Trust-Prinzip konzipiert und klar getrennt.",
    stats: "Zero Trust",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Transparenz",
    description:
      "Sie sehen, was gefunden wurde, warum es relevant ist und welche Maßnahme empfohlen wird.",
    stats: "Klare Empfehlungen",
  },
];

export default function TrustSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="trust" className="section-shell relative section-padding overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hud-label">
            06 / Vertrauen & Sicherheit
          </span>
          <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
            Sicherheit beginnt mit{" "}
            <span className="cyber-gradient">Transparenz.</span>
          </h2>
          <p className="text-slate-300/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Eine Plattform für digitale Identität muss nachvollziehbar,
            datensparsam und verantwortungsvoll sein. Daran messen wir jede
            Produktentscheidung.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map((item, index) => (
            <TrustCard key={item.title} item={item} index={index} />
          ))}
        </div>

        {/* Security principles */}
        <div
          className={`mt-16 glass hardware-panel rounded-xl p-6 flex flex-wrap items-center justify-center gap-8 transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {["Privacy by Design", "EU-Datenprinzip", "Zero-Trust-Architektur", "Nachvollziehbare Analyse"].map(
            (principle) => (
              <div key={principle} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyber-cyan/60" />
                <span className="font-mono text-xs text-gray-400 tracking-wider">
                  {principle}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function TrustCard({
  item,
  index,
}: {
  item: (typeof trustItems)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <GlassCard className="text-center h-full group min-h-[290px]">
        <div className="inline-flex p-4 rounded-2xl border border-white/[0.06] bg-cyber-blue/[0.07] text-cyber-blue mb-5 group-hover:border-cyber-blue/20 transition-colors">
          {item.icon}
        </div>
        <h3 className="text-lg font-semibold mb-3 text-white">
          {item.title}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          {item.description}
        </p>
        <span className="inline-block font-mono text-[10px] text-cyber-blue/60 tracking-wider px-3 py-1 rounded-full border border-cyber-blue/15">
          {item.stats}
        </span>
      </GlassCard>
    </div>
  );
}
