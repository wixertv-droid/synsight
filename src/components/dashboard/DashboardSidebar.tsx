"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import StatusDot from "@/components/ui/StatusDot";
import LogoutButton from "@/components/dashboard/LogoutButton";
import AdminMainSidebarLinks from "@/components/admin/layout/AdminMainSidebarLinks";
import { getInitials } from "@/lib/utils/strings";
import type { AuthenticatedUser } from "@/lib/auth/types";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
}

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    code: "01",
    icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z",
  },
  {
    label: "Analyse Center",
    href: "/dashboard/analysis",
    code: "02",
    icon: "M12 3v18m9-9H3",
  },
  {
    label: "Ergebnisse",
    href: "/dashboard/results",
    code: "03",
    icon: "M9 17v-6h6v6M5 21h14a2 2 0 002-2V8l-5-5H5a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    label: "Bedrohungen",
    href: "/dashboard/threats",
    code: "04",
    icon: "M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0z",
  },
  {
    label: "Digitale Spuren",
    href: "/dashboard#digital-traces",
    code: "05",
    icon: "M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2 0 3.5-4 3.5-9S14 3 12 3 8.5 7 8.5 12 10 21 12 21zM3 12h18",
  },
  {
    label: "Risikoanalyse",
    href: "/dashboard#risk-analysis",
    code: "06",
    icon: "M3 3v18h18M7 15l3-3 3 2 4-5",
  },
  {
    label: "Überwachung",
    href: "/dashboard#monitoring",
    code: "07",
    icon: "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zm9 3a3 3 0 100-6 3 3 0 000 6z",
  },
  {
    label: "Berichte",
    href: "/dashboard#reports",
    code: "08",
    icon: "M6 3h9l3 3v15H6V3zm3 6h6m-6 4h6m-6 4h4",
  },
  {
    label: "Support",
    href: "/dashboard/support",
    code: "11",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z",
  },
];

function isNavActive(href: string, pathname: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardSidebar({
  open,
  onClose,
  user,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Navigation schließen"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col border-r border-white/[0.07] bg-[#040811]/95 p-5 shadow-[30px_0_80px_rgba(0,0,0,.25)] backdrop-blur-2xl transition-transform duration-500 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between">
          <BrandLogo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.06] p-2 text-white/35 lg:hidden"
            aria-label="Navigation schließen"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-300/10 bg-emerald-300/[0.025] px-3 py-3">
          <span className="flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-emerald-100/50">
            <StatusDot pulse />
            SYSTEM ONLINE
          </span>
          <span className="font-mono text-[8px] text-white/18">EU-01</span>
        </div>

        <nav
          className="mt-7 flex-1 space-y-1 overflow-y-auto"
          aria-label="Dashboard Navigation"
        >
          {navigation.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-300 ${
                  active
                    ? "border-cyber-blue/20 bg-cyber-blue/[0.065] text-white/85"
                    : "border-transparent text-white/38 hover:border-white/[0.05] hover:bg-white/[0.025] hover:text-white/70"
                }`}
              >
                <span className="font-mono text-[8px] text-cyber-cyan/35">
                  {item.code}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 flex-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.35"
                >
                  <path d={item.icon} />
                </svg>
                <span className="text-xs">{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyber-cyan shadow-[0_0_8px_rgba(112,231,255,.45)]" />
                )}
              </Link>
            );
          })}
          {user.role === "admin" || user.role === "support" ? (
            <AdminMainSidebarLinks role={user.role} onNavigate={onClose} />
          ) : null}
        </nav>

        <div className="space-y-1 border-t border-white/[0.06] pt-5">
          <Link
            href="/profile"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs transition-colors ${pathname === "/profile" ? "bg-white/[0.04] text-white/80" : "text-white/35 hover:text-white/70"}`}
          >
            <span className="font-mono text-[8px] text-white/18">09</span>
            Identitätsprofil
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs transition-colors ${pathname === "/settings" ? "bg-white/[0.04] text-white/80" : "text-white/35 hover:text-white/70"}`}
          >
            <span className="font-mono text-[8px] text-white/18">10</span>
            Einstellungen
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyber-blue/25 to-cyber-cyan/10 text-xs font-medium text-cyan-100">
            {getInitials(user.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-white/70">{user.displayName}</p>
            <p className="mt-1 truncate font-mono text-[7px] tracking-wider text-white/20">
              {user.role === "admin"
                ? "ADMIN ACCOUNT"
                : user.role === "support"
                  ? "SUPPORT ACCOUNT"
                  : "USER ACCOUNT"}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
