import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * `src/middleware.ts` already redirects unauthenticated requests before
 * this layout renders. Sprint 5D: onboarding is no longer a hard gate —
 * users land on the dashboard and complete their identity profile voluntarily.
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

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
