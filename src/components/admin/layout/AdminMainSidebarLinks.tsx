"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminSidebarLinksForRole } from "@/lib/admin/navigation";
import type { UserRole } from "@/lib/auth/types";

export default function AdminMainSidebarLinks({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = getAdminSidebarLinksForRole(role);

  return (
    <div className="mt-3 space-y-1 border-t border-cyber-cyan/10 pt-3">
      <p className="px-3 font-mono text-[7px] tracking-[.16em] text-cyber-cyan/40">
        ADMINISTRATION
      </p>
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`ml-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition ${
              active
                ? "bg-cyber-cyan/[0.1] text-cyber-cyan"
                : "text-cyber-cyan/45 hover:bg-cyber-cyan/[0.05] hover:text-cyber-cyan/75"
            }`}
          >
            <span className="font-mono text-[8px] text-cyber-cyan/35">
              {link.code}
            </span>
            {link.label}
            {active ? (
              <span className="ml-auto h-1 w-1 rounded-full bg-cyber-cyan" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
