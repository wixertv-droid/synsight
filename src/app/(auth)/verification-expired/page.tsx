import Link from "next/link";

export default function VerificationExpiredPage() {
  return (
    <section className="auth-card glass-strong hardware-panel w-full max-w-[520px] rounded-[1.5rem] border border-amber-300/15 p-8 text-center shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-10">
      <p className="font-mono text-[8px] tracking-[.18em] text-amber-200/55">
        LINK ABGELAUFEN
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white">
        Bestätigungslink ungültig
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300/50">
        Der Link ist abgelaufen, ungültig oder wurde bereits verwendet. Fordern
        Sie eine neue Bestätigungs-E-Mail an und versuchen Sie es erneut.
      </p>
      <Link
        href="/verify-email"
        className="mt-8 inline-flex rounded-xl border border-cyber-blue/30 bg-cyber-blue/[0.08] px-6 py-3 text-sm text-cyan-100 transition hover:bg-cyber-blue/[0.14]"
      >
        Neue E-Mail anfordern
      </Link>
      <Link
        href="/login"
        className="mt-3 inline-flex w-full justify-center text-xs text-white/35 transition hover:text-white/60"
      >
        Zum Login
      </Link>
    </section>
  );
}
