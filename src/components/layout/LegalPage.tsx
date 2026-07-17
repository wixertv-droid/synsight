/**
 * Legacy thin legal shell — prefer LegalDocument for new pages.
 * Retained so older imports keep compiling during the Sprint 7 migration.
 */
import type { ReactNode } from "react";
import LegalDocument from "./LegalDocument";

interface LegalPageProps {
  title: string;
  label: string;
  children: ReactNode;
}

export default function LegalPage({ title, label, children }: LegalPageProps) {
  return (
    <LegalDocument title={title} label={label} updatedAt="17. Juli 2026">
      <div className="glass hardware-panel rounded-[1.25rem] border border-white/[0.07] p-6 md:p-8 space-y-7 text-sm leading-relaxed text-white/45">
        {children}
      </div>
    </LegalDocument>
  );
}
