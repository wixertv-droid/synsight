import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import OrdersClient from "@/components/dashboard/OrdersClient";

export const metadata: Metadata = {
  title: "Meine Aufträge — SynSight",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <OrdersClient />;
}
