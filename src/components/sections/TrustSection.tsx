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
    title: "KI Technologie",
    description:
      "Modernste neuronale Netzwerke analysieren Ihre digitale Identität mit höchster Präzision und Geschwindigkeit.",
    stats: "12 KI-Modelle",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Datenschutz",
    description:
      "DSGVO-konform. Ihre Daten werden verschlüsselt verarbeitet und niemals an Dritte weitergegeben.",
    stats: "DSGVO-konform",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Sicherheit",
    description:
      "Ende-zu-Ende-Verschlüsselung, Zero-Trust-Architektur und kontinuierliches Security-Monitoring.",
    stats: "AES-256",
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
      "Vollständige Einblicke in unsere Analysemethoden. Sie wissen immer, was wir finden und warum.",
    stats: "Open Process",
  },
];

export default function TrustSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="trust" className="relative section-padding overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="font-mono text-xs text-cyber-blue/50 tracking-[0.3em] uppercase">
            Vertrauen
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Gebaut auf <span className="cyber-gradient">Vertrauen</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Enterprise-Grade Sicherheit und Transparenz — von Grund auf in
            SynSight verankert.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map((item, index) => (
            <TrustCard key={item.title} item={item} index={index} />
          ))}
        </div>

        {/* Certification bar */}
        <div
          className={`mt-16 glass rounded-xl p-6 flex flex-wrap items-center justify-center gap-8 transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {["ISO 27001", "SOC 2 Type II", "DSGVO", "BSI Grundschutz"].map(
            (cert) => (
              <div key={cert} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyber-cyan/60" />
                <span className="font-mono text-xs text-gray-400 tracking-wider">
                  {cert}
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
      <GlassCard className="text-center h-full group">
        <div className="inline-flex p-4 rounded-2xl bg-cyber-blue/10 text-cyber-blue mb-5 group-hover:shadow-[0_0_25px_rgba(0,191,255,0.2)] transition-shadow">
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
