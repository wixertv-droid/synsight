"use client";

const PROVIDERS = [
  "gemini",
  "openai",
  "google_custom_search",
  "serpapi",
  "haveibeenpwned",
  "virustotal",
  "hunter_io",
  "opencorporates",
] as const;

export default function AdminApiCredentialsView() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">
        API-Schlüssel werden AES-256-GCM verschlüsselt in{" "}
        <code className="text-cyber-cyan/70">api_credentials</code> gespeichert.
        Verwaltung über PUT /api/admin/api-credentials (Migration 013).
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <li
            key={provider}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
          >
            <p className="font-mono text-[9px] tracking-[.12em] text-cyber-cyan/55">
              {provider.toUpperCase()}
            </p>
            <p className="mt-2 text-sm text-white/55">
              Noch nicht konfiguriert
            </p>
            <p className="mt-2 font-mono text-[8px] text-white/25">
              Status: Inaktiv · Test: — · Letzter Erfolg: —
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
