import type { RequestStatus } from "@/lib/validation/communications";

export type CommunicationChannel = "contact" | "partner" | "press";

export interface CommunicationSettingsRecord {
  contactEmail: string;
  pressEmail: string;
  partnersEmail: string;
  updatedByAdminId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRequestRecord {
  id: number;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: RequestStatus;
  ipAddress: string | null;
  userAgent: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerRequestRecord {
  id: number;
  name: string;
  company: string;
  email: string;
  partnershipType: string;
  message: string;
  status: RequestStatus;
  ipAddress: string | null;
  userAgent: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PressRequestRecord {
  id: number;
  name: string;
  medium: string;
  email: string;
  phone: string | null;
  topic: string;
  message: string;
  status: RequestStatus;
  ipAddress: string | null;
  userAgent: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequestInput {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreatePartnerRequestInput {
  name: string;
  company: string;
  email: string;
  partnershipType: string;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreatePressRequestInput {
  name: string;
  medium: string;
  email: string;
  phone?: string | null;
  topic: string;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CommunicationsRepository {
  getSettings(): Promise<CommunicationSettingsRecord>;
  updateSettings(input: {
    contactEmail: string;
    pressEmail: string;
    partnersEmail: string;
    adminId: number;
  }): Promise<CommunicationSettingsRecord>;
  createContactRequest(
    input: CreateContactRequestInput
  ): Promise<ContactRequestRecord>;
  createPartnerRequest(
    input: CreatePartnerRequestInput
  ): Promise<PartnerRequestRecord>;
  createPressRequest(
    input: CreatePressRequestInput
  ): Promise<PressRequestRecord>;
  listContactRequests(): Promise<ContactRequestRecord[]>;
  listPartnerRequests(): Promise<PartnerRequestRecord[]>;
  listPressRequests(): Promise<PressRequestRecord[]>;
  updateRequestStatus(input: {
    channel: CommunicationChannel;
    id: number;
    status: RequestStatus;
    adminNotes?: string | null;
  }): Promise<
    ContactRequestRecord | PartnerRequestRecord | PressRequestRecord | null
  >;
  deleteRequest(input: {
    channel: CommunicationChannel;
    id: number;
  }): Promise<boolean>;
}

function nowStamp(): string {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function defaultSettings(): CommunicationSettingsRecord {
  const stamp = nowStamp();
  return {
    contactEmail: "contact@synsight.de",
    pressEmail: "press@synsight.de",
    partnersEmail: "partners@synsight.de",
    updatedByAdminId: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function settingsStore(): CommunicationSettingsRecord {
  const g = globalThis as typeof globalThis & {
    __synsightCommunicationSettings?: CommunicationSettingsRecord;
  };
  if (!g.__synsightCommunicationSettings) {
    g.__synsightCommunicationSettings = defaultSettings();
  }
  return g.__synsightCommunicationSettings;
}

function contactStore(): ContactRequestRecord[] {
  const g = globalThis as typeof globalThis & {
    __synsightContactRequests?: ContactRequestRecord[];
  };
  if (!g.__synsightContactRequests) g.__synsightContactRequests = [];
  return g.__synsightContactRequests;
}

function partnerStore(): PartnerRequestRecord[] {
  const g = globalThis as typeof globalThis & {
    __synsightPartnerRequests?: PartnerRequestRecord[];
  };
  if (!g.__synsightPartnerRequests) g.__synsightPartnerRequests = [];
  return g.__synsightPartnerRequests;
}

function pressStore(): PressRequestRecord[] {
  const g = globalThis as typeof globalThis & {
    __synsightPressRequests?: PressRequestRecord[];
  };
  if (!g.__synsightPressRequests) g.__synsightPressRequests = [];
  return g.__synsightPressRequests;
}

function nextId(
  key:
    | "__synsightContactRequestId"
    | "__synsightPartnerRequestId"
    | "__synsightPressRequestId"
) {
  const g = globalThis as typeof globalThis &
    Record<string, number | undefined>;
  g[key] = (g[key] ?? 0) + 1;
  return g[key] as number;
}

export function createInMemoryCommunicationsRepository(): CommunicationsRepository {
  return {
    async getSettings() {
      return { ...settingsStore() };
    },
    async updateSettings(input) {
      const current = settingsStore();
      const stamp = nowStamp();
      Object.assign(current, {
        contactEmail: input.contactEmail,
        pressEmail: input.pressEmail,
        partnersEmail: input.partnersEmail,
        updatedByAdminId: input.adminId,
        updatedAt: stamp,
      });
      return { ...current };
    },
    async createContactRequest(input) {
      const stamp = nowStamp();
      const record: ContactRequestRecord = {
        id: nextId("__synsightContactRequestId"),
        name: input.name,
        company: input.company ?? null,
        email: input.email,
        phone: input.phone ?? null,
        subject: input.subject,
        message: input.message,
        status: "new",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        adminNotes: null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      contactStore().unshift(record);
      return { ...record };
    },
    async createPartnerRequest(input) {
      const stamp = nowStamp();
      const record: PartnerRequestRecord = {
        id: nextId("__synsightPartnerRequestId"),
        name: input.name,
        company: input.company,
        email: input.email,
        partnershipType: input.partnershipType,
        message: input.message,
        status: "new",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        adminNotes: null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      partnerStore().unshift(record);
      return { ...record };
    },
    async createPressRequest(input) {
      const stamp = nowStamp();
      const record: PressRequestRecord = {
        id: nextId("__synsightPressRequestId"),
        name: input.name,
        medium: input.medium,
        email: input.email,
        phone: input.phone ?? null,
        topic: input.topic,
        message: input.message,
        status: "new",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        adminNotes: null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      pressStore().unshift(record);
      return { ...record };
    },
    async listContactRequests() {
      return contactStore().map((entry) => ({ ...entry }));
    },
    async listPartnerRequests() {
      return partnerStore().map((entry) => ({ ...entry }));
    },
    async listPressRequests() {
      return pressStore().map((entry) => ({ ...entry }));
    },
    async updateRequestStatus(input) {
      const stamp = nowStamp();
      if (input.channel === "contact") {
        const row = contactStore().find((entry) => entry.id === input.id);
        if (!row) return null;
        row.status = input.status;
        if (input.adminNotes !== undefined) row.adminNotes = input.adminNotes;
        row.updatedAt = stamp;
        return { ...row };
      }
      if (input.channel === "partner") {
        const row = partnerStore().find((entry) => entry.id === input.id);
        if (!row) return null;
        row.status = input.status;
        if (input.adminNotes !== undefined) row.adminNotes = input.adminNotes;
        row.updatedAt = stamp;
        return { ...row };
      }
      const row = pressStore().find((entry) => entry.id === input.id);
      if (!row) return null;
      row.status = input.status;
      if (input.adminNotes !== undefined) row.adminNotes = input.adminNotes;
      row.updatedAt = stamp;
      return { ...row };
    },
    async deleteRequest(input) {
      if (input.channel === "contact") {
        const store = contactStore();
        const index = store.findIndex((entry) => entry.id === input.id);
        if (index < 0) return false;
        store.splice(index, 1);
        return true;
      }
      if (input.channel === "partner") {
        const store = partnerStore();
        const index = store.findIndex((entry) => entry.id === input.id);
        if (index < 0) return false;
        store.splice(index, 1);
        return true;
      }
      const store = pressStore();
      const index = store.findIndex((entry) => entry.id === input.id);
      if (index < 0) return false;
      store.splice(index, 1);
      return true;
    },
  };
}
