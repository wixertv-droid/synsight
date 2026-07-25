"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminSection } from "@/lib/admin/navigation";

const SUPPORT_PAGES = [
  { slug: "nachrichten", label: "Nachrichten" },
  { slug: "benutzersuche", label: "Benutzersuche" },
  { slug: "aktivitaeten", label: "Aktivitäten" },
] as const;

export default function SupportDeskSidebar() {
  const pathname = usePathname();
  const section = getAdminSection("support");

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.03] p-4">
        <p className="font-mono text-[8px] tracking-[.16em] text-emerald-100/45">
          SUPPORT DESK
        </p>
        <p className="mt-2 text-sm text-white/55">
          {section?.description ??
            "Nachrichten, Benutzersuche und Support-Zeiten."}
        </p>
      </div>
      <nav
        aria-label="Support Navigation"
        className="space-y-1 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-2"
      >
        {SUPPORT_PAGES.map((item) => {
          const href = `/support-desk/${item.slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={item.slug}
              href={href}
              className={`block rounded-lg px-3 py-2.5 text-[12px] transition ${
                active
                  ? "bg-emerald-300/[0.12] text-emerald-100"
                  : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/dashboard"
        className="block rounded-lg border border-white/10 px-3 py-2 text-center font-mono text-[9px] tracking-[.12em] text-white/35 transition hover:border-white/20 hover:text-white/60"
      >
        ← User-Dashboard
      </Link>
    </aside>
  );
}
