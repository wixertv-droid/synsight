import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessOrdersDesk } from "@/lib/admin/permissions";
import OrdersDeskClient from "@/components/dashboard/OrdersDeskClient";

export const metadata: Metadata = {
  title: "Aufträge — SynSight",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrdersDeskPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessOrdersDesk(user.role)) redirect("/dashboard");
  return <OrdersDeskClient />;
}
