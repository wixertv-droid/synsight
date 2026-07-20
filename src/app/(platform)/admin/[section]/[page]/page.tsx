import { notFound, redirect } from "next/navigation";
import AdminSectionLayout from "@/components/admin/layout/AdminSectionLayout";
import AdminViewHost from "@/components/admin/views/AdminViewHost";
import { getAdminNavItemForRole } from "@/lib/admin/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminUserOverview } from "@/lib/services/admin-user-profile-service";
import { canAccessAdminArea } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminSubPage({
  params,
}: {
  params: Promise<{ section: string; page: string }>;
}) {
  const { section, page } = await params;
  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user.role)) redirect("/dashboard");

  const config = getAdminNavItemForRole(user.role, section, page);
  if (!config) notFound();

  let overviewStats = null;
  if (config.view === "user-overview" && user.role === "admin") {
    overviewStats = await getAdminUserOverview(user);
  }

  return (
    <AdminSectionLayout section={config.section} item={config} role={user.role}>
      <AdminViewHost view={config.view} overviewStats={overviewStats} />
    </AdminSectionLayout>
  );
}
