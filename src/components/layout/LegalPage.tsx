import { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  label: string;
  children: ReactNode;
}

export default function LegalPage({
  title,
  label,
  children,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-space-black px-6 py-16 text-slate-200 md:px-12">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[.18em] text-cyber-blue/65 transition-colors hover:text-cyber-cyan"
        >
          <span aria-hidden="true">←</span> ZURÜCK ZU SYNSIGHT
        </a>
        <div className="mt-14 border-b border-white/[0.07] pb-10">
          <span className="hud-label">{label}</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] text-white md:text-6xl">
            {title}
          </h1>
        </div>
        <div className="prose prose-invert mt-10 max-w-none space-y-7 text-sm leading-7 text-slate-300/65">
          {children}
        </div>
      </div>
    </main>
  );
}
