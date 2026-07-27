"use client";

import { useEffect, useState } from "react";
import type { ReverseImageLiveScanEntry } from "@/lib/analysis/reverse-image/serp-checkpoint";
import type { ReverseImageHit } from "@/lib/analysis/reverse-image/types";

export default function ReverseImageLiveScanPanel({
  scanId,
  currentImageUrl,
  currentTitle,
  recent,
  liveHits,
  scanning,
}: {
  scanId: number;
  currentImageUrl: string | null;
  currentTitle: string | null;
  recent: ReverseImageLiveScanEntry[];
  liveHits: ReverseImageHit[];
  scanning: boolean;
}) {
  const [scanPhase, setScanPhase] = useState(0);

  useEffect(() => {
    if (!scanning || !currentImageUrl) return;
    setScanPhase(0);
    const timer = window.setInterval(() => {
      setScanPhase((value) => (value >= 100 ? 0 : value + 4));
    }, 40);
    return () => window.clearInterval(timer);
  }, [currentImageUrl, scanning]);

  const lastResult = recent.at(-1);
  const frameTone =
    currentImageUrl && scanning
      ? "border-sky-400/40"
      : lastResult?.match
        ? "border-emerald-400/50"
        : lastResult
          ? "border-rose-400/40"
          : "border-white/10";

  return (
    <div className="space-y-4">
      <p className="font-mono text-[8px] tracking-[.14em] text-white/35">
        LIVE BILDSCAN · INSIGHTFACE
      </p>

      <div
        className={`relative overflow-hidden rounded-lg border bg-[#05080e] ${frameTone}`}
      >
        {currentImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImageUrl}
              alt={currentTitle ?? "Kandidat"}
              className="block h-[220px] w-full object-cover object-top"
              referrerPolicy="no-referrer"
            />
            {scanning ? (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(56,189,248,0.8)]"
                  style={{ top: `${scanPhase}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-cyan-400/15 to-transparent"
                  style={{ top: `calc(${scanPhase}% - 2rem)` }}
                />
              </>
            ) : null}
            <div className="absolute bottom-2 left-2 right-2 truncate rounded-md border border-white/10 bg-black/70 px-2 py-1 font-mono text-[9px] text-white/70">
              {currentTitle ?? "Kandidat"}
            </div>
          </>
        ) : (
          <div className="flex h-[220px] items-center justify-center px-4 text-center font-mono text-[10px] text-white/30">
            {scanning ? "Warte auf nächsten Kandidaten…" : "Kein aktives Bild"}
          </div>
        )}
      </div>

      <div className="max-h-[120px] space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] bg-[#04070c] p-2">
        {recent.length === 0 ? (
          <p className="font-mono text-[9px] text-white/25">
            Noch keine Scans…
          </p>
        ) : (
          recent
            .slice()
            .reverse()
            .slice(0, 8)
            .map((entry) => (
              <div
                key={`${entry.imageUrl}-${entry.at}`}
                className={`flex items-center gap-2 rounded px-2 py-1 font-mono text-[9px] ${
                  entry.match
                    ? "bg-emerald-400/[0.08] text-emerald-200/80"
                    : "bg-rose-400/[0.06] text-rose-200/70"
                }`}
              >
                <span>{entry.match ? "✓ TREFFER" : "✗ KEIN TREFFER"}</span>
                <span className="truncate opacity-70">{entry.title}</span>
                {entry.similarity != null ? (
                  <span className="ml-auto shrink-0">
                    {Math.round(entry.similarity * 100)}%
                  </span>
                ) : null}
              </div>
            ))
        )}
      </div>

      {liveHits.length > 0 ? (
        <div>
          <p className="mb-2 font-mono text-[8px] tracking-[.12em] text-emerald-300/70">
            GESPEICHERTE TREFFER · {liveHits.length}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {liveHits.slice(0, 6).map((hit) => (
              <div
                key={hit.id}
                className="overflow-hidden rounded-md border border-emerald-400/25 bg-emerald-400/[0.04]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/analysis/reverse-image/hits/${hit.id}/image?scanId=${scanId}&thumb=1`}
                  alt={hit.title}
                  className="h-16 w-full object-cover"
                />
                <p className="truncate px-1 py-0.5 font-mono text-[7px] text-emerald-200/70">
                  {Math.round(hit.similarity * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
