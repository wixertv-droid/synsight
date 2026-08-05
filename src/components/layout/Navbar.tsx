"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface SessionUser {
  displayName: string;
  email: string;
  role: "admin" | "support" | "worker" | "user";
}

type SessionState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; user: SessionUser };

type NavLink = {
  label: string;
  href: string;
  /** Section id on the homepage for scroll spy */
  sectionId?: string;
};

const navLinks: NavLink[] = [
  { label: "Plattform", href: "/#platform", sectionId: "platform" },
  { label: "Risiko-Check", href: "/#demo-scanner", sectionId: "demo-scanner" },
  { label: "SynCredits", href: "/#syncredits", sectionId: "syncredits" },
  { label: "Sicherheit", href: "/#trust", sectionId: "trust" },
  { label: "Analysen", href: "/analysen" },
  { label: "Hilfe", href: "/hilfe" },
];

function linkClass(active: boolean, mobile = false) {
  if (mobile) {
    return active
      ? "block rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/[0.08] px-3 py-2 text-sm text-cyber-cyan"
      : "block py-2 text-sm text-gray-400 hover:text-cyber-cyan";
  }
  return active
    ? "relative py-2 text-[12px] tracking-wide text-cyber-cyan after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-cyber-cyan/70"
    : "relative py-2 text-[12px] tracking-wide text-white/45 transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-cyber-cyan/70 after:transition-all hover:text-white/85 hover:after:w-full";
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        const result = (await response.json()) as {
          success: boolean;
          data?: {
            authenticated: boolean;
            user: SessionUser | null;
          };
        };
        if (cancelled) return;
        if (result.success && result.data?.authenticated && result.data.user) {
          setSession({ status: "authenticated", user: result.data.user });
        } else {
          setSession({ status: "guest" });
        }
      } catch {
        if (!cancelled) setSession({ status: "guest" });
      }
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Highlight the section currently in view on the landing page.
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }

    const ids = navLinks
      .map((link) => link.sectionId)
      .filter((id): id is string => Boolean(id));

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          );
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );

    for (const el of elements) observer.observe(el);

    // Hash on load / change
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && ids.includes(hash)) setActiveSection(hash);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", applyHash);
    };
  }, [pathname]);

  const isLinkActive = (link: NavLink) => {
    if (link.href.startsWith("/") && !link.href.includes("#")) {
      return pathname === link.href || pathname.startsWith(`${link.href}/`);
    }
    if (pathname !== "/") return false;
    if (link.sectionId && activeSection) {
      return activeSection === link.sectionId;
    }
    return false;
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSession({ status: "guest" });
      setMenuOpen(false);
      router.push("/");
      router.refresh();
      setLogoutLoading(false);
    }
  };

  const renderAuthLinks = (mobile = false) => {
    if (session.status === "loading") {
      return (
        <span
          className={`font-mono text-[10px] tracking-[.12em] text-white/25 ${mobile ? "block py-2" : ""}`}
        >
          …
        </span>
      );
    }

    if (session.status === "authenticated") {
      return (
        <>
          <Link
            href="/dashboard"
            className={
              mobile
                ? "block rounded-lg border border-cyber-blue/20 bg-cyber-blue/[0.06] px-4 py-3 text-sm text-cyan-100/90"
                : "text-[12px] tracking-wide text-white/45 transition-colors hover:text-white/85"
            }
            onClick={() => setMenuOpen(false)}
            aria-current={
              pathname.startsWith("/dashboard") ? "page" : undefined
            }
          >
            Dashboard
          </Link>
          {session.user.role === "admin" ? (
            <Link
              href="/admin"
              className={
                mobile
                  ? "block py-2 text-sm text-cyber-cyan/70"
                  : "text-[12px] tracking-wide text-cyber-cyan/55 transition-colors hover:text-cyber-cyan/85"
              }
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </Link>
          ) : null}
          {session.user.role === "admin" || session.user.role === "support" ? (
            <Link
              href="/support-desk"
              className={
                mobile
                  ? "block py-2 text-sm text-emerald-100/70"
                  : "text-[12px] tracking-wide text-emerald-100/55 transition-colors hover:text-emerald-100/85"
              }
              onClick={() => setMenuOpen(false)}
            >
              Support
            </Link>
          ) : null}
          {session.user.role === "admin" || session.user.role === "worker" ? (
            <Link
              href="/dashboard/auftraege"
              className={
                mobile
                  ? "block py-2 text-sm text-amber-100/70"
                  : "text-[12px] tracking-wide text-amber-100/55 transition-colors hover:text-amber-100/85"
              }
              onClick={() => setMenuOpen(false)}
            >
              Aufträge
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={logoutLoading}
            className={
              mobile
                ? "block w-full py-2 text-center text-sm text-white/40 disabled:opacity-50"
                : "rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] text-white/55 transition hover:border-white/20 hover:text-white/80 disabled:opacity-50"
            }
          >
            Abmelden
          </button>
        </>
      );
    }

    return (
      <>
        <Link
          href="/login"
          className={
            mobile
              ? "block py-2 text-center text-sm text-white/40"
              : "text-[12px] tracking-wide text-white/45 transition-colors hover:text-white/85"
          }
          onClick={() => setMenuOpen(false)}
        >
          Login
        </Link>
        <Link
          href="/register"
          className={
            mobile
              ? "mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-5 py-3 text-sm font-semibold text-space-black"
              : "rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.06] px-4 py-2 text-[12px] font-medium text-cyan-100/90 transition-all hover:border-cyber-blue/45 hover:bg-cyber-blue/[0.1]"
          }
          onClick={() => setMenuOpen(false)}
        >
          {mobile ? "Konto erstellen" : "Registrieren"}
        </Link>
      </>
    );
  };

  const renderNavLink = (link: NavLink, mobile = false) => {
    const active = isLinkActive(link);
    const className = linkClass(active, mobile);
    const onClick = () => setMenuOpen(false);
    const props = {
      className,
      onClick,
      "aria-current": active ? ("page" as const) : undefined,
    };

    if (link.href.includes("#")) {
      return (
        <a key={link.href} href={link.href} {...props}>
          {link.label}
        </a>
      );
    }

    return (
      <Link key={link.href} href={link.href} {...props}>
        {link.label}
      </Link>
    );
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500 ${
        scrolled
          ? "border-white/[0.07] bg-[#04070c]/80 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
          : "border-transparent bg-transparent"
      }`}
      aria-label="Hauptnavigation"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between h-[4.5rem]">
        <Link href="/#hero" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 rounded-full border border-white/10 bg-white/[0.025] flex items-center justify-center group-hover:border-cyber-blue/40 transition-colors">
            <span className="absolute inset-1 rounded-full border border-cyber-blue/10" />
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="#29B6F6"
                strokeWidth="1"
              />
              <circle cx="12" cy="12" r="2.5" fill="#70E7FF" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold tracking-[0.22em] text-white/90">
            SYN<span className="text-cyber-blue">SIGHT</span>
          </span>
          <span className="ml-2 hidden border-l border-white/10 pl-3 font-mono text-[8px] tracking-[.16em] text-white/25 lg:block">
            DIGITAL IDENTITY INTELLIGENCE
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 lg:gap-7">
          {navLinks.map((link) => renderNavLink(link))}
          {renderAuthLinks()}
        </div>

        <button
          className="md:hidden rounded-lg border border-white/10 bg-white/[0.025] p-2 text-cyber-blue"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-6 h-6"
          >
            {menuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="md:hidden border-t border-white/[0.07] bg-[#050911]/95 px-6 py-4 space-y-3 backdrop-blur-2xl"
        >
          {navLinks.map((link) => renderNavLink(link, true))}
          <div className="space-y-3 border-t border-white/[0.06] pt-4">
            {renderAuthLinks(true)}
          </div>
        </div>
      )}
    </nav>
  );
}
