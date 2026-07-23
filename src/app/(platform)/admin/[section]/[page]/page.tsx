import { notFound } from "next/navigation";
import AdminSectionLayout from "@/components/admin/layout/AdminSectionLayout";
import AdminViewHost from "@/components/admin/views/AdminViewHost";
import { getAdminNavItem } from "@/lib/admin/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminUserOverview } from "@/lib/services/admin-user-profile-service";

export const dynamic = "force-dynamic";

export default async function AdminSubPage({
  params,
}: {
  params: Promise<{ section: string; page: string }>;
}) {
  const { section, page } = await params;
  const config = getAdminNavItem(section, page);
  if (!config) notFound();

  const user = await getCurrentUser();
  let overviewStats = null;
  if (config.view === "user-overview" && user) {
    overviewStats = await getAdminUserOverview(user);
  }

  return (
    <AdminSectionLayout section={config.section} item={config}>
      <AdminViewHost view={config.view} overviewStats={overviewStats} />
    </AdminSectionLayout>
  );
}
