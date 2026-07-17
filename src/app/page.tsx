"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import LaunchScreen from "@/components/loading/LaunchScreen";
import HeroSection from "@/components/hero/HeroSection";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SystemRail from "@/components/layout/SystemRail";

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

export default function Home() {
  const [loading, setLoading] = useState(true);

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <>
      {loading && <LaunchScreen onComplete={handleLoadingComplete} />}
      <main
        className={`transition-opacity duration-700 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        <Navbar />
        <SystemRail sectionsReady={!loading} />
        <HeroSection />
        {!loading && (
          <>
            <IntelligenceConsole />
            <DemoScanner />
            <DigitalTraces />
            <WhatSynSightRecognizes />
            <SynCreditsSection />
            <TrustSection />
            <Footer />
          </>
        )}
      </main>
    </>
  );
}
