"use client";

import { useEffect, useState } from "react";

export default function AdminSystemStatusView() {
  const [system, setSystem] = useState<Record<string, string | number> | null>(
    null
  );

  useEffect(() => {
    fetch("/api/admin/system")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setSystem(body.data);
      })
      .catch(() => undefined);
  }, []);

  if (!system) {
    return <p className="text-sm text-white/40">Systemstatus wird geladen…</p>;
  }

  const cards = Object.entries(system).filter(
    ([key]) => !["checkedAt"].includes(key)
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([key, value]) => (
        <article
          key={key}
          className="hardware-panel rounded-xl border border-white/[0.07] p-4"
        >
          <p className="font-mono text-[8px] tracking-[.12em] text-white/28">
            {key.replace(/([A-Z])/g, " $1").toUpperCase()}
          </p>
          <p className="mt-3 text-lg font-medium text-white/80">
            {String(value)}
          </p>
        </article>
      ))}
    </div>
  );
}
