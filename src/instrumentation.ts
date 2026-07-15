/**
 * Next.js instrumentation hook.
 *
 * This intentionally activates no external service. It is the stable seam
 * for a future OpenTelemetry SDK and Sentry server adapter.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/observability");
  }
}
