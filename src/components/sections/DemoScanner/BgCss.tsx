"use client";

import { useEffect, useRef } from "react";

interface BgCssProps {
  onReady?: () => void;
}

/**
 * Ghost/art backdrop via static CSS (public/), not bundled into the JS chunk.
 * Same #art DOM — optics unchanged; load is non-blocking for the main thread.
 */
export default function BgCss({ onReady }: BgCssProps) {
  const notified = useRef(false);

  useEffect(() => {
    const notify = () => {
      if (notified.current) return;
      notified.current = true;
      onReady?.();
    };

    const id = "demo-scanner-ghost-image-css";
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    if (existing) {
      // Stylesheet already present (repeat scan) — ready immediately
      requestAnimationFrame(notify);
      return;
    }

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "/demo-scanner/ghost-image.css";
    link.onload = () => notify();
    link.onerror = () => notify();
    document.head.appendChild(link);

    // Safety: never block the boot curtain forever
    const fallback = window.setTimeout(notify, 2800);
    return () => {
      window.clearTimeout(fallback);
    };
  }, [onReady]);

  return (
    <div className="hidden lg:block absolute inset-0 z-[2] pointer-events-none overflow-hidden">
      {/*
        top-[75%] = Zieht das Bild weiter nach unten, auf Höhe der mittleren Karte
        right-[-2%] = Die Position auf der rechten Seite war perfekt und bleibt so
      */}
      <div className="absolute top-[75%] right-[-2%] -translate-y-1/2 opacity-35 mix-blend-screen blur-[0.6px] scale-[0.65] origin-center">
        <div id="art">
          <div />
        </div>
      </div>
    </div>
  );
}
