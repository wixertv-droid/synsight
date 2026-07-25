import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessSupportDesk } from "@/lib/admin/permissions";

export default async function SupportDeskLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSupportDesk(user.role)) redirect("/dashboard");

  return (
    <div id="synsight-support-desk" className="support-desk-area">
      {children}
    </div>
  );
}
