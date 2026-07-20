"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function SectionReveal({
  children,
  delayMs,
  enabled,
}: {
  children: ReactNode;
  delayMs: number;
  enabled: boolean;
}) {
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, enabled]);

  return (
    <div
      className={`transition-all duration-700 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
