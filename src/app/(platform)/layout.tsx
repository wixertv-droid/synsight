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
 * this layout renders. This second check is defense in depth (in case the
 * matcher ever falls out of sync) and — more importantly — the point where
 * the authenticated user is fetched once and passed down as a prop to
 * `DashboardShell`, `/dashboard`, `/profile`, and `/settings`.
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
