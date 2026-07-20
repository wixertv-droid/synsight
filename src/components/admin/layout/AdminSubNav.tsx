"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_SECTIONS,
  getAdminSection,
  type AdminSectionId,
} from "@/lib/admin/navigation";

export default function AdminSubNav({
  sectionId,
}: {
  sectionId: AdminSectionId;
}) {
  const pathname = usePathname();
  const section = getAdminSection(sectionId);
  if (!section) return null;

  return (
    <nav
      aria-label={`Admin Navigation ${section.title}`}
      className="mb-6 overflow-x-auto rounded-[1.2rem] border border-white/[0.07] bg-white/[0.015] p-2"
    >
      <div className="flex min-w-max gap-1">
        <Link
          href={section.href}
          className={`rounded-lg px-3 py-2 font-mono text-[8px] tracking-[.12em] transition ${
            pathname === section.href
              ? "bg-cyber-cyan/[0.12] text-cyber-cyan"
              : "text-white/35 hover:bg-white/[0.03] hover:text-white/65"
          }`}
        >
          ÜBERSICHT
        </Link>
        {section.items.map((item) => {
          const href = `${section.href}/${item.slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={item.slug}
              href={href}
              className={`rounded-lg px-3 py-2 text-[11px] transition ${
                active
                  ? "bg-cyber-cyan/[0.12] text-cyber-cyan"
                  : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
              }`}
            >
              {item.label}
              {item.badge === "live" ? (
                <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,.5)]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminSectionTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ADMIN_SECTIONS.map((section) => (
        <Link
          key={section.id}
          href={section.href}
          className="hardware-panel group rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] p-5 transition hover:border-cyber-cyan/25 hover:bg-cyber-cyan/[0.03]"
        >
          <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/50">
            {section.id.toUpperCase()}
          </p>
          <h3 className="mt-2 text-lg font-medium text-white/85 group-hover:text-white">
            {section.title}
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-white/40">
            {section.description}
          </p>
          <p className="mt-4 font-mono text-[8px] text-white/25">
            {section.items.length} Module
          </p>
        </Link>
      ))}
    </div>
  );
}
