import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminLegacyHashRedirect from "@/components/admin/layout/AdminLegacyHashRedirect";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div id="synsight-admin-root" className="admin-area">
      <AdminLegacyHashRedirect />
      {children}
    </div>
  );
}
