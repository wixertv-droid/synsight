"use client";

import type { ReactNode } from "react";
import SystemRail, {
  type SystemRailSection,
} from "@/components/layout/SystemRail";

export default function DashboardPageRail({
  sections,
  children,
}: {
  sections: SystemRailSection[];
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-5 xl:gap-6">
      <div className="min-w-0 flex-1">{children}</div>
      <SystemRail
        sectionsReady
        sections={sections}
        alwaysShowLabels
        placement="sticky"
        activeOffsetPx={128}
        className="pt-1"
      />
    </div>
  );
}
