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

  let lastGroup = "";

  return (
    <nav
      aria-label={`${section.title} Navigation`}
      className="hardware-panel rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-3 lg:sticky lg:top-6 lg:self-start"
    >
      <div className="px-2">
        <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/55">
          {section.sidebarCode} · {section.title.toUpperCase()}
        </p>

        <p className="mt-2 text-[10px] leading-relaxed text-white/28">
          {section.description}
        </p>
      </div>

      <ul className="mt-4 space-y-1">
        {section.items.map((item) => {
          const href = `${section.href}/${item.slug}`;

          const active = pathname === href || pathname.startsWith(`${href}/`);

          const showGroup = Boolean(item.group) && item.group !== lastGroup;

          if (item.group) {
            lastGroup = item.group;
          }

          return (
            <li key={item.slug}>
              {showGroup ? (
                <p className="mb-1 mt-4 px-3 font-mono text-[7px] uppercase tracking-[.16em] text-white/22 first:mt-0">
                  {item.group}
                </p>
              ) : null}

              <Link
                href={href}
                className={`block rounded-xl border px-3 py-3 transition ${
                  active
                    ? "border-cyber-cyan/25 bg-cyber-cyan/[0.08]"
                    : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.025]"
                }`}
              >
                <div
                  className={`text-[12px] font-medium ${
                    active ? "text-cyber-cyan" : "text-white/58"
                  }`}
                >
                  {item.label}
                </div>

                <p
                  className={`mt-1 text-[10px] leading-relaxed ${
                    active ? "text-cyan-50/40" : "text-white/25"
                  }`}
                >
                  {item.description}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
