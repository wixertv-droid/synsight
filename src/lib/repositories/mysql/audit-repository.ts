import type { SynSightDatabase } from "@/lib/database/client";
import { auditEvents } from "@/lib/database/schema";
import {
  createInMemoryAuditRepository,
  type AuditRepository,
} from "../audit-repository";

export function createMysqlAuditRepository(
  db: SynSightDatabase
): AuditRepository {
  return {
    async create(event) {
      await db.insert(auditEvents).values({
        userId: event.userId ?? null,
        eventType: event.eventType,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        ipAddress: event.ipAddress ?? null,
        metadataJson: event.metadata ?? null,
      });
    },
  };
}

export function createAuditRepository(
  db: SynSightDatabase | null
): AuditRepository {
  return db ? createMysqlAuditRepository(db) : createInMemoryAuditRepository();
}
