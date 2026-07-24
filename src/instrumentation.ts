/**
 * Next.js instrumentation hook.
 *
 * Stable seam for observability adapters, plus a best-effort catalog self-heal
 * so Digital Leak / DeHashed appear even when `db:migrate` was skipped.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/observability");
    void import("@/lib/credits/ensure-digital-leak-catalog")
      .then((mod) => mod.ensureDigitalLeakCatalog(true))
      .catch(() => {
        /* pricing heal retries on read */
      });
    void import("@/lib/analysis/digital-exposure/ensure-schema")
      .then((mod) => mod.ensureDigitalExposureSchema(true))
      .catch(() => {
        /* DDL heal retries on scan/read */
      });
  }
}
