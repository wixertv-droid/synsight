"use client";

import GlassCard from "@/components/ui/GlassCard";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { guidance } from "@/lib/content/guidance";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-8 h-8"
      >
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Digitale Identität",
    description:
      "Welche Profile, Daten und Bilder zu Ihnen öffentlich auffindbar sind.",
    metric: "Identitätsbild",
    info: "Digitale Spuren sind Informationen, die im Internet über eine Person entstehen können. Dazu gehören öffentliche Profile, alte Konten, Bilder, Webseiten oder Erwähnungen.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-8 h-8"
      >
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Datenlecks",
    description:
      "Ob Ihre E-Mail-Adresse oder Zugangsdaten in bekannten Leaks auftauchen.",
    metric: "Leak-Abgleich",
    info: guidance.landing.dataLeaks,
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-8 h-8"
      >
        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: "Online Reputation",
    description:
      "Wie Sie online wahrgenommen werden und welche Signale Aufmerksamkeit benötigen.",
    metric: "Reputation",
    info: "Ihre Online-Reputation beschreibt, wie Sie im Internet wahrgenommen werden – zum Beispiel durch Bewertungen, Erwähnungen oder sichtbare Profile.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-8 h-8"
      >
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "KI Schutzanalyse",
    description:
      "Konkrete nächste Schritte, priorisiert nach Risiko statt nach Technik.",
    metric: "Schutzplan",
    info: guidance.landing.aiAnalysis,
  },
];

export default function WhatSynSightRecognizes() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="technology"
      className="section-shell relative section-padding overflow-hidden"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyber-blue/[0.045] rounded-full blur-[140px] pointer-events-none" />
      <div className="telemetry-marquee absolute top-14 left-0 flex w-[200%] gap-12 overflow-hidden whitespace-nowrap font-mono text-[9px] tracking-[.22em] text-white/[0.08]">
        {[0, 1].map((group) => (
          <span key={group}>
            SIGNALE VERBINDEN&nbsp;&nbsp;•&nbsp;&nbsp;IDENTITÄT
            ZUORDNEN&nbsp;&nbsp;•&nbsp;&nbsp;RISIKEN
            VERSTEHEN&nbsp;&nbsp;•&nbsp;&nbsp;SCHUTZ
            PRIORISIEREN&nbsp;&nbsp;•&nbsp;&nbsp;
          </span>
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hud-label inline-flex items-center justify-center gap-2">
            05 / Was SynSight erkennt
            <InfoTooltip label="KI Analyse">
              {guidance.landing.aiAnalysis}
            </InfoTooltip>
          </span>
          <h2 className="text-balance text-4xl md:text-6xl font-semibold tracking-[-.045em] leading-[1.02] mt-5 mb-7">
            Transparenz für Ihre{" "}
            <span className="cyber-gradient">digitale Identität.</span>
          </h2>
          <p className="text-slate-300/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Moderne KI-Modelle ordnen relevante öffentliche Signale ein und
            übersetzen technische Funde in verständliche Entscheidungen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <GlassCard className="group relative overflow-hidden min-h-[180px]">
        {/* Background glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-blue/0 to-cyber-cyan/0 group-hover:from-cyber-blue/5 group-hover:to-cyber-cyan/5 transition-all duration-500" />

        <div className="relative flex gap-5">
          <div className="flex-shrink-0 p-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-cyber-blue/[0.08] to-white/[0.015] text-cyber-blue group-hover:border-cyber-blue/20 transition-colors">
            {feature.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="flex items-center gap-2 text-xl font-medium tracking-[-.025em] text-white/90 transition-colors group-hover:text-cyan-100">
                {feature.title}
                <InfoTooltip label={feature.title}>{feature.info}</InfoTooltip>
              </h3>
              <span className="font-mono text-[10px] text-cyber-blue/50 px-2 py-0.5 rounded border border-cyber-blue/20">
                {feature.metric}
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-[1px] h-8 bg-gradient-to-b from-cyber-blue/40 to-transparent" />
          <div className="absolute top-0 right-0 w-8 h-[1px] bg-gradient-to-l from-cyber-blue/40 to-transparent" />
        </div>
      </GlassCard>
    </div>
  );
}
