import { desc, eq } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import {
  communicationSettings,
  contactRequests,
  partnerRequests,
  pressRequests,
} from "@/lib/database/schema";
import {
  createInMemoryCommunicationsRepository,
  type CommunicationsRepository,
  type ContactRequestRecord,
  type PartnerRequestRecord,
  type PressRequestRecord,
  type CommunicationSettingsRecord,
} from "../communications-repository";
import type { RequestStatus } from "@/lib/validation/communications";

function mapSettings(
  row: typeof communicationSettings.$inferSelect
): CommunicationSettingsRecord {
  return {
    contactEmail: row.contactEmail,
    pressEmail: row.pressEmail,
    partnersEmail: row.partnersEmail,
    updatedByAdminId: row.updatedByAdminId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapContact(
  row: typeof contactRequests.$inferSelect
): ContactRequestRecord {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status as RequestStatus,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPartner(
  row: typeof partnerRequests.$inferSelect
): PartnerRequestRecord {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    partnershipType: row.partnershipType,
    message: row.message,
    status: row.status as RequestStatus,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPress(row: typeof pressRequests.$inferSelect): PressRequestRecord {
  return {
    id: row.id,
    name: row.name,
    medium: row.medium,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    message: row.message,
    status: row.status as RequestStatus,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function ensureSettings(
  db: SynSightDatabase
): Promise<CommunicationSettingsRecord> {
  const rows = await db
    .select()
    .from(communicationSettings)
    .where(eq(communicationSettings.id, 1))
    .limit(1);
  if (rows[0]) return mapSettings(rows[0]);

  await db.insert(communicationSettings).values({
    id: 1,
    contactEmail: "contact@synsight.de",
    pressEmail: "press@synsight.de",
    partnersEmail: "partners@synsight.de",
  });

  const created = await db
    .select()
    .from(communicationSettings)
    .where(eq(communicationSettings.id, 1))
    .limit(1);
  if (!created[0]) throw new Error("COMMUNICATION_SETTINGS_INIT_FAILED");
  return mapSettings(created[0]);
}

export function createMysqlCommunicationsRepository(
  db: SynSightDatabase
): CommunicationsRepository {
  return {
    async getSettings() {
      return ensureSettings(db);
    },
    async updateSettings(input) {
      await ensureSettings(db);
      await db
        .update(communicationSettings)
        .set({
          contactEmail: input.contactEmail,
          pressEmail: input.pressEmail,
          partnersEmail: input.partnersEmail,
          updatedByAdminId: input.adminId,
        })
        .where(eq(communicationSettings.id, 1));
      return this.getSettings();
    },
    async createContactRequest(input) {
      const result = await db.insert(contactRequests).values({
        name: input.name,
        company: input.company ?? null,
        email: input.email,
        phone: input.phone ?? null,
        subject: input.subject,
        message: input.message,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      const id = Number(result[0].insertId);
      const rows = await db
        .select()
        .from(contactRequests)
        .where(eq(contactRequests.id, id))
        .limit(1);
      if (!rows[0]) throw new Error("CONTACT_REQUEST_CREATE_FAILED");
      return mapContact(rows[0]);
    },
    async createPartnerRequest(input) {
      const result = await db.insert(partnerRequests).values({
        name: input.name,
        company: input.company,
        email: input.email,
        partnershipType: input.partnershipType,
        message: input.message,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      const id = Number(result[0].insertId);
      const rows = await db
        .select()
        .from(partnerRequests)
        .where(eq(partnerRequests.id, id))
        .limit(1);
      if (!rows[0]) throw new Error("PARTNER_REQUEST_CREATE_FAILED");
      return mapPartner(rows[0]);
    },
    async createPressRequest(input) {
      const result = await db.insert(pressRequests).values({
        name: input.name,
        medium: input.medium,
        email: input.email,
        phone: input.phone ?? null,
        topic: input.topic,
        message: input.message,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      const id = Number(result[0].insertId);
      const rows = await db
        .select()
        .from(pressRequests)
        .where(eq(pressRequests.id, id))
        .limit(1);
      if (!rows[0]) throw new Error("PRESS_REQUEST_CREATE_FAILED");
      return mapPress(rows[0]);
    },
    async listContactRequests() {
      const rows = await db
        .select()
        .from(contactRequests)
        .orderBy(desc(contactRequests.createdAt));
      return rows.map(mapContact);
    },
    async listPartnerRequests() {
      const rows = await db
        .select()
        .from(partnerRequests)
        .orderBy(desc(partnerRequests.createdAt));
      return rows.map(mapPartner);
    },
    async listPressRequests() {
      const rows = await db
        .select()
        .from(pressRequests)
        .orderBy(desc(pressRequests.createdAt));
      return rows.map(mapPress);
    },
    async updateRequestStatus(input) {
      if (input.channel === "contact") {
        await db
          .update(contactRequests)
          .set({
            status: input.status,
            ...(input.adminNotes !== undefined
              ? { adminNotes: input.adminNotes }
              : {}),
          })
          .where(eq(contactRequests.id, input.id));
        const rows = await db
          .select()
          .from(contactRequests)
          .where(eq(contactRequests.id, input.id))
          .limit(1);
        return rows[0] ? mapContact(rows[0]) : null;
      }
      if (input.channel === "partner") {
        await db
          .update(partnerRequests)
          .set({
            status: input.status,
            ...(input.adminNotes !== undefined
              ? { adminNotes: input.adminNotes }
              : {}),
          })
          .where(eq(partnerRequests.id, input.id));
        const rows = await db
          .select()
          .from(partnerRequests)
          .where(eq(partnerRequests.id, input.id))
          .limit(1);
        return rows[0] ? mapPartner(rows[0]) : null;
      }
      await db
        .update(pressRequests)
        .set({
          status: input.status,
          ...(input.adminNotes !== undefined
            ? { adminNotes: input.adminNotes }
            : {}),
        })
        .where(eq(pressRequests.id, input.id));
      const rows = await db
        .select()
        .from(pressRequests)
        .where(eq(pressRequests.id, input.id))
        .limit(1);
      return rows[0] ? mapPress(rows[0]) : null;
    },
    async deleteRequest(input) {
      if (input.channel === "contact") {
        const result = await db
          .delete(contactRequests)
          .where(eq(contactRequests.id, input.id));
        return Number(result[0].affectedRows ?? 0) > 0;
      }
      if (input.channel === "partner") {
        const result = await db
          .delete(partnerRequests)
          .where(eq(partnerRequests.id, input.id));
        return Number(result[0].affectedRows ?? 0) > 0;
      }
      const result = await db
        .delete(pressRequests)
        .where(eq(pressRequests.id, input.id));
      return Number(result[0].affectedRows ?? 0) > 0;
    },
  };
}

export function createCommunicationsRepository(
  db: SynSightDatabase | null
): CommunicationsRepository {
  return db
    ? createMysqlCommunicationsRepository(db)
    : createInMemoryCommunicationsRepository();
}
