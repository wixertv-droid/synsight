import { redirect } from "next/navigation";
import { getAdminSection } from "@/lib/admin/navigation";

export default async function AdminSectionHubPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionId } = await params;
  const section = getAdminSection(sectionId);
  if (!section) redirect("/admin");

  redirect(`${section.href}/${section.defaultSlug}`);
}
