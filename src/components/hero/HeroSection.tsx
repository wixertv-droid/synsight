"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

/**
 * three-globe touches `window` during module evaluation and must never
 * run under SSR. Keep this `dynamic(..., { ssr: false })` import here —
 * not a static import of CyberGlobe.
 */
const CyberGlobe = dynamic(
  () => import("@/components/hero/CyberGlobe").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_73%_45%,rgba(41,182,246,.09),transparent_24rem)]"
        aria-hidden="true"
      />
    ),
  }
);

export default function HeroSection() {
  const { ref, isVisible } = useScrollAnimation();
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const updateParallax = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!visualRef.current) return;
        const offset = Math.min(window.scrollY, window.innerHeight);
        visualRef.current.style.transform = `translate3d(0, ${offset * 0.11}px, 0) scale(${1 + offset * 0.00004})`;
      });
    };
    window.addEventListener("scroll", updateParallax, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateParallax);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative min-h-[100svh] flex items-center overflow-hidden border-b border-white/[0.05]"
    >
      <div
        ref={visualRef}
        className="absolute inset-0 will-change-transform"
      >
        <CyberGlobe />
      </div>

      <div className="hero-atmosphere absolute inset-0 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent_82%)] pointer-events-none" />
      <div className="hero-scanline absolute inset-x-0 top-0 h-28 pointer-events-none" />

      {/* Precision frame */}
      <div className="pointer-events-none absolute inset-x-6 top-24 bottom-16 hidden border-x border-white/[0.045] md:block lg:inset-x-12">
        <span className="absolute -left-px top-0 h-8 w-px bg-cyber-cyan/40" />
        <span className="absolute -right-px bottom-0 h-8 w-px bg-cyber-cyan/30" />
      </div>
      <div className="absolute top-24 left-6 right-6 hidden items-center justify-between font-mono text-[9px] tracking-[.18em] text-white/25 md:flex lg:left-12 lg:right-12">
        <span>48.1372° N / 11.5756° E</span>
        <span className="flex items-center gap-2">
          <i className="h-1.5 w-1.5 rounded-full bg-cyan-300/70 shadow-[0_0_10px_rgba(112,231,255,.5)]" />
          GESCHÜTZTE VERBINDUNG / TLS 1.3
        </span>
      </div>

      {/* Holographic readouts around the globe */}
      <div className="float-module glass hardware-panel absolute right-[7%] top-[23%] hidden w-48 rounded-xl p-4 lg:block">
        <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-white/35">
          <span>IDENTITÄTSFLÄCHE</span>
          <span className="text-cyber-cyan/70">AKTIV</span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <span className="text-2xl font-light tabular-nums text-white">360°</span>
            <span className="mt-1 block font-mono text-[7px] tracking-[.12em] text-cyber-cyan/35">
              GLOBAL DATA MESH
            </span>
          </div>
          <svg viewBox="0 0 76 28" className="h-7 w-20 text-cyber-cyan/70">
            <path d="M1 24L12 18L22 20L31 7L42 14L53 9L64 12L75 2" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M1 24L12 18L22 20L31 7L42 14L53 9L64 12L75 2V28H1Z" fill="url(#heroChart)" opacity=".12" />
            <defs><linearGradient id="heroChart" x1="0" y1="0" x2="0" y2="1"><stop stopColor="currentColor" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
          </svg>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-cyber-cyan/35 to-transparent" />
          <span className="font-mono text-[6px] tracking-widest text-white/20">
            DATA FLOW / LIVE
          </span>
        </div>
      </div>

      <div
        className="float-module glass hardware-panel absolute bottom-[23%] right-[23%] hidden w-40 rounded-xl p-3 xl:block"
        style={{ animationDelay: "-3s" }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300/40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300/80" />
          </span>
          <span className="font-mono text-[9px] tracking-widest text-white/45">
            KI-ANALYSE AKTIV
          </span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1">
          {[38, 72, 54, 86, 64].map((height, index) => (
            <span key={index} className="flex h-7 items-end">
              <i
                className="block w-full rounded-[1px] bg-gradient-to-t from-cyber-blue/15 to-cyber-cyan/65"
                style={{ height: `${height}%` }}
              />
            </span>
          ))}
        </div>
      </div>

      <div
        ref={ref}
        className={`relative z-10 w-full max-w-7xl mx-auto px-6 pb-24 pt-28 sm:pb-32 sm:pt-36 md:px-12 lg:px-20 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="hud-label mb-8">
          Digitale Identität / KI-Analyse
        </div>

        <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          Sehen Sie, was das Internet
          <span className="mt-2 block cyber-gradient glow-text">
            über Sie weiß.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-slate-300/70 md:text-lg">
          SynSight findet öffentliche Profile, Datenlecks und digitale Spuren.
          Sie erfahren, was kritisch ist — und welche Schritte Ihre Identität
          wirksam schützen.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Button size="lg" onClick={() => scrollTo("demo-scanner")}>
            Kostenlosen Risiko-Check starten
            <svg viewBox="0 0 20 20" fill="none" className="ml-3 h-4 w-4" aria-hidden="true">
              <path d="M4 10h12m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => scrollTo("technology")}
          >
            So funktioniert SynSight
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-white/35">
          {["Keine Registrierung", "Unverbindliche Demo", "Privacy by Design"].map(
            (item) => (
              <span key={item} className="flex items-center gap-2">
                <i className="h-1 w-1 rounded-full bg-cyber-cyan/70" />
                {item}
              </span>
            )
          )}
        </div>

        {/* Mission telemetry */}
        <div className="mt-12 grid max-w-3xl grid-cols-2 overflow-hidden rounded-xl border border-white/[0.07] bg-black/20 backdrop-blur-md sm:mt-16 md:grid-cols-4">
          {[
            { label: "Erst-Check", value: "Sekunden" },
            { label: "Quellen", value: "Profile + Leaks" },
            { label: "Auswertung", value: "Priorisiert" },
            { label: "Datenprinzip", value: "EU" },
          ].map((stat) => (
            <div key={stat.label} className="border-white/[0.06] p-4 first:border-0 odd:border-r md:border-l md:odd:border-r-0">
              <p className="font-mono text-lg font-medium tabular-nums text-cyan-100/90">
                {stat.value}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/30">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 font-mono text-[9px] tracking-[.2em] text-white/25">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/20" />
        SYSTEM ERKUNDEN
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/20" />
      </div>
    </section>
  );
}
