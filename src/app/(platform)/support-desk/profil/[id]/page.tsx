import { notFound } from "next/navigation";
import SupportDeskSidebar from "@/components/support/SupportDeskSidebar";
import AdminUserProfilePanel from "@/components/admin/views/AdminUserProfilePanel";

export const dynamic = "force-dynamic";

export default async function SupportDeskProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number.parseInt(id, 10);
  if (!Number.isFinite(userId) || userId <= 0) notFound();

  return (
    <main className="mx-auto max-w-[1500px]">
      <header className="mb-8">
        <p className="font-mono text-[8px] tracking-[.16em] text-emerald-100/40">
          SUPPORT DESK / PROFIL
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          Benutzerprofil
        </h1>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(200px,240px)_1fr]">
        <SupportDeskSidebar />
        <div className="min-w-0">
          <AdminUserProfilePanel userId={userId} />
        </div>
      </div>
    </main>
  );
}
