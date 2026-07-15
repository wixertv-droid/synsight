import Link from "next/link";

export default function VerificationSuccessPage() {
  return (
    <section className="auth-card glass-strong hardware-panel w-full max-w-[520px] rounded-[1.5rem] border border-emerald-300/15 p-8 text-center shadow-[0_45px_120px_rgba(0,0,0,.48)] sm:p-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/[0.06] text-xl text-emerald-200">
        ✓
      </span>
      <p className="mt-7 font-mono text-[8px] tracking-[.18em] text-emerald-200/55">
        IDENTITY VERIFIED
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white">
        Konto erfolgreich aktiviert.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300/50">
        Ihre E-Mail-Adresse wurde bestätigt. Melden Sie sich jetzt an und
        richten Sie Ihr geschütztes Profil ein.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex rounded-xl border border-cyber-blue/30 bg-cyber-blue/[0.08] px-6 py-3 text-sm text-cyan-100 transition hover:bg-cyber-blue/[0.14]"
      >
        Zum sicheren Login
      </Link>
    </section>
  );
}
