"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlatformSessionFxOptional } from "@/components/session/PlatformSessionFx";
import { clearPlatformBooted } from "@/lib/session/platform-boot";

interface LogoutButtonProps {
  variant?: "icon" | "text";
  className?: string;
}

export default function LogoutButton({
  variant = "icon",
  className = "",
}: LogoutButtonProps) {
  const router = useRouter();
  const sessionFx = usePlatformSessionFxOptional();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (sessionFx) {
      sessionFx.requestLogout();
      return;
    }

    // Fallback outside platform gate (e.g. future surfaces)
    setLoading(true);
    clearPlatformBooted();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
      setLoading(false);
    }
  };

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loading || Boolean(sessionFx?.shuttingDown)}
        className={`rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[8px] tracking-[.12em] text-white/55 transition hover:border-rose-300/20 hover:text-rose-100/75 disabled:opacity-50 ${className}`}
      >
        {loading || sessionFx?.shuttingDown ? "ABMELDEN …" : "ABMELDEN"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loading || Boolean(sessionFx?.shuttingDown)}
      aria-label="Abmelden"
      title="Abmelden"
      className={`text-white/20 transition-colors hover:text-white/60 disabled:opacity-50 ${className}`}
    >
      ↗
    </button>
  );
}
