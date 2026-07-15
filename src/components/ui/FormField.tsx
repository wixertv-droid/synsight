import type { InputHTMLAttributes } from "react";
import InfoTooltip from "./InfoTooltip";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  info?: string;
  error?: string;
}

export default function FormField({
  label,
  hint,
  info,
  error,
  id,
  className = "",
  ...props
}: FormFieldProps) {
  const fieldId = id ?? props.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;

  return (
    <div className="block">
      <div className="mb-2 flex items-center justify-between text-[11px] font-medium tracking-wide text-white/55">
        <span className="flex items-center gap-2">
          <label htmlFor={fieldId}>{label}</label>
          {info && <InfoTooltip label={label}>{info}</InfoTooltip>}
        </span>
        {hint && (
          <span className="font-mono text-[8px] tracking-[.12em] text-white/28">
            {hint}
          </span>
        )}
      </div>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`w-full rounded-xl border bg-black/25 px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/18 focus:bg-cyber-blue/[0.025] focus:shadow-[0_0_0_3px_rgba(41,182,246,.06)] ${
          error
            ? "border-rose-400/40 focus:border-rose-300/60"
            : "border-white/[0.08] focus:border-cyber-blue/40"
        } ${className}`}
        {...props}
      />
      {error && (
        <span
          id={errorId}
          className="mt-2 block text-[10px] text-rose-200/75"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
