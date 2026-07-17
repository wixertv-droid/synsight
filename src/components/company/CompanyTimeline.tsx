"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const phases = [
  {
    phase: "01",
    title: "Die Idee",
    text: "Die digitale Welt wächst. Mit ihr entstehen neue Herausforderungen für persönliche Identität.",
  },
  {
    phase: "02",
    title: "Die Technologie",
    text: "Moderne KI-Systeme ermöglichen neue Wege, digitale Informationen intelligent zu analysieren.",
  },
  {
    phase: "03",
    title: "Die Plattform",
    text: "SynSight verbindet Analyse, Sicherheit und Benutzerfreundlichkeit.",
  },
  {
    phase: "04",
    title: "Die Zukunft",
    text: "Die nächste Generation digitaler Identitätssicherheit.",
  },
];

function TimelinePhase({
  phase,
  title,
  text,
  index,
}: {
  phase: string;
  title: string;
  text: string;
  index: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({
    threshold: 0.2,
  });

  return (
    <article
      ref={ref}
      className={`company-timeline-item relative pl-14 transition-all duration-700 md:pl-20 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <span
        aria-hidden="true"
        className={`company-timeline-node absolute left-[7px] top-2 h-3.5 w-3.5 rounded-full border border-cyber-cyan/50 bg-[#07111e] shadow-[0_0_18px_rgba(112,231,255,.45)] md:left-[11px] ${
          isVisible ? "scale-100" : "scale-50"
        }`}
      />
      <div className="glass hardware-panel group rounded-2xl border border-white/[0.07] p-5 transition duration-500 hover:border-cyber-cyan/25 md:p-6">
        <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/55">
          PHASE {phase}
        </p>
        <h3 className="mt-3 text-xl font-medium tracking-[-.02em] text-white/90">
          {title}
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
          {text}
        </p>
      </div>
    </article>
  );
}

export default function CompanyTimeline() {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({
    threshold: 0.1,
  });

  return (
    <section ref={ref} aria-labelledby="vision-timeline-heading">
      <div className="mb-10 max-w-2xl">
        <span className="hud-label">Vision Path</span>
        <h2
          id="vision-timeline-heading"
          className="mt-4 text-3xl font-semibold tracking-[-.03em] text-white md:text-4xl"
        >
          Die Entwicklung der SynSight Vision
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/35">
          Keine Firmenchronik — eine Orientierung entlang der Idee, Technologie
          und Zukunft von digitaler Identitätssicherheit.
        </p>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className={`company-timeline-rail absolute bottom-4 left-[13px] top-4 w-px md:left-[17px] ${
            isVisible ? "opacity-100" : "opacity-40"
          }`}
        />
        <div className="space-y-8">
          {phases.map((entry, index) => (
            <TimelinePhase key={entry.phase} index={index} {...entry} />
          ))}
        </div>
      </div>
    </section>
  );
}
