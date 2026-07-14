import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-space-black px-6">
      <div className="glass-strong hardware-panel w-full max-w-lg rounded-[1.4rem] border border-white/10 p-8 text-center">
        <span className="hud-label mx-auto">Fehler 404</span>
        <h1 className="mt-5 text-2xl font-semibold text-white">
          Diese Seite existiert nicht.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/40">
          Der angeforderte Bereich wurde nicht gefunden oder ist nicht mehr
          verfügbar.
        </p>
        <div className="mt-7 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] px-6 py-3 text-sm font-medium text-[#021019] transition-all hover:brightness-110"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
