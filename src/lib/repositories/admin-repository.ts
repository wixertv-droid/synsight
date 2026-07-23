import type { UserRole } from "@/lib/auth/types";
import type { UserStatus } from "@/types/domain";

export interface AdminUserSummary {
  id: number;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  publicAlias: string | null;
  aliases: string[];
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
}

export interface AdminSystemStats {
  usersTotal: number;
  administratorsTotal: number;
  registrationsToday: number;
}

export interface AdminUserOverviewStats {
  usersTotal: number;
  registrationsToday: number;
  registrationsThisWeek: number;
  registrationsThisMonth: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  activeUsers: number;
  blockedUsers: number;
  lastLoginAt: string | null;
  administratorsTotal: number;
  supportStaffTotal: number;
  moderatorsTotal: number;
  averageSynCredits: number;
}

export interface AdminUserListRow extends AdminUserSummary {
  synCredits: number;
  riskScore: number | null;
  verified: boolean;
}

export interface AdminListUsersParams {
  query?: string;
  status?: string;
  role?: string;
  sort?: "id" | "created" | "login" | "credits";
  direction?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AdminListUsersResult {
  users: AdminUserListRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminSessionRow {
  id: string;
  userId: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
}

export interface AdminAuditRow {
  id: number;
  userId: number | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminRepository {
  searchUsers(query: string, limit?: number): Promise<AdminUserSummary[]>;
  findUserById(userId: number): Promise<AdminUserSummary | null>;
  getSystemStats(): Promise<AdminSystemStats>;
  getUserOverviewStats(): Promise<AdminUserOverviewStats>;
  listUsers(params: AdminListUsersParams): Promise<AdminListUsersResult>;
  listUserSessions(userId: number, limit?: number): Promise<AdminSessionRow[]>;
  listAuditEvents(params: {
    userId?: number;
    limit?: number;
  }): Promise<AdminAuditRow[]>;
}

type MemoryUser = {
  id: number;
  email: string;
  username: string;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
};

const memory = globalThis as typeof globalThis & {
  __synsightUsers?: Map<number, MemoryUser>;
};

function toSummary(user: MemoryUser): AdminUserSummary {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    publicAlias: null,
    aliases: [],
    status: user.status,
    role: user.role,
    createdAt: new Date().toISOString(),
    emailVerifiedAt: user.status === "active" ? new Date().toISOString() : null,
    lastLoginAt: null,
  };
}

export function createInMemoryAdminRepository(): AdminRepository {
  return {
    async searchUsers(query, limit = 25) {
      const normalized = query.trim().toLowerCase();
      return [...(memory.__synsightUsers?.values() ?? [])]
        .filter((user) => {
          if (!normalized) return true;
          const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`;
          return [String(user.id), user.email, user.username, name].some(
            (value) => value.toLowerCase().includes(normalized)
          );
        })
        .slice(0, limit)
        .map(toSummary);
    },

    async findUserById(userId) {
      const user = memory.__synsightUsers?.get(userId);
      return user ? toSummary(user) : null;
    },

    async getSystemStats() {
      const users = [...(memory.__synsightUsers?.values() ?? [])];
      return {
        usersTotal: users.length,
        administratorsTotal: users.filter((user) => user.role === "admin")
          .length,
        registrationsToday: users.length,
      };
    },

    async getUserOverviewStats() {
      const users = [...(memory.__synsightUsers?.values() ?? [])];
      return {
        usersTotal: users.length,
        registrationsToday: users.length,
        registrationsThisWeek: users.length,
        registrationsThisMonth: users.length,
        verifiedUsers: users.filter((u) => u.status === "active").length,
        unverifiedUsers: users.filter((u) => u.status !== "active").length,
        activeUsers: users.filter((u) => u.status === "active").length,
        blockedUsers: users.filter((u) => u.status === "suspended").length,
        lastLoginAt: null,
        administratorsTotal: users.filter((u) => u.role === "admin").length,
        supportStaffTotal: 0,
        moderatorsTotal: 0,
        averageSynCredits: 0,
      };
    },

    async listUsers(params) {
      const all = await this.searchUsers(
        params.query ?? "",
        params.limit ?? 50
      );
      return {
        users: all.map((user) => ({
          ...user,
          synCredits: 0,
          riskScore: null,
          verified: user.status === "active",
        })),
        total: all.length,
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      };
    },

    async listUserSessions() {
      return [];
    },

    async listAuditEvents() {
      return [];
    },
  };
}
