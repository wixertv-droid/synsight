"use client";

import { useEffect, useState } from "react";

interface PromotionNotification {
  rewardId: number;
  promotionId: number;
  promotionName: string;
  credits: number;
  grantedAt: string;
}

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

export default function PromotionWelcomeBanner() {
  const [notifications, setNotifications] = useState<PromotionNotification[]>(
    []
  );
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      try {
        const response = await fetch("/api/promotions/notifications");
        const result = (await response.json()) as ApiResult<{
          notifications: PromotionNotification[];
        }>;
        if (!cancelled && response.ok && result.success) {
          setNotifications(result.data.notifications);
        }
      } catch {
        // Non-blocking dashboard enhancement.
      }
    }
    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = notifications.filter(
    (entry) => !dismissed.has(entry.rewardId)
  );
  if (visible.length === 0) return null;

  const totalCredits = visible.reduce((sum, entry) => sum + entry.credits, 0);

  async function dismiss(rewardId: number) {
    setDismissed((current) => new Set(current).add(rewardId));
    try {
      await fetch("/api/promotions/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
    } catch {
      // Banner already hidden locally.
    }
  }

  return (
    <section
      className="mb-6 rounded-[1.4rem] border border-emerald-300/20 bg-emerald-300/[0.05] p-5 md:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-medium text-white/90">
            🎉 Willkommen bei SynSight!
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/75">
            Im Rahmen unserer aktuellen Aktion wurden Ihrem Konto{" "}
            <span className="font-semibold text-emerald-100">
              {totalCredits.toLocaleString("de-DE")} SynCredits
            </span>{" "}
            gutgeschrieben.
          </p>
          {visible.length > 1 ? (
            <ul className="mt-3 space-y-1 text-xs text-white/40">
              {visible.map((entry) => (
                <li key={entry.rewardId}>
                  {entry.promotionName}: {entry.credits.toLocaleString("de-DE")}{" "}
                  SynCredits
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            for (const entry of visible) {
              void dismiss(entry.rewardId);
            }
          }}
          className="self-start rounded-lg border border-emerald-300/20 px-3 py-2 font-mono text-[8px] tracking-[.12em] text-emerald-100/70 transition hover:border-emerald-300/35 hover:text-emerald-50"
        >
          VERSTANDEN
        </button>
      </div>
    </section>
  );
}
