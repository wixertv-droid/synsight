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
      className={`glass rounded-xl p-6 glow-border transition-all duration-500 ${
        hover ? "glow-border-hover hover:-translate-y-1" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
