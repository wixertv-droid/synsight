export type AuditEventType =
  | "auth.login.succeeded"
  | "auth.login.failed"
  | "auth.logout"
  | "auth.registration"
  | "auth.email.verified"
  | "auth.password.changed"
  | "profile.updated"
  | "security.settings.updated"
  | "admin.action";

export interface CreateAuditEvent {
  userId?: number | null;
  eventType: AuditEventType;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AuditRepository {
  create(event: CreateAuditEvent): Promise<void>;
}

const memory = globalThis as typeof globalThis & {
  __synsightAuditEvents?: CreateAuditEvent[];
};

export function createInMemoryAuditRepository(): AuditRepository {
  const events =
    memory.__synsightAuditEvents ?? (memory.__synsightAuditEvents = []);
  return {
    async create(event) {
      // Intentionally keep only structured, non-sensitive event metadata.
      events.push({ ...event });
      if (events.length > 1_000) events.shift();
    },
  };
}
