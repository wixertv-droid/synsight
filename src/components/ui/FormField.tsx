import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export default function FormField({
  label,
  hint,
  id,
  className = "",
  ...props
}: FormFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-2 flex items-center justify-between text-[11px] font-medium tracking-wide text-white/55">
        {label}
        {hint && (
          <span className="font-mono text-[8px] tracking-[.12em] text-white/20">
            {hint}
          </span>
        )}
      </span>
      <input
        id={fieldId}
        className={`w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/18 focus:border-cyber-blue/40 focus:bg-cyber-blue/[0.025] focus:shadow-[0_0_0_3px_rgba(41,182,246,.06)] ${className}`}
        {...props}
      />
    </label>
  );
}
