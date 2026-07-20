import { notFound } from "next/navigation";
import AdminPageShell from "@/components/admin/layout/AdminPageShell";
import AdminSubNav from "@/components/admin/layout/AdminSubNav";
import AdminViewHost from "@/components/admin/views/AdminViewHost";
import { getAdminNavItem, type AdminSectionId } from "@/lib/admin/navigation";
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
    <main className="mx-auto max-w-[1500px]">
      <AdminSubNav sectionId={config.section.id as AdminSectionId} />
      <AdminPageShell section={config.section} item={config}>
        <AdminViewHost view={config.view} overviewStats={overviewStats} />
      </AdminPageShell>
    </main>
  );
}
