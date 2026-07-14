import type { Metadata } from "next";
import type { ReactNode } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import PlatformBackground from "@/components/platform/PlatformBackground";

export const metadata: Metadata = {
  title: "Einrichtung — SynSight",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-space-black px-5 py-7 md:px-8">
      <PlatformBackground />
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <BrandLogo />
          <span className="font-mono text-[8px] tracking-[.16em] text-white/22">
            PERSONAL SECURITY SETUP
          </span>
        </header>
        {children}
      </div>
    </main>
  );
}
