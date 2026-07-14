import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({
  children,
  className = "",
  hover = true,
}: GlassCardProps) {
  return (
    <div
      className={`glass hardware-panel rounded-2xl p-6 glow-border transition-[transform,border-color,box-shadow] duration-700 ${
        hover
          ? "glow-border-hover hover:[transform:perspective(900px)_translate3d(0,-3px,18px)]"
          : ""
      } ${className}`}
    >
      <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t border-cyber-cyan/35" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 border-b border-r border-cyber-cyan/20" />
      {children}
    </div>
  );
}
