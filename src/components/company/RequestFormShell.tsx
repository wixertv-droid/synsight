"use client";

import {
  type ChangeEvent,
  FormEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  useState,
} from "react";

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

export interface FormFieldConfig {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "select";
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  autoComplete?: string;
}

interface RequestFormShellProps {
  endpoint: string;
  submitLabel: string;
  successTitle?: string;
  fields: FormFieldConfig[];
  initialValues: Record<string, string>;
}

function FieldLabel({
  label,
  optional,
  htmlFor,
}: {
  label: string;
  optional?: boolean;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[.14em] text-white/35"
    >
      <span>{label.toUpperCase()}</span>
      {optional ? (
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[7px] text-white/25">
          OPTIONAL
        </span>
      ) : null}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/85 outline-none transition placeholder:text-white/20 focus:border-cyber-cyan/35 focus:bg-white/[0.045]";

export default function RequestFormShell({
  endpoint,
  submitLabel,
  successTitle = "Anfrage übermittelt",
  fields,
  initialValues,
}: RequestFormShellProps) {
  const [values, setValues] = useState(initialValues);
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: honeypot }),
      });
      const result = (await response.json()) as ApiResult<{ message: string }>;
      if (!response.ok || !result.success) {
        setError(
          result.success
            ? "Die Anfrage konnte nicht gesendet werden."
            : result.error.message
        );
        return;
      }
      setSuccess(result.data.message);
      setValues(initialValues);
      setHoneypot("");
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="glass hardware-panel rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.03] p-6 md:p-8">
        <p className="font-mono text-[9px] tracking-[.16em] text-emerald-200/60">
          STATUS / ERFOLG
        </p>
        <h3 className="mt-3 text-xl font-medium text-white/90">
          {successTitle}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/45">{success}</p>
        <button
          type="button"
          className="mt-6 inline-flex rounded-lg border border-white/10 px-4 py-2 font-mono text-[9px] tracking-[.14em] text-white/45 transition hover:border-cyber-cyan/30 hover:text-cyber-cyan"
          onClick={() => setSuccess(null)}
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="glass hardware-panel relative space-y-5 rounded-2xl border border-white/[0.08] p-6 md:p-8"
      noValidate
    >
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => {
          const id = `field-${field.name}`;
          const sharedProps = {
            id,
            name: field.name,
            required: field.required,
            value: values[field.name] ?? "",
            placeholder: field.placeholder,
            className: inputClassName,
            onChange: (
              event: ChangeEvent<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
              >
            ) => updateField(field.name, event.target.value),
          };

          return (
            <div
              key={field.name}
              className={
                field.type === "textarea" || field.name === "message"
                  ? "md:col-span-2"
                  : undefined
              }
            >
              <FieldLabel
                htmlFor={id}
                label={field.label}
                optional={field.optional}
              />
              {field.type === "textarea" ? (
                <textarea
                  {...(sharedProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
                  rows={field.rows ?? 5}
                />
              ) : field.type === "select" ? (
                <select {...sharedProps}>
                  <option value="">Bitte wählen…</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...(sharedProps as InputHTMLAttributes<HTMLInputElement>)}
                  type={field.type ?? "text"}
                  autoComplete={field.autoComplete}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Honeypot — hidden from users, filled by bots */}
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <label htmlFor="website-hp">Website</label>
        <input
          id="website-hp"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-300/20 bg-rose-300/[0.05] px-4 py-3 text-sm text-rose-100/70">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-xl border border-cyber-cyan/30 bg-cyber-cyan/[0.12] px-6 py-3 font-mono text-[10px] tracking-[.16em] text-cyber-cyan transition hover:border-cyber-cyan/50 hover:bg-cyber-cyan/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Wird gesendet…" : submitLabel}
      </button>
    </form>
  );
}
