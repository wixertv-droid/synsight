import { notFound, redirect } from "next/navigation";
import AdminSectionLayout from "@/components/admin/layout/AdminSectionLayout";
import AdminViewHost from "@/components/admin/views/AdminViewHost";
import { ADMIN_ROUTE_REDIRECTS, getAdminNavItem } from "@/lib/admin/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminUserOverview } from "@/lib/services/admin-user-profile-service";

export const dynamic = "force-dynamic";

export default async function AdminSubPage({
  params,
}: {
  params: Promise<{
    section: string;
    page: string;
  }>;
}) {
  const { section, page } = await params;

  const pathname = `/admin/${section}/${page}`;

  const legacyTarget = ADMIN_ROUTE_REDIRECTS[pathname];

  if (legacyTarget) {
    redirect(legacyTarget);
  }

  const config = getAdminNavItem(section, page);

  if (!config) {
    notFound();
  }

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
