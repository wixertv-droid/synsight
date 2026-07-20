export type SupportTicketStatus =
  "new" | "open" | "waiting" | "resolved" | "closed";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicketRecord {
  id: number;
  ticketNumber: string;
  userId: number | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignedTo: number | null;
  source: "public" | "dashboard";
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportTicketInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: number | null;
  source?: "public" | "dashboard";
  priority?: SupportTicketPriority;
}

export interface SupportTicketRepository {
  create(input: CreateSupportTicketInput): Promise<SupportTicketRecord>;
  listForUser(userId: number, limit?: number): Promise<SupportTicketRecord[]>;
  listAll(params?: {
    status?: SupportTicketStatus;
    limit?: number;
  }): Promise<SupportTicketRecord[]>;
  findById(id: number): Promise<SupportTicketRecord | null>;
  update(
    id: number,
    patch: Partial<
      Pick<
        SupportTicketRecord,
        "status" | "priority" | "assignedTo" | "adminNotes"
      >
    >
  ): Promise<SupportTicketRecord | null>;
  countOpen(): Promise<number>;
}

let ticketCounter = 1000;

function nextTicketNumber(): string {
  ticketCounter += 1;
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SYN-${stamp}-${ticketCounter}`;
}

const inMemoryTickets: SupportTicketRecord[] = [];

export function createInMemorySupportTicketRepository(): SupportTicketRepository {
  return {
    async create(input) {
      const now = new Date().toISOString();
      const ticket: SupportTicketRecord = {
        id: inMemoryTickets.length + 1,
        ticketNumber: nextTicketNumber(),
        userId: input.userId ?? null,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        status: "new",
        priority: input.priority ?? "normal",
        assignedTo: null,
        source: input.source ?? "public",
        adminNotes: null,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryTickets.unshift(ticket);
      return ticket;
    },
    async listForUser(userId, limit = 50) {
      return inMemoryTickets
        .filter((ticket) => ticket.userId === userId)
        .slice(0, limit);
    },
    async listAll(params) {
      let rows = [...inMemoryTickets];
      if (params?.status) {
        rows = rows.filter((ticket) => ticket.status === params.status);
      }
      return rows.slice(0, params?.limit ?? 100);
    },
    async findById(id) {
      return inMemoryTickets.find((ticket) => ticket.id === id) ?? null;
    },
    async update(id, patch) {
      const index = inMemoryTickets.findIndex((ticket) => ticket.id === id);
      if (index < 0) return null;
      inMemoryTickets[index] = {
        ...inMemoryTickets[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return inMemoryTickets[index];
    },
    async countOpen() {
      return inMemoryTickets.filter((ticket) =>
        ["new", "open", "waiting"].includes(ticket.status)
      ).length;
    },
  };
}
