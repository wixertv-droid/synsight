import { notFound } from "next/navigation";
import AdminPageShell from "@/components/admin/layout/AdminPageShell";
import AdminSubNav from "@/components/admin/layout/AdminSubNav";
import AdminViewHost from "@/components/admin/views/AdminViewHost";
import { getAdminSection } from "@/lib/admin/navigation";

export const dynamic = "force-dynamic";

export default async function AdminUserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number.parseInt(id, 10);
  if (!Number.isFinite(userId)) notFound();

  const section = getAdminSection("benutzer");
  if (!section) notFound();

  return (
    <main className="mx-auto max-w-[1500px]">
      <AdminSubNav sectionId="benutzer" />
      <AdminPageShell
        section={section}
        item={{
          slug: "profil",
          label: `Benutzerprofil #${userId}`,
          description: "Vollständige 360°-Sicht auf alle gespeicherten Daten.",
          help: "Persönliche Daten, Identität, Analysen, SynCredits, Logins, Audit und Timeline.",
          view: "user-profile",
        }}
      >
        <AdminViewHost view="user-profile" userId={userId} />
      </AdminPageShell>
    </main>
  );
}
