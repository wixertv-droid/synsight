"use client";

import { FormEvent, useEffect, useState } from "react";
import InfoHeading from "@/components/ui/InfoHeading";
import { guidance } from "@/lib/content/guidance";

interface AnalysisRow {
  id: number;
  analysisKey: string;
  label: string;
  description: string | null;
  credits: number;
  sortOrder: number;
  isActive: boolean;
  isSystemDefault: boolean;
}

interface PackageRow {
  id: number;
  code: string;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceCents: number;
  priceLabel: string;
  currency: string;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  isPopular: boolean;
}

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

export default function AdminPricingControl() {
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [newAnalysis, setNewAnalysis] = useState({
    analysisKey: "",
    label: "",
    description: "",
    credits: "1",
    sortOrder: "999",
  });

  async function loadCatalog() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/pricing");
      const result = (await response.json()) as ApiResult<{
        analyses: AnalysisRow[];
        packages: PackageRow[];
      }>;
      if (!response.ok || !result.success) {
        setMessage(
          result.success
            ? "Preiskatalog konnte nicht geladen werden."
            : result.error.message
        );
        return;
      }
      setAnalyses(result.data.analyses);
      setPackages(result.data.packages);
    } catch {
      setMessage("Verbindung zur Preisverwaltung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  async function put(
    endpoint: "/api/admin/pricing" | "/api/admin/packages",
    payload: Record<string, unknown>
  ) {
    setMessage(null);
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as ApiResult<unknown>;
    if (!response.ok || !result.success) {
      throw new Error(
        result.success ? "Preisänderung fehlgeschlagen." : result.error.message
      );
    }
  }

  async function saveAnalysis(row: AnalysisRow) {
    try {
      await put("/api/admin/pricing", {
        action: "upsert",
        analysisKey: row.analysisKey,
        label: row.label,
        description: row.description,
        credits: Number(row.credits),
        sortOrder: Number(row.sortOrder),
        isActive: row.isActive,
      });
      setMessage(`Analysepreis „${row.label}“ gespeichert.`);
      await loadCatalog();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    }
  }

  async function createAnalysis(event: FormEvent) {
    event.preventDefault();
    try {
      await put("/api/admin/pricing", {
        action: "upsert",
        analysisKey: newAnalysis.analysisKey,
        label: newAnalysis.label,
        description: newAnalysis.description || null,
        credits: Number(newAnalysis.credits),
        sortOrder: Number(newAnalysis.sortOrder),
        isActive: true,
      });
      setNewAnalysis({
        analysisKey: "",
        label: "",
        description: "",
        credits: "1",
        sortOrder: "999",
      });
      setMessage("Neue Analyseart gespeichert.");
      await loadCatalog();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    }
  }

  async function savePackage(row: PackageRow) {
    try {
      await put("/api/admin/packages", {
        action: "update",
        code: row.code,
        name: row.name,
        credits: Number(row.credits),
        bonusCredits: Number(row.bonusCredits),
        priceCents: Number(row.priceCents),
        currency: row.currency,
        badge: row.badge,
        sortOrder: Number(row.sortOrder),
        isActive: row.isActive,
        isPopular: row.isPopular,
      });
      setMessage(`Paket „${row.name}“ gespeichert.`);
      await loadCatalog();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    }
  }

  async function resetAll() {
    if (!window.confirm("Alle Standardpreise wirklich wiederherstellen?"))
      return;
    try {
      await put("/api/admin/pricing", {
        action: "reset",
        scope: "all",
        confirm: true,
      });
      setMessage("Standardpreise wiederhergestellt.");
      await loadCatalog();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Reset fehlgeschlagen."
      );
    }
  }

  const updateAnalysis = (index: number, patch: Partial<AnalysisRow>) => {
    setAnalyses((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  };

  const updatePackage = (index: number, patch: Partial<PackageRow>) => {
    setPackages((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  };

  return (
    <section
      id="pricing-management"
      className="mt-6 rounded-[1.4rem] border border-cyber-blue/15 bg-cyber-blue/[0.025] p-5 md:p-6"
      aria-labelledby="pricing-management-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
            BILLING CONTROL / LIVE DATABASE
          </p>
          <InfoHeading
            as="h2"
            id="pricing-management-heading"
            label="Preisverwaltung"
            info={guidance.admin.pricing}
            className="mt-2 text-xl font-medium text-white/90"
          />
          <p className="mt-2 text-xs text-white/35">
            Änderungen werden sofort gespeichert und von Landingpage, Dashboard
            und Analyseabrechnung verwendet.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] px-4 py-2.5 text-xs text-amber-100/70 transition hover:border-amber-300/40"
        >
          Standardpreise wiederherstellen
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-white/30">Preiskatalog wird geladen…</p>
      ) : (
        <>
          <div className="mt-8">
            <h3 className="font-mono text-[9px] tracking-[.14em] text-white/40">
              CREDIT-PAKETE
            </h3>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {packages.map((pack, index) => (
                <div
                  key={pack.code}
                  className="rounded-xl border border-white/[0.07] bg-space-black/45 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="text-[10px] text-white/30">
                      Name
                      <input
                        value={pack.name}
                        onChange={(event) =>
                          updatePackage(index, { name: event.target.value })
                        }
                        className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                      />
                    </label>
                    <label className="text-[10px] text-white/30">
                      Basis
                      <input
                        type="number"
                        value={pack.credits}
                        onChange={(event) =>
                          updatePackage(index, {
                            credits: Number(event.target.value),
                          })
                        }
                        className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                      />
                    </label>
                    <label className="text-[10px] text-white/30">
                      Bonus
                      <input
                        type="number"
                        value={pack.bonusCredits}
                        onChange={(event) =>
                          updatePackage(index, {
                            bonusCredits: Number(event.target.value),
                          })
                        }
                        className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                      />
                    </label>
                    <label className="text-[10px] text-white/30">
                      Preis (Cent)
                      <input
                        type="number"
                        value={pack.priceCents}
                        onChange={(event) =>
                          updatePackage(index, {
                            priceCents: Number(event.target.value),
                          })
                        }
                        className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/45">
                    <label>
                      <input
                        type="checkbox"
                        checked={pack.isActive}
                        onChange={(event) =>
                          updatePackage(index, {
                            isActive: event.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Aktiv
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={pack.isPopular}
                        onChange={(event) =>
                          updatePackage(index, {
                            isPopular: event.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Beliebtestes Paket
                    </label>
                    <span className="font-mono text-cyber-cyan/55">
                      {pack.priceLabel} / {pack.totalCredits} SynCredits
                    </span>
                    <button
                      type="button"
                      onClick={() => savePackage(pack)}
                      className="ml-auto rounded border border-cyber-blue/25 px-3 py-1.5 text-cyber-cyan/70"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-mono text-[9px] tracking-[.14em] text-white/40">
              ANALYSEPREISE
            </h3>
            <div className="mt-3 space-y-2">
              {analyses.map((analysis, index) => (
                <div
                  key={analysis.analysisKey}
                  className="grid gap-2 rounded-lg border border-white/[0.06] bg-space-black/40 p-3 md:grid-cols-[1fr_2fr_100px_90px_80px]"
                >
                  <input
                    value={analysis.label}
                    onChange={(event) =>
                      updateAnalysis(index, { label: event.target.value })
                    }
                    className="rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                    aria-label={`Name ${analysis.analysisKey}`}
                  />
                  <input
                    value={analysis.description ?? ""}
                    onChange={(event) =>
                      updateAnalysis(index, {
                        description: event.target.value || null,
                      })
                    }
                    className="rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                    aria-label={`Beschreibung ${analysis.analysisKey}`}
                  />
                  <input
                    type="number"
                    value={analysis.credits}
                    onChange={(event) =>
                      updateAnalysis(index, {
                        credits: Number(event.target.value),
                      })
                    }
                    className="rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
                    aria-label={`SynCredits ${analysis.analysisKey}`}
                  />
                  <label className="flex items-center justify-center text-xs text-white/40">
                    <input
                      type="checkbox"
                      checked={analysis.isActive}
                      onChange={(event) =>
                        updateAnalysis(index, {
                          isActive: event.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Aktiv
                  </label>
                  <button
                    type="button"
                    onClick={() => saveAnalysis(analysis)}
                    className="rounded border border-cyber-blue/25 text-xs text-cyber-cyan/70"
                  >
                    Speichern
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={createAnalysis}
            className="mt-6 rounded-xl border border-dashed border-cyber-cyan/20 bg-cyber-cyan/[0.02] p-4"
          >
            <p className="text-sm text-white/65">Neue Analyseart hinzufügen</p>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <input
                required
                pattern="[a-z0-9_]+"
                placeholder="analysis_key"
                value={newAnalysis.analysisKey}
                onChange={(event) =>
                  setNewAnalysis((current) => ({
                    ...current,
                    analysisKey: event.target.value,
                  }))
                }
                className="rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
              />
              <input
                required
                placeholder="Bezeichnung"
                value={newAnalysis.label}
                onChange={(event) =>
                  setNewAnalysis((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                className="rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
              />
              <input
                type="number"
                min={1}
                required
                placeholder="SynCredits"
                value={newAnalysis.credits}
                onChange={(event) =>
                  setNewAnalysis((current) => ({
                    ...current,
                    credits: event.target.value,
                  }))
                }
                className="rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
              />
              <button className="rounded bg-cyber-blue/15 text-xs text-cyber-cyan">
                Analyseart speichern
              </button>
            </div>
          </form>
        </>
      )}

      {message ? (
        <p className="mt-5 rounded-lg border border-white/[0.07] px-4 py-3 text-xs text-white/60">
          {message}
        </p>
      ) : null}
    </section>
  );
}
