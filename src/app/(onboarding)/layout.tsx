import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Identitätsprofil — SynSight",
  robots: { index: false, follow: false },
};

/** Sprint 5D: forced onboarding removed — send users to the voluntary profile. */
export default async function OnboardingLayout() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/profile");
  redirect("/profile");
}
