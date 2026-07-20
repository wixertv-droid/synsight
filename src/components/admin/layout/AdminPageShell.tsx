import type { ReactNode } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { AdminNavItem, AdminSectionConfig } from "@/lib/admin/navigation";

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
      <header className="mb-6">
        <span className="hud-label">Admin / {section.title}</span>
        <h1 className="mt-3 flex flex-wrap items-center text-2xl font-semibold tracking-[-.03em] text-white md:text-3xl">
          {title}
          <InfoTooltip label={`Hilfe: ${title}`}>{help}</InfoTooltip>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/38">
          {description}
        </p>
        {item?.badge === "soon" ? (
          <p className="mt-3 inline-flex rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[8px] tracking-[.12em] text-white/35">
            MODUL IN VORBEREITUNG — BESTEHENDE APIS BLEIBEN UNVERÄNDERT
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
