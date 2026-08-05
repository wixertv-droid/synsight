"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[synsight-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-space-black px-6 text-center text-white">
      <p className="font-mono text-[11px] tracking-[0.28em] text-amber-300/80">
        HTTP 500
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Etwas ist schiefgelaufen
      </h1>
      <p className="mt-4 max-w-md text-sm text-white/50">
        Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder
        kehren Sie zur Startseite zurück.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-cyber-blue/30 bg-cyber-blue/10 px-4 py-2 text-sm text-cyan-100"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70"
        >
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
