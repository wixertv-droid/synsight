import { notFound } from "next/navigation";
import AdminPageShell from "@/components/admin/layout/AdminPageShell";
import AdminSubNav, {
  AdminSectionTiles,
} from "@/components/admin/layout/AdminSubNav";
import { getAdminSection, type AdminSectionId } from "@/lib/admin/navigation";

export default async function AdminSectionHubPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionId } = await params;
  const section = getAdminSection(sectionId);
  if (!section) notFound();

  return (
    <main className="mx-auto max-w-[1500px]">
      <AdminSubNav sectionId={section.id as AdminSectionId} />
      <AdminPageShell section={section}>
        <AdminSectionTiles />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {section.items.map((item) => (
            <a
              key={item.slug}
              href={`${section.href}/${item.slug}`}
              className="hardware-panel rounded-xl border border-white/[0.07] p-4 transition hover:border-cyber-cyan/25"
            >
              <p className="text-sm font-medium text-white/80">{item.label}</p>
              <p className="mt-2 text-[12px] text-white/40">
                {item.description}
              </p>
            </a>
          ))}
        </div>
      </AdminPageShell>
    </main>
  );
}
