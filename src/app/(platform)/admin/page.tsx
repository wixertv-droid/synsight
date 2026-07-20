import type { Metadata } from "next";
import AdminDashboardTiles, {
  AdminDashboardHeader,
} from "@/components/admin/views/AdminDashboardView";
import { AdminSectionTiles } from "@/components/admin/layout/AdminSubNav";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessAdminArea } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Administration — SynSight Control Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user.role)) redirect("/dashboard");
  if (user.role === "support") redirect("/admin/support/tickets");

  return (
    <main id="synsight-admin" className="mx-auto max-w-[1500px]">
      <AdminDashboardHeader email={user.email ?? ""} />
      <AdminDashboardTiles />
      <section className="mt-10">
        <p className="font-mono text-[8px] tracking-[.16em] text-white/25">
          BEREICHE — WÄHLEN SIE IN DER SIDEBAR ODER HIER
        </p>
        <div className="mt-4">
          <AdminSectionTiles />
        </div>
      </section>
    </main>
  );
}
