import AdminPageShell from "@/components/admin/layout/AdminPageShell";
import AdminSectionSidebar from "@/components/admin/layout/AdminSectionSidebar";
import type { AdminNavItem, AdminSectionConfig } from "@/lib/admin/navigation";
import type { AdminSectionId } from "@/lib/admin/navigation";

export default function AdminSectionLayout({
  section,
  item,
  children,
}: {
  section: AdminSectionConfig;
  item?: AdminNavItem;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[1500px]">
      <AdminPageShell section={section} item={item}>
        <div className="grid gap-6 lg:grid-cols-[minmax(200px,240px)_1fr]">
          <AdminSectionSidebar sectionId={section.id as AdminSectionId} />
          <div className="min-w-0">{children}</div>
        </div>
      </AdminPageShell>
    </main>
  );
}
