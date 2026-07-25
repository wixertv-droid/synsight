import type { ReactNode } from "react";
import Link from "next/link";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {
  ADMIN_SECTIONS,
  type AdminNavItem,
  type AdminSectionConfig,
} from "@/lib/admin/navigation";

export default function AdminPageShell({
  section,
  item,
  children,
}: {
  section: AdminSectionConfig;
  item?: AdminNavItem;
  children: ReactNode;
}) {
  const title = item?.label ?? section.title;
  const description = item?.description ?? section.description;
  const help = item?.help ?? section.description;

  return (
    <div>
      <nav
        aria-label="Admin-Bereiche"
        className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-2"
      >
        <Link
          href="/admin"
          className="rounded-lg px-2.5 py-1.5 font-mono text-[8px] tracking-[.12em] text-white/35 transition hover:bg-white/[0.04] hover:text-white/70"
        >
          A0 Übersicht
        </Link>
        {ADMIN_SECTIONS.map((entry) => {
          const active = entry.id === section.id;
          return (
            <Link
              key={entry.id}
              href={`${entry.href}/${entry.defaultSlug}`}
              className={`rounded-lg px-2.5 py-1.5 font-mono text-[8px] tracking-[.12em] transition ${
                active
                  ? "bg-cyber-cyan/[0.12] text-cyber-cyan"
                  : "text-white/35 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              {entry.sidebarCode} {entry.title}
            </Link>
          );
        })}
      </nav>
      <header className="mb-6">
        <span className="hud-label">Admin / {section.title}</span>
        <h1 className="mt-3 flex flex-wrap items-center text-2xl font-semibold tracking-[-.03em] text-white md:text-3xl">
          {title}
          <InfoTooltip label={`Hilfe: ${title}`}>{help}</InfoTooltip>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/38">
          {description}
        </p>
      </header>
      {children}
    </div>
  );
}
