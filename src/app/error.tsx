"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SynSight application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-space-black px-6">
      <div className="glass-strong hardware-panel w-full max-w-lg rounded-[1.4rem] border border-rose-300/15 p-8 text-center">
        <span className="hud-label mx-auto">Systemfehler</span>
        <h1 className="mt-5 text-2xl font-semibold text-white">
          Etwas ist unerwartet fehlgeschlagen.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/40">
          Unser System hat einen unerwarteten Fehler erkannt. Sie können es
          erneut versuchen oder zur Startseite zurückkehren.
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-[10px] tracking-wider text-white/20">
            Fehlerreferenz: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Erneut versuchen</Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-6 py-3 text-sm text-white/60 transition-colors hover:text-white"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
