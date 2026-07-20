import { notFound, redirect } from "next/navigation";
import AdminSectionLayout from "@/components/admin/layout/AdminSectionLayout";
import AdminViewHost from "@/components/admin/views/AdminViewHost";
import { getAdminSection } from "@/lib/admin/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessAdminArea } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number.parseInt(id, 10);
  if (!Number.isFinite(userId)) notFound();

  const user = await getCurrentUser();
  if (!user || !canAccessAdminArea(user.role)) redirect("/dashboard");

  const section =
    user.role === "support"
      ? getAdminSection("support")
      : getAdminSection("benutzer");
  if (!section) notFound();

  return (
    <AdminSectionLayout
      section={section}
      role={user.role}
      item={{
        slug: "profil",
        label: `Benutzerprofil #${userId}`,
        description: "Vollständige 360°-Sicht auf alle gespeicherten Daten.",
        help: "Persönliche Daten, Identität, Analysen, SynCredits, Logins und Audit.",
        view: "user-profile",
      }}
    >
      <AdminViewHost view="user-profile" userId={userId} />
    </AdminSectionLayout>
  );
}
