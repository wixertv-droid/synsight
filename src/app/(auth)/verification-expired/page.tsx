import Link from "next/link";

export default function VerificationExpiredPage() {
  return (
    <section className="auth-card glass-strong hardware-panel w-full max-w-[520px] rounded-[1.5rem] border border-amber-300/15 p-8 text-center shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-10">
      <p className="hud-label justify-center">Verification Required</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-.04em] text-white">
        Bestätigungslink abgelaufen.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300/50">
        Aus Sicherheitsgründen sind Links nur 24 Stunden gültig. Öffnen Sie die
        Registrierungsseite erneut oder fordern Sie auf der Bestätigungsseite
        einen neuen Link an.
      </p>
      <Link
        href="/register"
        className="mt-8 inline-flex rounded-xl border border-cyber-blue/30 bg-cyber-blue/[0.08] px-6 py-3 text-sm text-cyan-100"
      >
        Zur Registrierung
      </Link>
    </section>
  );
}
