"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import LaunchScreen from "@/components/loading/LaunchScreen";
import HeroSection from "@/components/hero/HeroSection";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SystemRail from "@/components/layout/SystemRail";

const LAUNCH_SEEN_KEY = "synsight.launch.seen";

const IntelligenceConsole = dynamic(
  () => import("@/components/sections/IntelligenceConsole"),
  { ssr: false }
);
const DemoScanner = dynamic(() => import("@/components/sections/DemoScanner"), {
  ssr: false,
});
const DigitalTraces = dynamic(
  () => import("@/components/sections/DigitalTraces"),
  { ssr: false }
);
const WhatSynSightRecognizes = dynamic(
  () => import("@/components/sections/WhatSynSightRecognizes"),
  { ssr: false }
);
const TrustSection = dynamic(
  () => import("@/components/sections/TrustSection"),
  { ssr: false }
);
const SynCreditsSection = dynamic(
  () => import("@/components/sections/SynCreditsSection"),
  { ssr: false }
);
const SupportSection = dynamic(
  () => import("@/components/sections/SupportSection"),
  { ssr: false }
);

type BootState = "checking" | "launch" | "ready";

function hasSeenLaunchThisSession(): boolean {
  try {
    return sessionStorage.getItem(LAUNCH_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markLaunchSeen(): void {
  try {
    sessionStorage.setItem(LAUNCH_SEEN_KEY, "1");
  } catch {
    // Private mode / blocked storage — ignore.
  }
}

export default function Home() {
  const [bootState, setBootState] = useState<BootState>("checking");

  useEffect(() => {
    // Only show the launch bar on a fresh browser session / first open.
    // Client-side navigations back to "/" skip it until the tab/session ends.
    setBootState(hasSeenLaunchThisSession() ? "ready" : "launch");
  }, []);

  const handleLoadingComplete = useCallback(() => {
    markLaunchSeen();
    setBootState("ready");
  }, []);

  const ready = bootState === "ready";
  const showLaunch = bootState === "launch";

  return (
    <>
      {showLaunch ? <LaunchScreen onComplete={handleLoadingComplete} /> : null}
      <main
        className={`transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <Navbar />
        <SystemRail sectionsReady={ready} />
        <HeroSection />
        {ready ? (
          <>
            <IntelligenceConsole />
            <DemoScanner />
            <DigitalTraces />
            <WhatSynSightRecognizes />
            <SynCreditsSection />
            <SupportSection />
            <TrustSection />
            <Footer />
          </>
        ) : null}
      </main>
    </>
  );
}
