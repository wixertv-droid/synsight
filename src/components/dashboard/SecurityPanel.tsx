import StatusDot from "@/components/ui/StatusDot";

export default function SecurityPanel() {
  return (
    <section className="glass-strong hardware-panel relative overflow-hidden rounded-[1.4rem] border border-cyber-blue/15 p-6 shadow-[0_35px_100px_rgba(0,0,0,.3)] md:p-8">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyber-blue/[0.07] blur-[80px]" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <StatusDot pulse />
            <span className="font-mono text-[9px] tracking-[.18em] text-emerald-100/50">
              SYNSIGHT AI SECURITY STATUS
            </span>
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
            System online.
            <span className="block text-slate-300/45">
              Ihre digitale Identität wird überwacht.
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/35">
            Die letzte Analyse wurde erfolgreich synchronisiert. Drei
            priorisierte Maßnahmen können Ihren Schutzstatus weiter verbessern.
          </p>
          <div className="mt-6 flex flex-wrap gap-5 font-mono text-[8px] tracking-[.13em] text-white/24">
            <span>MONITORING / AKTIV</span>
            <span>LETZTE ANALYSE / HEUTE</span>
            <span>REGION / EU</span>
          </div>
        </div>

        <div className="relative flex h-44 w-44 items-center justify-center justify-self-center lg:h-48 lg:w-48">
          <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
            <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth="8" />
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke="url(#securityScore)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="490"
              strokeDashoffset="108"
            />
            <defs>
              <linearGradient id="securityScore">
                <stop stopColor="#29B6F6" />
                <stop offset="1" stopColor="#70E7FF" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center">
            <span className="font-mono text-4xl font-light tabular-nums text-white">
              78
            </span>
            <span className="text-sm text-white/25"> / 100</span>
            <p className="mt-2 text-[9px] uppercase tracking-[.16em] text-cyber-cyan/50">
              Digitale Sicherheit
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
