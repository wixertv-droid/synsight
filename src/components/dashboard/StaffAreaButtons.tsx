"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth/types";

const buttonClass = (active: boolean, tone: "admin" | "support") => {
  const activeTone =
    tone === "admin"
      ? "border-cyber-cyan/45 bg-cyber-cyan/[0.12] text-cyber-cyan"
      : "border-emerald-300/40 bg-emerald-300/[0.1] text-emerald-100/90";
  const idleTone =
    tone === "admin"
      ? "border-cyber-cyan/20 bg-cyber-cyan/[0.04] text-cyber-cyan/70 hover:border-cyber-cyan/40 hover:text-cyber-cyan"
      : "border-emerald-300/20 bg-emerald-300/[0.04] text-emerald-100/60 hover:border-emerald-300/40 hover:text-emerald-100/85";
  return `rounded-lg border px-3 py-2 font-mono text-[9px] tracking-[.14em] transition ${
    active ? activeTone : idleTone
  }`;
};

export default function StaffAreaButtons({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const showAdmin = role === "admin";
  const showSupport = role === "admin" || role === "support";

  if (!showAdmin && !showSupport) return null;

  const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");
  const supportActive =
    pathname === "/support-desk" || pathname.startsWith("/support-desk/");

  return (
    <div className="flex items-center gap-2">
      {showAdmin ? (
        <Link
          href="/admin"
          className={buttonClass(adminActive, "admin")}
          aria-current={adminActive ? "page" : undefined}
        >
          Admin
        </Link>
      ) : null}
      {showSupport ? (
        <Link
          href="/support-desk"
          className={buttonClass(supportActive, "support")}
          aria-current={supportActive ? "page" : undefined}
        >
          Support
        </Link>
      ) : null}
    </div>
  );
}
