"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { label: "Plattform", href: "#platform" },
  { label: "Risiko-Check", href: "#demo-scanner" },
  { label: "SynCredits", href: "#syncredits" },
  { label: "Sicherheit", href: "#trust" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500 ${
        scrolled
          ? "border-white/[0.07] bg-[#04070c]/80 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between h-[4.5rem]">
        <a href="#hero" className="flex items-center gap-2 group">
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
        </a>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative py-2 text-[12px] tracking-wide text-white/45 transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-cyber-cyan/70 after:transition-all hover:text-white/85 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="text-[12px] tracking-wide text-white/45 transition-colors hover:text-white/85"
          >
            Login
          </a>
          <a
            href="/register"
            className="rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.06] px-4 py-2 text-[12px] font-medium text-cyan-100/90 transition-all hover:border-cyber-blue/45 hover:bg-cyber-blue/[0.1]"
          >
            Konto erstellen
          </a>
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
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm text-gray-400 hover:text-cyber-cyan py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/register"
            className="mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan px-5 py-3 text-sm font-semibold text-space-black"
            onClick={() => setMenuOpen(false)}
          >
            Konto erstellen
          </a>
          <a
            href="/login"
            className="block py-2 text-center text-sm text-white/40"
            onClick={() => setMenuOpen(false)}
          >
            Bereits registriert? Login
          </a>
        </div>
      )}
    </nav>
  );
}
