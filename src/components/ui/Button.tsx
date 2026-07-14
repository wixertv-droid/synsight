import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium tracking-wide transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyber-blue/50 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-gradient-to-r from-cyber-blue to-cyber-cyan text-space-black hover:shadow-[0_0_30px_rgba(0,191,255,0.4)] hover:scale-[1.02] active:scale-[0.98]",
    secondary:
      "glass text-cyber-blue border border-cyber-blue/30 hover:border-cyber-blue/60 hover:shadow-[0_0_20px_rgba(0,191,255,0.2)] glow-border-hover",
    ghost:
      "text-cyber-blue/80 hover:text-cyber-cyan hover:bg-cyber-blue/5",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
