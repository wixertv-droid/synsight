import type { ReactNode } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import PlatformBackground from "@/components/platform/PlatformBackground";
import StatusDot from "@/components/ui/StatusDot";

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-space-black px-5 py-8">
      <PlatformBackground />
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between">
          <BrandLogo />
          <div className="hidden items-center gap-2 font-mono text-[8px] tracking-[.16em] text-white/25 sm:flex">
            <StatusDot pulse />
            SYNSIGHT SECURITY SYSTEM READY
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>

        <footer className="flex flex-col gap-3 border-t border-white/[0.05] pt-5 font-mono text-[8px] tracking-[.14em] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>SECURE ACCESS GATEWAY / EU REGION</span>
          <span>VERSCHLÜSSELT · PRIVACY BY DESIGN</span>
        </footer>
      </div>
    </main>
  );
}
