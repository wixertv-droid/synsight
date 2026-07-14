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
    "relative isolate overflow-hidden inline-flex items-center justify-center font-medium tracking-wide transition-[background-color,border-color,box-shadow,transform] duration-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyber-blue/40 focus:ring-offset-2 focus:ring-offset-space-black disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "border border-cyber-cyan/40 bg-[linear-gradient(110deg,#72e7ff,#29b6f6)] text-[#021019] shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_12px_35px_rgba(21,147,204,.18)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.65),0_16px_45px_rgba(21,147,204,.28)] active:translate-y-px",
    secondary:
      "bg-white/[0.025] text-cyber-cyan border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] hover:bg-white/[0.05] hover:border-cyber-blue/35 hover:shadow-[0_12px_35px_rgba(0,0,0,.2)]",
    ghost:
      "text-cyber-blue/80 hover:text-cyber-cyan hover:bg-white/[0.035]",
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
