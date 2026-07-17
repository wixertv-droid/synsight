"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { ChangelogRelease } from "@/lib/content/changelog";
import {
  getReleaseCategoryLabel,
  getReleaseStatusLabel,
} from "@/lib/content/changelog";

export default function ChangelogTimeline({
  releases,
}: {
  releases: ChangelogRelease[];
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.08,
  });

  return (
    <div ref={ref} className="relative">
      <div
        aria-hidden="true"
        className={`company-timeline-rail absolute bottom-4 left-[13px] top-4 w-px md:left-[17px] ${
          isVisible ? "opacity-100" : "opacity-40"
        }`}
      />
      <div className="space-y-8">
        {releases.map((release, index) => (
          <ChangelogCard key={release.id} release={release} index={index} />
        ))}
      </div>
    </div>
  );
}

function ChangelogCard({
  release,
  index,
}: {
  release: ChangelogRelease;
  index: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({
    threshold: 0.18,
  });

  const statusTone =
    release.status === "published"
      ? "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100/70"
      : release.status === "planned"
        ? "border-cyber-cyan/20 bg-cyber-cyan/[0.05] text-cyber-cyan/75"
        : "border-white/10 bg-white/[0.03] text-white/40";

  return (
    <article
      ref={ref}
      className={`relative pl-14 transition-all duration-700 md:pl-20 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <span
        aria-hidden="true"
        className={`company-timeline-node absolute left-[7px] top-3 h-3.5 w-3.5 rounded-full border border-cyber-cyan/50 bg-[#07111e] shadow-[0_0_18px_rgba(112,231,255,.45)] md:left-[11px] ${
          isVisible ? "scale-100" : "scale-50"
        }`}
      />
      <div className="glass hardware-panel rounded-2xl border border-white/[0.07] p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-[.16em] text-cyber-cyan/70">
            {release.version}
          </span>
          <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[8px] tracking-[.12em] text-white/35">
            {getReleaseCategoryLabel(release.category)}
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[8px] tracking-[.12em] ${statusTone}`}
          >
            {getReleaseStatusLabel(release.status)}
          </span>
        </div>
        <p className="mt-3 font-mono text-[9px] tracking-[.14em] text-white/30">
          {release.dateLabel.toUpperCase()}
        </p>
        <h3 className="mt-3 text-xl font-medium tracking-[-.02em] text-white/90">
          {release.title}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/40">
          {release.description}
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {release.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm text-white/55"
            >
              <span className="mt-0.5 text-cyber-cyan/70" aria-hidden="true">
                ✓
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
