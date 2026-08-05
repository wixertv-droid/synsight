"use client";

import "./ghost-image.css";

export default function BgCss() {
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
