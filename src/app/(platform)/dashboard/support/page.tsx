import type { Metadata } from "next";
import DashboardSupportClient from "@/components/dashboard/DashboardSupportClient";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Support — SynSight Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <DashboardSupportClient user={user} />;
}
