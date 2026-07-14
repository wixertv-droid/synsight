"use client";

import { useState, useCallback } from "react";
import LoadingScreen from "@/components/loading/LoadingScreen";
import HeroSection from "@/components/hero/HeroSection";
import DigitalTraces from "@/components/sections/DigitalTraces";
import WhatSynSightRecognizes from "@/components/sections/WhatSynSightRecognizes";
import DemoScanner from "@/components/sections/DemoScanner";
import TrustSection from "@/components/sections/TrustSection";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SystemRail from "@/components/layout/SystemRail";

export default function Home() {
  const [loading, setLoading] = useState(true);

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <>
      {loading && <LoadingScreen onComplete={handleLoadingComplete} />}
      <main
        className={`transition-opacity duration-700 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        <Navbar />
        <SystemRail />
        <HeroSection />
        <DigitalTraces />
        <WhatSynSightRecognizes />
        <DemoScanner />
        <TrustSection />
        <Footer />
      </main>
    </>
  );
}
