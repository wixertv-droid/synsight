import { notFound } from "next/navigation";
import SupportDeskSidebar from "@/components/support/SupportDeskSidebar";
import AdminViewHost from "@/components/admin/views/AdminViewHost";
import { getAdminNavItem } from "@/lib/admin/navigation";

export const dynamic = "force-dynamic";

const PAGE_TO_VIEW: Record<string, string> = {
  nachrichten: "support-messages",
  benutzersuche: "support-user-search",
  aktivitaeten: "support-activity",
};

export default async function SupportDeskPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const view = PAGE_TO_VIEW[page];
  if (!view) notFound();

  const nav = getAdminNavItem("support", page);
  const title = nav?.label ?? "Support";
  const help = nav?.help ?? "";

  return (
    <main className="mx-auto max-w-[1500px]">
      <header className="mb-8">
        <p className="font-mono text-[8px] tracking-[.16em] text-emerald-100/40">
          SUPPORT DESK
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          {title}
        </h1>
        {help ? (
          <p className="mt-2 max-w-2xl text-sm text-white/40">{help}</p>
        ) : null}
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(200px,240px)_1fr]">
        <SupportDeskSidebar />
        <div className="min-w-0">
          <AdminViewHost view={view} profileHrefBase="/support-desk/profil" />
        </div>
      </div>
    </main>
  );
}
