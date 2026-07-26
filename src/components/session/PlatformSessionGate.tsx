"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import BootSequence from "@/components/session/BootScreen";
import ShutdownSequence from "@/components/session/ShutdownScreen";
import {
  PlatformSessionFxProvider,
  usePlatformSessionFx,
} from "@/components/session/PlatformSessionFx";
import {
  clearPlatformBooted,
  hasPlatformBooted,
  markPlatformBooted,
} from "@/lib/session/platform-boot";
import styles from "./PlatformSessionGate.module.css";

type BootGate = "checking" | "boot" | "ready";

function PlatformSessionGateInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { shuttingDown, beginShutdown, setLogoutHandler } =
    usePlatformSessionFx();
  const [bootGate, setBootGate] = useState<BootGate>("checking");
  const [dashboardReveal, setDashboardReveal] = useState(false);

  useEffect(() => {
    setBootGate(hasPlatformBooted() ? "ready" : "boot");
    if (hasPlatformBooted()) {
      setDashboardReveal(true);
    }
  }, []);

  const handleBootComplete = useCallback(() => {
    markPlatformBooted();
    setBootGate("ready");
    // Next frame: trigger fade-in / slide-up
    requestAnimationFrame(() => setDashboardReveal(true));
  }, []);

  const runLogout = useCallback(() => {
    clearPlatformBooted();
    beginShutdown();
    // Fire logout API in parallel; navigate after CRT finishes
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  }, [beginShutdown]);

  useEffect(() => {
    setLogoutHandler(runLogout);
    return () => setLogoutHandler(null);
  }, [runLogout, setLogoutHandler]);

  const handleShutdownComplete = useCallback(() => {
    router.push("/");
    router.refresh();
  }, [router]);

  const showBoot = bootGate === "boot";
  const shellHidden =
    bootGate === "checking" || (bootGate === "boot" && !dashboardReveal);

  return (
    <>
      {showBoot ? <BootSequence onComplete={handleBootComplete} /> : null}
      {shuttingDown ? (
        <ShutdownSequence onComplete={handleShutdownComplete} />
      ) : null}

      <div
        className={[
          styles.dashboardReveal,
          dashboardReveal && !showBoot ? styles.dashboardRevealIn : "",
          shellHidden ? styles.dashboardHidden : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </>
  );
}

/**
 * Fullscreen boot once per tab session + CRT shutdown on logout.
 * Mount around the platform DashboardShell content.
 */
export default function PlatformSessionGate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PlatformSessionFxProvider>
      <PlatformSessionGateInner>{children}</PlatformSessionGateInner>
    </PlatformSessionFxProvider>
  );
}
