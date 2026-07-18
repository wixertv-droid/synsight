"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

interface InboxSummary {
  total: number;
  newCount: number;
}

export default function AdminInboxBadge() {
  const [summary, setSummary] = useState<InboxSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/communications/summary", {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResult<InboxSummary>;
      if (!response.ok || !result.success) return;
      setSummary({
        total: result.data.total,
        newCount: result.data.newCount,
      });
    } catch {
      // keep previous summary on transient errors
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const total = summary?.total ?? 0;
  const newCount = summary?.newCount ?? 0;
  const hasNew = newCount > 0;

  return (
    <Link
      href="/admin#admin-communications"
      className={`relative rounded-lg border px-2.5 py-2 transition sm:px-3 ${
        hasNew
          ? "border-amber-300/30 bg-amber-300/[0.06] hover:border-amber-300/50"
          : "border-white/[0.08] bg-white/[0.018] hover:border-cyber-cyan/30"
      }`}
      aria-label={
        summary
          ? `${total} Nachrichten, davon ${newCount} neu`
          : "Nachrichten laden"
      }
    >
      <p
        className={`font-mono text-[8px] tracking-[.12em] ${
          hasNew ? "text-amber-100/70" : "text-white/32"
        }`}
      >
        NACHRICHTEN
      </p>
      <p className="mt-1 text-[11px] font-medium text-white/80">
        {summary ? (
          <>
            {total.toLocaleString("de-DE")}
            <span className="mx-1 text-white/25">·</span>
            <span className={hasNew ? "text-amber-100/85" : "text-white/45"}>
              {newCount.toLocaleString("de-DE")} neu
            </span>
          </>
        ) : (
          <span className="text-white/35">…</span>
        )}
      </p>
      {hasNew ? (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,.55)]" />
      ) : null}
    </Link>
  );
}
