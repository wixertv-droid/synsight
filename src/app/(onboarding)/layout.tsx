import type { Metadata } from "next";
import type { ReactNode } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import PlatformBackground from "@/components/platform/PlatformBackground";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories";
import { isOnboardingComplete } from "@/lib/repositories/profile-repository";

export const metadata: Metadata = {
  title: "Einrichtung — SynSight",
  robots: { index: false, follow: false },
};

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/onboarding");

  const profile = await getProfileRepository().findByUserId(Number(user.id));
  if (isOnboardingComplete(profile)) {
    redirect("/dashboard");
  }

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
