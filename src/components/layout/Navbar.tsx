"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { label: "Spuren", href: "#traces" },
  { label: "Technologie", href: "#technology" },
  { label: "Demo", href: "#demo-scanner" },
  { label: "Vertrauen", href: "#trust" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-strong shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between h-16">
        <a href="#hero" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full border border-cyber-blue/30 flex items-center justify-center group-hover:border-cyber-blue/60 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <circle cx="12" cy="12" r="8" fill="none" stroke="#00BFFF" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="3" fill="#00FFFF" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-[0.2em]">
            SYN<span className="text-cyber-blue">SIGHT</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gray-400 hover:text-cyber-cyan transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#demo-scanner"
            className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-cyber-blue to-cyber-cyan text-space-black font-medium hover:shadow-[0_0_20px_rgba(0,191,255,0.3)] transition-shadow"
          >
            Analyse starten
          </a>
        </div>

        <button
          className="md:hidden text-cyber-blue p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menü öffnen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            {menuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden glass-strong border-t border-cyber-blue/10 px-6 py-4 space-y-3">
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
        </div>
      )}
    </nav>
  );
}
