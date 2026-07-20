"use client";

import { useEffect, useState } from "react";
import type { SupportAvailabilityStatus } from "@/lib/services/support-status-service";

const toneStyles = {
  green: {
    dot: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.65)]",
    border: "border-emerald-300/25 bg-emerald-300/[0.05]",
    text: "text-emerald-100/80",
  },
  orange: {
    dot: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.55)]",
    border: "border-amber-300/25 bg-amber-300/[0.05]",
    text: "text-amber-100/80",
  },
  red: {
    dot: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.55)]",
    border: "border-rose-400/25 bg-rose-400/[0.05]",
    text: "text-rose-100/80",
  },
} as const;

export default function SupportStatusIndicator({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [status, setStatus] = useState<SupportAvailabilityStatus | null>(null);

  useEffect(() => {
    fetch("/api/support/status")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setStatus(body.data.status);
      })
      .catch(() => undefined);
    const timer = window.setInterval(() => {
      fetch("/api/support/status")
        .then((r) => r.json())
        .then((body) => {
          if (body.success) setStatus(body.data.status);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!status) {
    return (
      <div className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/35">
        Support-Status wird geladen…
      </div>
    );
  }

  const styles = toneStyles[status.tone];

  return (
    <div
      className={`rounded-xl border px-4 py-4 ${styles.border} ${
        compact ? "py-3" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${styles.dot}`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className={`font-medium ${styles.text}`}>{status.label}</p>
          <p className="mt-1 text-sm text-white/45">{status.detail}</p>
          {!compact ? (
            <p className="mt-2 font-mono text-[9px] tracking-[.12em] text-white/28">
              ERREICHBAR {status.hoursStart}–{status.hoursEnd} ·{" "}
              {status.timezone}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
