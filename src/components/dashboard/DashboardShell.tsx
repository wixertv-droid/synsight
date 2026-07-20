"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import PlatformBackground from "@/components/platform/PlatformBackground";
import LogoutButton from "@/components/dashboard/LogoutButton";
import AdminInboxBadge from "@/components/admin/AdminInboxBadge";
import StatusDot from "@/components/ui/StatusDot";
import type { AuthenticatedUser } from "@/lib/auth/types";

interface DashboardShellProps {
  children: ReactNode;
  user: AuthenticatedUser;
  creditBalance?: number;
}

export default function DashboardShell({
  children,
  user,
  creditBalance = 0,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-space-black text-white">
      <PlatformBackground />
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />
      <div className="relative z-10 lg:pl-[278px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#03070e]/75 px-5 backdrop-blur-xl md:px-8 lg:px-10">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2 text-white/50 lg:hidden"
            aria-label="Navigation öffnen"
            aria-expanded={sidebarOpen}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="font-mono text-[8px] tracking-[.16em] text-white/22">
              SYNSIGHT COMMAND CENTER
            </span>
            <span className="h-3 w-px bg-white/[0.07]" />
            <span className="flex items-center gap-2 font-mono text-[8px] tracking-[.14em] text-emerald-100/45">
              <StatusDot />
              LIVE
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <LogoutButton variant="text" className="hidden sm:inline-flex" />
            <a
              href="/dashboard#syncredits-dashboard"
              className="hidden rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/[0.05] px-3 py-2 transition hover:border-cyber-cyan/40 sm:block"
            >
              <p className="font-mono text-[8px] tracking-[.12em] text-cyber-cyan/55">
                SYNCREDITS
              </p>
              <p className="mt-1 text-[11px] font-medium text-white/80">
                {creditBalance.toLocaleString("de-DE")}
              </p>
            </a>
            {user.role === "admin" || user.role === "support" ? (
              <AdminInboxBadge />
            ) : null}
            {user.role !== "admin" && user.role !== "support" ? (
              <button
                type="button"
                className="relative rounded-lg border border-white/[0.06] bg-white/[0.018] p-2.5 text-white/35 transition-colors hover:text-white/70"
                aria-label="Benachrichtigungen"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
              </button>
            ) : null}
            <div className="hidden rounded-lg border border-white/[0.06] bg-white/[0.018] px-3 py-2 lg:block">
              <p className="font-mono text-[8px] tracking-[.12em] text-white/32">
                LAST SYNC
              </p>
              <p className="mt-1 text-[9px] text-white/55">Heute, 12:04</p>
            </div>
          </div>
        </header>
        <div className="p-5 md:p-8 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
