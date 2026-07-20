import type { Metadata } from "next";
import AdminDashboardTiles, {
  AdminDashboardHeader,
} from "@/components/admin/views/AdminDashboardView";
import { AdminSectionTiles } from "@/components/admin/layout/AdminSubNav";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Administration — SynSight Control Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  return (
    <main id="synsight-admin" className="mx-auto max-w-[1500px]">
      <AdminDashboardHeader email={user?.email ?? ""} />
      <AdminDashboardTiles />
      <section className="mt-10">
        <p className="font-mono text-[8px] tracking-[.16em] text-white/25">
          BEREICHE
        </p>
        <div className="mt-4">
          <AdminSectionTiles />
        </div>
      </section>
    </main>
  );
}
