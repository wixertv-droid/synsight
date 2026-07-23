"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminSection, type AdminSectionId } from "@/lib/admin/navigation";

export default function AdminSectionSidebar({
  sectionId,
}: {
  sectionId: AdminSectionId;
}) {
  const pathname = usePathname();
  const section = getAdminSection(sectionId);
  if (!section) return null;

  return (
    <nav
      aria-label={`${section.title} Navigation`}
      className="hardware-panel rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-3 lg:sticky lg:top-6 lg:self-start"
    >
      <p className="px-2 font-mono text-[8px] tracking-[.14em] text-cyber-cyan/50">
        {section.title.toUpperCase()}
      </p>
      <ul className="mt-3 space-y-1">
        {section.items.map((item) => {
          const href = `${section.href}/${item.slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={item.slug}>
              <Link
                href={href}
                className={`block rounded-lg px-3 py-2.5 text-[12px] transition ${
                  active
                    ? "border border-cyber-cyan/25 bg-cyber-cyan/[0.1] text-cyber-cyan"
                    : "border border-transparent text-white/45 hover:bg-white/[0.03] hover:text-white/75"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
