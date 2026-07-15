import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories";
import { isOnboardingComplete } from "@/lib/repositories/profile-repository";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * `src/middleware.ts` already redirects unauthenticated requests before
 * this layout renders. This second check is defense in depth and enforces
 * completed onboarding before any platform surface is reachable.
 */
export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileRepository().findByUserId(Number(user.id));
  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
