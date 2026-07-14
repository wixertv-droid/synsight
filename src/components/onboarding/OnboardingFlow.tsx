"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import StatusDot from "@/components/ui/StatusDot";

const steps = [
  {
    number: 1,
    label: "Identität verbinden",
    description: "Grundlage für die sichere Zuordnung Ihrer Signale.",
  },
  {
    number: 2,
    label: "Suchinformationen hinzufügen",
    description: "Sie bestimmen, wonach SynSight später suchen darf.",
  },
  {
    number: 3,
    label: "Analyseprofil erstellen",
    description: "Schutzumfang und Benachrichtigungen konfigurieren.",
  },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [finishing, setFinishing] = useState(false);

  const next = () => {
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }
    setFinishing(true);
    window.setTimeout(() => router.push("/dashboard"), 1200);
  };

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="glass hardware-panel rounded-2xl p-5 lg:p-6">
        <div className="mb-7 flex items-center gap-2 font-mono text-[8px] tracking-[.16em] text-cyber-cyan/50">
          <StatusDot pulse tone="online" />
          KI-ASSISTENT AKTIV
        </div>
        <div className="flex gap-3 overflow-x-auto lg:block lg:space-y-2">
          {steps.map((item) => {
            const active = item.number === step;
            const complete = item.number < step;
            return (
              <button
                key={item.number}
                type="button"
                onClick={() => item.number < step && setStep(item.number)}
                className={`min-w-[210px] rounded-xl border p-4 text-left transition-all lg:min-w-0 lg:w-full ${
                  active
                    ? "border-cyber-blue/25 bg-cyber-blue/[0.06]"
                    : "border-transparent bg-white/[0.012]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[9px] ${complete || active ? "text-cyber-cyan/70" : "text-white/18"}`}>
                    0{item.number}
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${complete ? "bg-emerald-300/70" : active ? "bg-cyber-cyan" : "bg-white/10"}`} />
                </div>
                <p className={`mt-3 text-xs font-medium ${active ? "text-white/85" : "text-white/38"}`}>
                  {item.label}
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-white/22">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="glass-strong hardware-panel min-h-[560px] rounded-[1.5rem] p-6 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-6">
          <div>
            <p className="font-mono text-[9px] tracking-[.18em] text-cyber-cyan/50">
              STEP {step} / 3
            </p>
            <p className="mt-2 text-xs text-white/30">
              Persönliche Sicherheitsanalyse konfigurieren
            </p>
          </div>
          <span className="font-mono text-2xl font-light tabular-nums text-white/70">
            {Math.round((step / 3) * 100)}
            <small className="ml-1 text-[8px] text-white/20">%</small>
          </span>
        </div>

        <div className="mt-2 h-[2px] bg-white/[0.05]">
          <div
            className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan shadow-[0_0_12px_rgba(41,182,246,.3)] transition-all duration-700"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <p className="hud-label">SynSight Einrichtung</p>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
            {step === 1 && "Willkommen bei SynSight."}
            {step === 2 && "Welche Signale dürfen wir verbinden?"}
            {step === 3 && "Ihr Schutzprofil ist fast bereit."}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300/50">
            {step === 1 &&
              "Wir richten Ihre persönliche digitale Sicherheitsanalyse ein. Sie behalten jederzeit die Kontrolle über Ihre Angaben."}
            {step === 2 &&
              "Fügen Sie nur Informationen hinzu, die für Ihre spätere Analyse berücksichtigt werden sollen."}
            {step === 3 &&
              "Legen Sie fest, wie SynSight neue Risiken priorisiert und Sie darüber informiert."}
          </p>

          <div className="mt-9">
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Vollständiger Name" name="identityName" placeholder="Alex Morgan" />
                <FormField label="Primäre E-Mail" name="identityEmail" type="email" placeholder="alex@beispiel.de" />
                <FormField label="Land oder Region" name="region" placeholder="Deutschland" />
                <FormField label="Öffentlicher Alias" hint="OPTIONAL" name="alias" placeholder="@alexmorgan" />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {[
                  ["E-Mail-Adressen", "Bekannte Adressen in öffentlichen Signalen zuordnen"],
                  ["Benutzernamen", "Wiederkehrende Aliase und Profile verbinden"],
                  ["Web-Erwähnungen", "Öffentliche Nennungen beobachten"],
                  ["Bekannte Domains", "Unternehmens- oder Projektseiten einbeziehen"],
                ].map(([title, description], index) => (
                  <label key={title} className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 transition-colors hover:border-cyber-blue/20">
                    <input type="checkbox" defaultChecked={index < 3} className="h-4 w-4 accent-cyan-400" />
                    <span className="flex-1">
                      <span className="block text-xs text-white/72">{title}</span>
                      <span className="mt-1 block text-[10px] text-white/25">{description}</span>
                    </span>
                    <span className="font-mono text-[7px] tracking-[.12em] text-cyber-cyan/35">
                      QUELLE {String(index + 1).padStart(2, "0")}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Kontinuierliches Monitoring", "Neue Risikosignale regelmäßig prüfen"],
                  ["Kritische Warnungen", "Bei hoher Priorität sofort informieren"],
                  ["Monatlicher Bericht", "Entwicklung Ihrer Sichtbarkeit zusammenfassen"],
                  ["KI-Empfehlungen", "Nächste Schritte automatisch priorisieren"],
                ].map(([title, description], index) => (
                  <label key={title} className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/72">{title}</span>
                      <input type="checkbox" defaultChecked={index !== 2} className="h-4 w-4 accent-cyan-400" />
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-white/25">{description}</p>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-white/[0.06] pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || finishing}
          >
            Zurück
          </Button>
          <Button onClick={next} disabled={finishing}>
            {finishing
              ? "Analyseprofil wird erstellt..."
              : step === 3
                ? "Sicherheitszentrale öffnen"
                : "Weiter"}
          </Button>
        </div>
      </section>
    </div>
  );
}
