"use client";

import Button from "@/components/ui/Button";
import DataWorld from "@/components/hero/DataWorld";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function HeroSection() {
  const { ref, isVisible } = useScrollAnimation();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      <DataWorld />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-space-black/40 via-transparent to-space-black pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-space-black/80 via-transparent to-space-black/60 pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />

      <div
        ref={ref}
        className={`relative z-10 section-padding w-full max-w-7xl mx-auto transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-xs font-mono text-cyber-blue/70">
          <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
          SYSTEM ONLINE — DIGITAL IDENTITY PROTECTION ACTIVE
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          Willkommen bei{" "}
          <span className="cyber-gradient glow-text">SynSight</span>
        </h1>

        <p className="text-lg md:text-xl text-cyber-blue/80 mb-4 max-w-2xl font-light">
          Die intelligente Plattform zum Schutz Ihrer digitalen Identität.
        </p>

        <p className="text-base md:text-lg text-gray-400 mb-10 max-w-xl leading-relaxed">
          Das Internet vergisst nichts.
          <br />
          SynSight analysiert digitale Spuren, erkennt Risiken und hilft Ihnen,
          die Kontrolle über Ihre Online-Präsenz zurückzugewinnen.
        </p>

        <div className="flex flex-wrap gap-4">
          <Button size="lg" onClick={() => scrollTo("demo-scanner")}>
            Analyse starten
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => scrollTo("technology")}
          >
            Technologie entdecken
          </Button>
        </div>

        {/* HUD stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
          {[
            { label: "Datenquellen", value: "2.4M+" },
            { label: "KI-Modelle", value: "12" },
            { label: "Scan-Geschw.", value: "<3s" },
            { label: "Schutzlevel", value: "99.7%" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-lg p-3 text-center">
              <p className="text-lg md:text-xl font-bold text-cyber-cyan font-mono">
                {stat.value}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-[10px] font-mono text-cyber-blue/40 tracking-widest">
          SCROLL
        </span>
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-cyber-blue/40">
          <path
            d="M10 14L5 9h10z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
