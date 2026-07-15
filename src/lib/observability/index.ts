export interface ErrorContext {
  operation: string;
  requestId?: string;
  userId?: string;
  tags?: Record<string, string>;
}

export interface ObservabilityAdapter {
  captureError(error: unknown, context: ErrorContext): void;
  recordMetric(
    name: string,
    value: number,
    attributes?: Record<string, string>
  ): void;
}

class NoopObservabilityAdapter implements ObservabilityAdapter {
  captureError(): void {
    // External error tracking intentionally disabled until configured.
  }
  recordMetric(): void {
    // OpenTelemetry-compatible seam; no data leaves the application.
  }
}

let adapter: ObservabilityAdapter = new NoopObservabilityAdapter();

export function configureObservability(next: ObservabilityAdapter): void {
  adapter = next;
}

export function getObservability(): ObservabilityAdapter {
  return adapter;
}
